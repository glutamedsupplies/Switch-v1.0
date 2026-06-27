const accountsCountPill = document.getElementById("accounts-count-pill");
const accountsTotal = document.getElementById("accounts-total");
const accountsVerified = document.getElementById("accounts-verified");
const accountsLatest = document.getElementById("accounts-latest");
const userAccountList = document.getElementById("user-account-list");
const employeeSearchInput = document.getElementById("employee-search-input");

const employeeScheduleElapsedHours = 9;
const employeeDataColumns = [
  { key: "documentFile", label: "Document File" },
  { key: "employeeId", label: "Employee ID" },
  { key: "position", label: "Position" },
  { key: "timeIn", label: "Time In" },
  { key: "timeOut", label: "Time Out" },
  { key: "firstName", label: "First Name" },
  { key: "middleName", label: "Middle Name" },
  { key: "lastName", label: "Last Name" },
  { key: "suffix", label: "Suffix" },
  { key: "email", label: "Email" },
  { key: "mobileNumber", label: "Phone Number" },
  { key: "createdAt", label: "Created" },
  { key: "faceVerification", label: "Face Verification" },
  { key: "actions", label: "Actions" },
];
const employeeAccessPermissionItems = Object.freeze([
  { key: "admin-dashboard", label: "Admin Dashboard", meta: "Admin Panel" },
  { key: "insight", label: "Insight", meta: "Admin Panel" },
  { key: "product-insight", label: "Product Insight", meta: "Admin Panel" },
  { key: "products", label: "Products", meta: "Admin Panel" },
  { key: "admin-inventory", label: "Inventory", meta: "Admin Panel" },
  { key: "user-data", label: "User Data", meta: "Admin Panel" },
  { key: "employee-data", label: "Employee Data", meta: "Admin Panel" },
  { key: "register", label: "Register", meta: "Admin Panel" },
  { key: "live-chat", label: "Live Chat", meta: "Employee Panel" },
  { key: "packing-dashboard", label: "Packing Dashboard", meta: "Packing Panel" },
]);
const employeeAccessPermissionIconMarkup = Object.freeze({
  "admin-dashboard": `
    <svg viewBox="0 -960 960 960" fill="none" aria-hidden="true">
      <path d="M179-120q-24 0-42-18t-18-42v-339q-28-24-37-59t2-70l43-135q8-27 28-42t46-15h553q28 0 49 15.5t29 41.5l44 135q11 35 1.5 70T840-519v339q0 24-18 42t-42 18H179Zm391-430q29 0 49-19t16-46l-25-165H510v165q0 26 17 45.5t43 19.5Zm-187 0q28 0 47.5-19t19.5-46v-165H350l-25 165q-4 26 14 45.5t44 19.5Zm-182 0q24 0 41.5-16.5T263-607l26-173H189l-46 146q-10 31 8 57.5t50 26.5Zm557 0q32 0 50.5-26t8.5-58l-46-146H671l26 173q3 24 20.5 40.5T758-550ZM179-180h601v-311q1 1-6.5 1H758q-25 0-47.5-10.5T666-533q-16 20-40 31.5T573-490q-30 0-51.5-8.5T480-527q-15 18-38 27.5t-52 9.5q-31 0-55-11t-41-32q-24 21-47 32t-46 11h-13.5q-6.5 0-8.5-1v311Zm601 0H179h601Z" fill="currentColor"></path>
    </svg>`,
  insight: `
    <svg class="dashboard-nav__order-cart-outline" viewBox="0 -960 960 960" fill="none" aria-hidden="true">
      <path d="M236-102.21q-21-21.21-21-51T236.21-204q21.21-21 51-21T338-203.79q21 21.21 21 51T337.79-102q-21.21 21-51 21T236-102.21Zm400 0q-21-21.21-21-51T636.21-204q21.21-21 51-21T738-203.79q21 21.21 21 51T737.79-102q-21.21 21-51 21T636-102.21ZM235-741l110 228h288l125-228H235Zm-30-60h589.07q22.97 0 34.95 21 11.98 21-.02 42L694-495q-11 19-28.56 30.5T627-453H324l-56 104h461q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H277q-42 0-60.5-28t.5-63l64-118-152-322H81q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32Q68.25-880 81-880h68q9 0 16.2 4.43 7.2 4.44 10.8 12.57l29 62Zm140 288h288-288Z" fill="currentColor"></path>
    </svg>`,
  "product-insight": `
    <svg viewBox="0 -960 960 960" fill="none" aria-hidden="true">
      <path d="m363-390 117-71 117 71-31-133 104-90-137-11-53-126-53 126-137 11 104 90-31 133ZM80-80v-740q0-24 18-42t42-18h680q24 0 42 18t18 42v520q0 24-18 42t-42 18H240L80-80Zm134-220h606v-520H140v600l74-80Zm-74 0v-520 520Z" fill="currentColor"></path>
    </svg>`,
  products: `
    <svg viewBox="0 -960 960 960" fill="none" aria-hidden="true">
      <path d="M450-154v-309L180-619v309l270 156Zm60 0 270-156v-310L510-463v309Zm-60 69L150-258q-14-8-22-22t-8-30v-340q0-16 8-30t22-22l300-173q14-8 30-8t30 8l300 173q14 8 22 22t8 30v340q0 16-8 30t-22 22L510-85q-14 8-30 8t-30-8Zm194-525 102-59-266-154-102 59 266 154Zm-164 96 104-61-267-154-104 60 267 155Z" fill="currentColor"></path>
    </svg>`,
  "admin-inventory": `
    <svg viewBox="0 -960 960 960" fill="none" aria-hidden="true">
      <path d="M465.5-419.5Q459-421 452-425L90-619q-8-5-11.5-11.5T75-645q0-8 3.5-14.5T90-671l362-194q7-4 13.5-5.5T480-872q8 0 14.5 1.5T508-865l362 194q8 5 12 11.5t4 14.5q0 8-4 14.5T870-619L508-425q-7 4-13.5 5.5T480-418q-8 0-14.5-1.5ZM480-479l315-166-315-166-314 166 314 166Zm1-166Zm-1 332 339-181q2-1 14-3 12 0 21 8.5t9 21.5q0 8-4 14.5T847-441L508-260q-7 4-13.5 5.5T480-253q-8 0-14.5-1.5T452-260L114-441q-8-5-12-11.5T98-467q0-13 9-21.5t21-8.5q4 0 7.5 1t6.5 3l338 180Zm0 165 339-181q2-1 14-3 12 0 21 8.5t9 21.5q0 8-4 14.5T847-276L508-95q-7 4-13.5 5.5T480-88q-8 0-14.5-1.5T452-95L114-276q-8-5-12-11.5T98-302q0-13 9-21.5t21-8.5q4 0 7.5 1t6.5 3l338 180Z" fill="currentColor"></path>
    </svg>`,
  "user-data": `
    <svg viewBox="0 -960 960 960" fill="none" aria-hidden="true">
      <path d="M38-254q0-35 18-63.5t50-42.5q73-32 131.5-46T358-420q62 0 120 14t131 46q32 14 50.5 42.5T678-254v34q0 25-17.5 42.5T618-160H98q-25 0-42.5-17.5T38-220v-34Zm824 94H724q5-15 9.5-29.5T738-220v-34q0-63-29-101.5T622-420q69 8 130 22t99 34q33 19 52 47t19 63v34q0 25-17.5 42.5T862-160ZM250-523q-42-42-42-108t42-108q42-42 108-42t108 42q42 42 42 108t-42 108q-42 42-108 42t-108-42Zm426 0q-42 42-108 42-11 0-24.5-1.5T519-488q24-25 36.5-61.5T568-631q0-45-12.5-79.5T519-774q11-3 24.5-5t24.5-2q66 0 108 42t42 108q0 66-42 108ZM98-220h520v-34q0-16-9.5-31T585-306q-72-32-121-43t-106-11q-57 0-106.5 11T130-306q-14 6-23 21t-9 31v34Zm324.5-346.5Q448-592 448-631t-25.5-64.5Q397-721 358-721t-64.5 25.5Q268-670 268-631t25.5 64.5Q319-541 358-541t64.5-25.5ZM358-220Zm0-411Z" fill="currentColor"></path>
    </svg>`,
  "employee-data": `
    <svg viewBox="0 -960 960 960" fill="none" aria-hidden="true">
      <path d="M730-450q12.75 0 21.38-8.68 8.62-8.67 8.62-21.5 0-12.82-8.62-21.32-8.63-8.5-21.38-8.5H610q-12.75 0-21.37 8.68-8.63 8.67-8.63 21.5 0 12.82 8.63 21.32 8.62 8.5 21.37 8.5h120Zm0-120q12.75 0 21.38-8.68 8.62-8.67 8.62-21.5 0-12.82-8.62-21.32-8.63-8.5-21.38-8.5H610q-12.75 0-21.37 8.68-8.63 8.67-8.63 21.5 0 12.82 8.63 21.32 8.62 8.5 21.37 8.5h120ZM360-434q-38 0-66.64 6.5Q264.73-421 243-407q-20 11-31 28.13-11 17.14-11 36.87 0 9.43 6.68 15.71Q214.35-320 224-320h272q9.65 0 16.32-6.52Q519-333.03 519-343q0-17.69-10.5-34.35Q498-394 478-407q-22-14-51-20.5t-67-6.5Zm51.5-81.42q21.5-21.42 21.5-51.5t-21.42-51.58q-21.42-21.5-51.5-21.5t-51.58 21.42q-21.5 21.42-21.5 51.5t21.42 51.58q21.42 21.5 51.5 21.5t51.58-21.42ZM140-160q-24 0-42-18t-18-42v-520q0-24 18-42t42-18h680q24 0 42 18t18 42v520q0 24-18 42t-42 18H140Zm0-60h680v-520H140v520Zm0 0v-520 520Z" fill="currentColor"></path>
    </svg>`,
  register: `
    <svg viewBox="0 -960 960 960" fill="none" aria-hidden="true">
      <path d="M730-530H630q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h100v-100q0-12.75 8.68-21.38 8.67-8.62 21.5-8.62 12.82 0 21.32 8.62 8.5 8.63 8.5 21.38v100h100q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H790v100q0 12.75-8.68 21.37-8.67 8.63-21.5 8.63-12.82 0-21.32-8.63-8.5-8.62-8.5-21.37v-100Zm-478 7q-42-42-42-108t42-108q42-42 108-42t108 42q42 42 42 108t-42 108q-42 42-108 42t-108-42ZM40-220v-34q0-35 17.5-63.5T108-360q75-33 133.34-46.5t118.5-13.5Q420-420 478-406.5T611-360q33 15 51 43t18 63v34q0 24.75-17.62 42.37Q644.75-160 620-160H100q-24.75 0-42.37-17.63Q40-195.25 40-220Zm60 0h520v-34q0-16-9-30.5T587-306q-71-33-120-43.5T360-360q-58 0-107.5 10.5T132-306q-15 7-23.5 21.5T100-254v34Zm324.5-346.5Q450-592 450-631t-25.5-64.5Q399-721 360-721t-64.5 25.5Q270-670 270-631t25.5 64.5Q321-541 360-541t64.5-25.5ZM360-631Zm0 411Z" fill="currentColor"></path>
    </svg>`,
  "live-chat": `
    <svg viewBox="0 -960 960 960" fill="none" aria-hidden="true">
      <path d="M240-240 131-131q-14 14-32.5 6.34Q80-132.31 80-152v-668q0-24 18-42t42-18h680q24 0 42 18t18 42v520q0 24-18 42t-42 18H240Zm-26-60h606v-520H140v600l74-80Zm-74 0v-520 520Zm194.5-234.5Q346-546 346-563t-11.5-28.5Q323-603 306-603t-28.5 11.5Q266-580 266-563t11.5 28.5Q289-523 306-523t28.5-11.5Zm177 0Q523-546 523-563t-11.5-28.5Q500-603 483-603t-28.5 11.5Q443-580 443-563t11.5 28.5Q466-523 483-523t28.5-11.5Zm170 0Q693-546 693-563t-11.5-28.5Q670-603 653-603t-28.5 11.5Q613-580 613-563t11.5 28.5Q636-523 653-523t28.5-11.5Z" fill="currentColor"></path>
    </svg>`,
  "packing-dashboard": `
    <svg viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
      <path d="M180-80q-24.75 0-42.37-17.63Q120-115.25 120-140v-483q-17-6-28.5-21.39T80-680v-140q0-24.75 17.63-42.38Q115.25-880 140-880h680q24.75 0 42.38 17.62Q880-844.75 880-820v140q0 20.22-11.5 35.61T840-623v483q0 24.75-17.62 42.37Q804.75-80 780-80H180Zm0-540v480h600v-480H180Zm-40-60h680v-140H140v140Zm250 260h180q12.75 0 21.38-8.68 8.62-8.67 8.62-21.5 0-12.82-8.62-21.32-8.63-8.5-21.38-8.5H390q-12.75 0-21.37 8.68-8.63 8.67-8.63 21.5 0 12.82 8.63 21.32 8.62 8.5 21.37 8.5Zm90 40Z"></path>
    </svg>`,
});
const employeeRequiredAccessPermissionKeys = Object.freeze(["employee-dashboard"]);
const employeePanelAccessPermissionKeys = new Set([
  "live-chat",
]);
const employeeAccessPermissionKeys = new Set([
  ...employeeAccessPermissionItems.map((item) => item.key),
  ...employeeRequiredAccessPermissionKeys,
]);
const employeeAccessUpdatedStorageKey = "gms-employee-access-updated-at";
const employeeAccountUpdatedStorageKey = "gms-employee-account-updated-at";
const employeeAccountUpdatedEventName = "gms-employee-account-updated";
const employeeLeaveRequestsStorageKey = "gms-employee-leave-requests";
const employeeLeaveRequestsChangedEventName = "gms-employee-leave-requests-changed";
const employeeDataLottiePlayerUrl = "/vendor/lottie.min.js";
const employeeDataSuccessAnimationPath = "/animations/employee-account-check.json";
const employeeDataDeleteSuccessAudioUrl = "/audio/delete-success.m4a";

let currentEmployeeAccounts = [];
let employeeEditAccount = null;
let employeeEditModalRefs = null;
let employeeDeleteAccount = null;
let employeeDeleteModalRefs = null;
let employeeDeleteSuccessModalRefs = null;
let employeeDeleteTriggerElement = null;
let employeeDeleteBusy = false;
let employeeDeleteSuccessCloseTimer = 0;
let employeeDeleteSuccessAnimation = null;
let employeeDataLottieLoadPromise = null;
let employeeDeleteSuccessAudio = null;
let selectedEmployeeAccessAccountId = "";
let employeeAccessFabRefs = null;
let employeeAccessDrawerRefs = null;
let employeeAccessDrawerCloseTimer = 0;
let employeeAccessGrantBusy = false;
let employeeEvaluationDrawerRefs = null;
let employeeEvaluationDrawerCloseTimer = 0;
const employeeDrawerScrollLockKeys = new Set([
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "End",
  "Home",
  "PageDown",
  "PageUp",
  " ",
  "Spacebar",
]);
let employeeDataSettingsControlsObserver = null;
let employeeProfilePictureViewerRefs = null;
let employeeEvaluationChatThreads = [];
let employeeEvaluationChatThreadsLoaded = false;
let employeeEvaluationChatThreadsLoading = false;
let employeeEvaluationRatingModalRefs = null;
let employeeEvaluationRatingModalCloseTimer = 0;
let employeeAttendanceRecordsModalRefs = null;
let employeeAttendanceRecordsCloseTimer = 0;
let employeeAccountRefreshTimer = 0;
let employeeAttendanceCalendarMonth = new Date();
let employeeAttendanceSelectedDateKey = "";
let employeeSearchQuery = "";
let employeeSearchTimer = 0;
let employeeLeaveNavBadgeObserver = null;

function readEmployeeDataSessionStorageJson(key) {
  try {
    const rawValue = window.sessionStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch (error) {
    return null;
  }
}

function normalizeEmployeeDataAdminScope(value, fallback = "") {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function getEmployeeDataSessionAdminScope(session, fallback = "") {
  if (!session || typeof session !== "object") {
    return fallback;
  }

  return normalizeEmployeeDataAdminScope(
    session.adminId ??
      session.ownerAdminId ??
      session.tenantId ??
      session.workspaceId ??
      session.storeAdminId ??
      session.id ??
      session.accountCode,
    fallback,
  );
}

function getEmployeeDataActiveAdminScope() {
  const employeeSession = readEmployeeDataSessionStorageJson("gms-employee-session");
  const employeeScope = getEmployeeDataSessionAdminScope(employeeSession, "");
  if (employeeScope) {
    return employeeScope;
  }

  const adminSession = readEmployeeDataSessionStorageJson("gms-admin-session");
  const adminScope = getEmployeeDataSessionAdminScope(adminSession, "");
  if (adminScope) {
    return adminScope;
  }

  try {
    return normalizeEmployeeDataAdminScope(window.localStorage.getItem("gms-admin-id"), "");
  } catch (error) {
    return "";
  }
}

function withEmployeeDataAdminHeaders(headers = {}) {
  const adminId = getEmployeeDataActiveAdminScope();
  if (!adminId) {
    return headers;
  }

  return {
    ...headers,
    "X-GMS-Admin-ID": adminId,
  };
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function parseScheduleTime(value) {
  const match = String(value ?? "").trim().match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isInteger(hours)
    || !Number.isInteger(minutes)
    || hours < 0
    || hours > 23
    || minutes < 0
    || minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function formatScheduleValue(totalMinutes) {
  const minutesInDay = 24 * 60;
  const normalizedMinutes = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;
  const hours = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function computeTimeOutValue(timeInValue) {
  const timeInMinutes = parseScheduleTime(timeInValue);
  if (timeInMinutes === null) {
    return "";
  }

  return formatScheduleValue(timeInMinutes + employeeScheduleElapsedHours * 60);
}

function formatScheduleTime(value) {
  const totalMinutes = parseScheduleTime(value);
  if (totalMinutes === null) {
    return "-";
  }

  const normalizedValue = formatScheduleValue(totalMinutes);
  const [hoursText, minutesText] = normalizedValue.split(":");
  const hours = Number(hoursText);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutesText} ${period}`;
}

function normalizeEmployeePhone(value) {
  let digits = String(value ?? "").replace(/\D/g, "");

  if (digits.startsWith("63") && digits.length > 10) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("0") && digits.length > 10) {
    digits = digits.slice(1);
  }

  return digits.slice(0, 10);
}

function formatText(value, fallback = "-") {
  const normalizedValue = String(value ?? "").trim();
  return normalizedValue || fallback;
}

function escapeEmployeeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatPhone(account) {
  const mobileNumber = String(account.mobileNumber ?? "").trim();
  if (!mobileNumber) {
    return "-";
  }

  const countryCode = String(account.countryCode ?? "").trim();
  return `${countryCode || "+63"} ${mobileNumber}`;
}

function getEmployeeAccountId(account) {
  return String(account?.id ?? account?.employeeId ?? account?.accountCode ?? "").trim();
}

function getEmployeeDisplayName(account) {
  return `${account?.firstName ?? ""} ${account?.lastName ?? ""}`.trim()
    || account?.employeeId
    || account?.accountCode
    || "Employee";
}

function normalizeEmployeeLeaveMatchValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getEmployeeLeaveMatchValues(account) {
  return [
    account?.id,
    account?.accountCode,
    account?.employeeId,
    account?.email,
  ]
    .map(normalizeEmployeeLeaveMatchValue)
    .filter(Boolean);
}

function readAllEmployeeLeaveRequests() {
  try {
    const rawRequests = window.localStorage?.getItem(employeeLeaveRequestsStorageKey);
    const requests = rawRequests ? JSON.parse(rawRequests) : [];
    return Array.isArray(requests) ? requests : [];
  } catch (error) {
    console.warn("Unable to read employee leave requests.", error);
    return [];
  }
}

function getEmployeeLeaveRequestAdminScope(request) {
  if (!request || typeof request !== "object") {
    return "";
  }

  return normalizeEmployeeDataAdminScope(
    request.adminId ??
      request.ownerAdminId ??
      request.tenantId ??
      request.workspaceId ??
      request.storeAdminId,
    "",
  );
}

function isEmployeeLeaveRequestInActiveAdminScope(request) {
  const activeAdminScope = getEmployeeDataActiveAdminScope();
  if (!activeAdminScope) {
    return true;
  }

  return getEmployeeLeaveRequestAdminScope(request) === activeAdminScope;
}

function readEmployeeLeaveRequests() {
  return readAllEmployeeLeaveRequests().filter(isEmployeeLeaveRequestInActiveAdminScope);
}

function writeEmployeeLeaveRequests(requests) {
  try {
    window.localStorage?.setItem(
      employeeLeaveRequestsStorageKey,
      JSON.stringify(Array.isArray(requests) ? requests : []),
    );
    window.dispatchEvent(new CustomEvent(employeeLeaveRequestsChangedEventName));
  } catch (error) {
    console.warn("Unable to save employee leave requests.", error);
  }
}

function getEmployeeLeaveRequestStatus(request) {
  if (!request || typeof request !== "object") {
    return "";
  }

  const status = String(request.status ?? "").trim().toLowerCase();
  if (status === "approved" || status === "declined") {
    return status;
  }
  return "pending";
}

function isEmployeeLeaveRequestForAccount(request, account) {
  const matchValues = getEmployeeLeaveMatchValues(account);
  if (!matchValues.length || !request || typeof request !== "object") {
    return false;
  }

  return [
    request.employeeAccountId,
    request.accountId,
    request.employeeId,
    request.accountCode,
    request.email,
  ]
    .map(normalizeEmployeeLeaveMatchValue)
    .some((value) => value && matchValues.includes(value));
}

function getEmployeeLeaveRequestsForAccount(account) {
  return readEmployeeLeaveRequests()
    .filter((request) => isEmployeeLeaveRequestForAccount(request, account))
    .sort((left, right) => String(right.updatedAt || right.createdAt || "")
      .localeCompare(String(left.updatedAt || left.createdAt || "")));
}

function getEmployeePendingLeaveRequests(account) {
  return getEmployeeLeaveRequestsForAccount(account)
    .filter((request) => getEmployeeLeaveRequestStatus(request) === "pending");
}

function hasEmployeePendingLeaveRequest(account) {
  return getEmployeePendingLeaveRequests(account).length > 0;
}

function hasAnyPendingEmployeeLeaveRequest() {
  return readEmployeeLeaveRequests().some((request) => getEmployeeLeaveRequestStatus(request) === "pending");
}

function getEmployeeLeaveRequestForDate(account, dateKey) {
  const normalizedDateKey = String(dateKey ?? "").trim();
  if (!normalizedDateKey) {
    return null;
  }

  return getEmployeeLeaveRequestsForAccount(account)
    .find((request) => String(request?.dateKey ?? "").trim() === normalizedDateKey) || null;
}

function decideEmployeeLeaveRequest(requestId, decision) {
  const normalizedDecision = decision === "approved" ? "approved" : "declined";
  const requests = readAllEmployeeLeaveRequests();
  const requestIndex = requests.findIndex((request) => String(request?.id ?? "") === String(requestId ?? ""));
  if (requestIndex < 0) {
    return;
  }

  const now = new Date().toISOString();
  requests[requestIndex] = {
    ...requests[requestIndex],
    status: normalizedDecision,
    decision: normalizedDecision,
    decidedAt: now,
    updatedAt: now,
  };
  writeEmployeeLeaveRequests(requests);
}

function createEmployeeLeaveBadge() {
  const badge = document.createElement("span");
  badge.className = "employee-leave-notification-badge";
  badge.setAttribute("aria-hidden", "true");
  return badge;
}

function syncEmployeeLeaveNavBadge() {
  const navItem = document.querySelector('.dashboard-nav__item[href="/Employee_data.html"], .dashboard-nav__item[href="/employee_data.html"]');
  const navIcon = navItem?.querySelector(".dashboard-nav__icon");
  if (!navItem || !navIcon) {
    return;
  }

  let badge = navItem.querySelector("[data-employee-data-leave-nav-badge]");
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "employee-leave-nav-badge";
    badge.dataset.employeeDataLeaveNavBadge = "true";
    badge.setAttribute("aria-hidden", "true");
  }
  if (badge.parentElement !== navIcon) {
    navIcon.appendChild(badge);
  }
  badge.hidden = !hasAnyPendingEmployeeLeaveRequest();
}

function setupEmployeeLeaveNavBadgeObserver() {
  if (employeeLeaveNavBadgeObserver) {
    return;
  }

  const nav = document.querySelector(".dashboard-nav");
  if (!nav) {
    window.setTimeout(setupEmployeeLeaveNavBadgeObserver, 100);
    return;
  }

  let syncTimer = 0;
  const syncSoon = () => {
    window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(syncEmployeeLeaveNavBadge, 0);
  };

  employeeLeaveNavBadgeObserver = new MutationObserver(syncSoon);
  employeeLeaveNavBadgeObserver.observe(nav, {
    childList: true,
    subtree: true,
  });
  syncEmployeeLeaveNavBadge();
}

function getSelectedEmployeeAccessAccount() {
  if (!selectedEmployeeAccessAccountId) {
    return null;
  }

  return currentEmployeeAccounts.find(
    (account) => getEmployeeAccountId(account) === selectedEmployeeAccessAccountId,
  ) || null;
}

function normalizeEmployeeAccessPermissionKey(value) {
  return String(value ?? "").trim().toLowerCase();
}

function isAdminEmployeeAccount(account) {
  return String(account?.position ?? "").trim().toLowerCase() === "admin employee";
}

function isPackingEmployeeAccount(account) {
  return String(account?.position ?? "").trim().toLowerCase() === "packing";
}

function ensureRequiredEmployeeAccessPermissionKeys(permissionKeys, account) {
  const normalizedKeys = Array.isArray(permissionKeys)
    ? permissionKeys.map(normalizeEmployeeAccessPermissionKey)
    : [];
  const nextKeys = normalizedKeys.filter((key, index, keys) =>
    employeeAccessPermissionKeys.has(key)
      && keys.indexOf(key) === index
      && (key !== "packing-dashboard" || isPackingEmployeeAccount(account)),
  );
  const hasEmployeePanelAccess = nextKeys.some((key) =>
    employeePanelAccessPermissionKeys.has(key),
  );

  if (isAdminEmployeeAccount(account) && !nextKeys.includes("live-chat")) {
    nextKeys.push("live-chat");
  }

  if (
    ((!isPackingEmployeeAccount(account) && account) || hasEmployeePanelAccess) &&
    !nextKeys.includes("employee-dashboard")
  ) {
    nextKeys.unshift("employee-dashboard");
  }

  return nextKeys;
}

function getEmployeeAccessPermissionKeys(account) {
  if (account?.accessPermissionsConfigured && Array.isArray(account?.accessPermissions)) {
    return ensureRequiredEmployeeAccessPermissionKeys(account.accessPermissions, account);
  }

  const normalizedPosition = String(account?.position ?? "").trim().toLowerCase();
  if (normalizedPosition === "admin employee") {
    return [
      "employee-dashboard",
      "live-chat",
    ];
  }

  return account ? ["employee-dashboard"] : [];
}

function hasEmployeeLiveChatAccess(account) {
  const normalizedPosition = String(account?.position ?? "").trim().toLowerCase();
  return normalizedPosition === "admin employee"
    || getEmployeeAccessPermissionKeys(account).includes("live-chat");
}

function getEmployeePositionForAccess(permissionKeys, account) {
  return String(account?.position ?? "").trim() || "Employee";
}

function syncEmployeeDataModalOpenClass() {
  const isEditOpen = Boolean(employeeEditModalRefs && !employeeEditModalRefs.overlay.hidden);
  const isDeleteOpen = Boolean(employeeDeleteModalRefs && !employeeDeleteModalRefs.overlay.hidden);
  const isDeleteSuccessOpen = Boolean(
    employeeDeleteSuccessModalRefs && !employeeDeleteSuccessModalRefs.overlay.hidden,
  );
  const isAccessDrawerOpen = Boolean(employeeAccessDrawerRefs && !employeeAccessDrawerRefs.overlay.hidden);
  const isEvaluationDrawerOpen = Boolean(employeeEvaluationDrawerRefs && !employeeEvaluationDrawerRefs.overlay.hidden);
  const isRatingModalOpen = Boolean(employeeEvaluationRatingModalRefs && !employeeEvaluationRatingModalRefs.overlay.hidden);
  const isAttendanceRecordsOpen = Boolean(
    employeeAttendanceRecordsModalRefs && !employeeAttendanceRecordsModalRefs.overlay.hidden,
  );
  const isProfilePictureViewerOpen = Boolean(
    employeeProfilePictureViewerRefs && !employeeProfilePictureViewerRefs.overlay.hidden,
  );
  document.body.classList.toggle(
    "modal-open",
    isEditOpen
      || isDeleteOpen
      || isDeleteSuccessOpen
      || isRatingModalOpen
      || isAttendanceRecordsOpen
      || isProfilePictureViewerOpen,
  );
  document.body.classList.toggle(
    "employee-attendance-records-open",
    isAttendanceRecordsOpen,
  );
  document.body.classList.toggle(
    "employee-side-drawer-open",
    isAccessDrawerOpen || isEvaluationDrawerOpen,
  );
}

function getDocumentInfo(account) {
  const documentData = account.eDocument && typeof account.eDocument === "object"
    ? account.eDocument
    : {};
  const label = formatText(
    documentData.label || documentData.type,
    "No document",
  );
  const fileName = formatText(documentData.fileName, "-");
  const url = String(documentData.url ?? documentData.documentUrl ?? "").trim();

  return {
    label,
    fileName,
    url,
  };
}

function hasRegisteredFaceProfile(account) {
  if (!account) {
    return false;
  }

  if (account.faceVerified || account.faceProfileRegistered) {
    return true;
  }

  if (account.verifiedAt) {
    return true;
  }

  const registeredFaceProfile = account.registeredFaceProfile;
  if (registeredFaceProfile && typeof registeredFaceProfile === "object") {
    return true;
  }

  const faceAttendanceProfile = account.face_attendance_lh || account.faceAttendanceLh;
  if (faceAttendanceProfile && typeof faceAttendanceProfile === "object") {
    const sampleCount = Number(faceAttendanceProfile.sampleCount ?? faceAttendanceProfile.sample_count ?? 0);
    return Boolean(faceAttendanceProfile.registeredAt || faceAttendanceProfile.registered_at || sampleCount > 0);
  }

  return Boolean(faceAttendanceProfile);
}

function setSummary(accounts) {
  const verifiedAccounts = accounts.filter(hasRegisteredFaceProfile);
  const latestAccount = accounts[0];

  if (accountsTotal) {
    accountsTotal.textContent = String(accounts.length);
  }

  if (accountsVerified) {
    accountsVerified.textContent = String(verifiedAccounts.length);
  }

  if (accountsLatest) {
    accountsLatest.textContent = latestAccount
      ? `${latestAccount.firstName} ${latestAccount.lastName}`
      : "No data";
  }

  if (accountsCountPill) {
    accountsCountPill.textContent = `${accounts.length} employee${accounts.length === 1 ? "" : "s"}`;
  }
}

function createEmptyState(message) {
  const emptyState = document.createElement("div");
  emptyState.className = "empty-state";
  emptyState.textContent = message;
  return emptyState;
}

function normalizeEmployeeSearchValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getEmployeeSearchText(account) {
  return [
    account?.employeeId,
    account?.accountCode,
    account?.id,
    account?.firstName,
    account?.middleName,
    account?.lastName,
    `${account?.firstName ?? ""} ${account?.lastName ?? ""}`,
    `${account?.firstName ?? ""} ${account?.middleName ?? ""} ${account?.lastName ?? ""}`,
  ]
    .map(normalizeEmployeeSearchValue)
    .filter(Boolean)
    .join(" ");
}

function getFilteredEmployeeAccounts(accounts = currentEmployeeAccounts) {
  const query = normalizeEmployeeSearchValue(employeeSearchQuery);
  if (!query) {
    return accounts;
  }

  return accounts.filter((account) => getEmployeeSearchText(account).includes(query));
}

function createCell(value, options = {}) {
  const cell = document.createElement("td");
  cell.textContent = formatText(value);

  if (options.isMuted) {
    cell.classList.add("employee-data-table__cell--muted");
  }

  return cell;
}

function createDocumentFileCell(account) {
  const cell = document.createElement("td");
  const documentInfo = getDocumentInfo(account);
  const stack = document.createElement("span");
  stack.className = "employee-data-table__document-stack";
  const name = documentInfo.url ? document.createElement("a") : document.createElement("span");

  if (!documentInfo.url) {
    cell.classList.add("employee-data-table__cell--muted");
    name.className = "employee-data-table__document-name";
  } else {
    name.className = "employee-data-table__document-link";
    name.href = documentInfo.url;
    name.target = "_blank";
    name.rel = "noopener";
    name.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  }

  name.textContent = documentInfo.fileName;
  stack.appendChild(name);

  if (documentInfo.label && documentInfo.label !== "No document") {
    const type = document.createElement("span");
    type.className = "employee-data-table__document-type";
    type.textContent = documentInfo.label;
    stack.appendChild(type);
  }

  cell.appendChild(stack);
  return cell;
}

function createFaceVerificationCell(account) {
  const cell = document.createElement("td");
  const badge = document.createElement("span");
  badge.className = "user-account-badge";

  if (hasRegisteredFaceProfile(account)) {
    badge.classList.add("is-success");
    badge.textContent = "Completed";
  } else {
    badge.textContent = "Pending";
  }

  cell.appendChild(badge);
  return cell;
}

function createFirstNameCell(account) {
  const cell = document.createElement("td");
  const wrapper = document.createElement("span");
  wrapper.className = "employee-data-table__name-with-badge";
  const name = document.createElement("span");
  name.textContent = formatText(account?.firstName);
  wrapper.appendChild(name);

  if (hasEmployeePendingLeaveRequest(account)) {
    wrapper.appendChild(createEmployeeLeaveBadge());
  }

  cell.appendChild(wrapper);
  return cell;
}

function createActionsCell(account) {
  const cell = document.createElement("td");
  const actions = document.createElement("div");
  actions.className = "employee-data-table__actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "employee-data-table__action-button";
  editButton.setAttribute("aria-label", "Edit employee");
  editButton.title = "Edit";
  editButton.innerHTML = '<i class="fa-regular fa-pen-to-square" aria-hidden="true"></i>';
  editButton.addEventListener("click", (event) => {
    event.stopPropagation();
    openEmployeeEditModal(account);
  });

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "employee-data-table__action-button employee-data-table__action-button--danger";
  deleteButton.setAttribute("aria-label", "Delete employee");
  deleteButton.title = "Delete";
  deleteButton.innerHTML = '<i class="fa-regular fa-trash-can" aria-hidden="true"></i>';
  deleteButton.addEventListener("click", (event) => {
    event.stopPropagation();
    deleteEmployeeAccount(account, deleteButton);
  });

  actions.append(editButton, deleteButton);
  cell.appendChild(actions);
  return cell;
}

function createEmployeeDataRow(account, index) {
  const row = document.createElement("tr");
  const accountId = getEmployeeAccountId(account);

  row.append(
    createDocumentFileCell(account),
    createCell(account.employeeId || account.accountCode || account.id),
    createCell(account.position || "Employee"),
    createCell(formatScheduleTime(account.timeIn)),
    createCell(formatScheduleTime(account.timeOut)),
    createFirstNameCell(account),
    createCell(account.middleName, { isMuted: !account.middleName }),
    createCell(account.lastName),
    createCell(account.suffix, { isMuted: !account.suffix }),
    createCell(account.email),
    createCell(formatPhone(account)),
    createCell(formatDateTime(account.createdAt)),
    createFaceVerificationCell(account),
    createActionsCell(account),
  );

  row.dataset.employeeRow = String(index + 1);
  row.dataset.employeeAccountId = accountId;
  row.tabIndex = 0;
  row.setAttribute("role", "button");
  row.setAttribute("aria-label", `Select ${getEmployeeDisplayName(account)} for access`);
  row.classList.toggle("is-selected", accountId === selectedEmployeeAccessAccountId);
  row.addEventListener("click", () => {
    selectEmployeeAccessAccount(account);
  });
  row.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    selectEmployeeAccessAccount(account);
  });
  return row;
}

function createEmployeeDataTable(accounts) {
  const tableShell = document.createElement("div");
  tableShell.className = "employee-data-table-shell";

  const table = document.createElement("table");
  table.className = "employee-data-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  employeeDataColumns.forEach((column) => {
    const header = document.createElement("th");
    header.scope = "col";
    header.textContent = column.label;
    headerRow.appendChild(header);
  });

  thead.appendChild(headerRow);

  const tbody = document.createElement("tbody");
  accounts.forEach((account, index) => {
    tbody.appendChild(createEmployeeDataRow(account, index));
  });

  table.append(thead, tbody);
  tableShell.appendChild(table);
  return tableShell;
}

function renderEmployeeAccountList() {
  const visibleAccounts = getFilteredEmployeeAccounts();
  const query = String(employeeSearchQuery ?? "").trim();
  userAccountList.replaceChildren();
  setSummary(currentEmployeeAccounts);
  syncEmployeeLeaveNavBadge();

  if (!currentEmployeeAccounts.length) {
    userAccountList.appendChild(createEmptyState("No registered employee accounts yet."));
    syncEmployeeAccessFab();
    return;
  }

  if (!visibleAccounts.length) {
    userAccountList.appendChild(createEmptyState(`No employee found for "${query}".`));
    syncEmployeeAccessFab();
    return;
  }

  userAccountList.appendChild(createEmployeeDataTable(visibleAccounts));
  syncEmployeeAccessFab();
}

function renderAccounts(accounts) {
  currentEmployeeAccounts = accounts;
  if (
    selectedEmployeeAccessAccountId &&
    !accounts.some((account) => getEmployeeAccountId(account) === selectedEmployeeAccessAccountId)
  ) {
    selectedEmployeeAccessAccountId = "";
  }

  renderEmployeeAccountList();
}

function createEmployeeAccessIcon(name) {
  const verifiedUserPath =
    "m439-442-79-79q-9-9-22-9t-22 9q-9 9-9 22t9 22l99 100q9 9 21 9t21-9l186-186q9-9 9-21.5t-9-20.5q-8-8-21-7.5t-21 8.5L439-442Zm31.5 357q-4.5-1-9.5-3-139-47-220-168.5T160-523v-196q0-19 11-34.5t28-22.5l260-97q11-4 21-4t21 4l260 97q17 7 28 22.5t11 34.5v196q0 145-81 266.5T499-88q-5 2-9.5 3t-9.5 1q-5 0-9.5-1Z";

  if (name === "packing") {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path d="M4.5 7.5 12 3.6l7.5 3.9v8.8L12 20.4 4.5 16.3V7.5Z" stroke-linejoin="round" />
        <path d="M4.8 7.7 12 11.7l7.2-4" stroke-linejoin="round" />
        <path d="M12 11.7v8" stroke-linecap="round" />
      </svg>
    `;
  }

  if (name === "admin") {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path d="M12 3.6 19 7v5.2c0 4.1-2.8 6.8-7 7.9-4.2-1.1-7-3.8-7-7.9V7l7-3.4Z" stroke-linejoin="round" />
        <path d="M8.7 12.5 11 14.8l5.1-5.3" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `;
  }

  if (name === "evaluation") {
    return `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M20 13.75C20 13.3358 19.6642 13 19.25 13H16.25C15.8358 13 15.5 13.3358 15.5 13.75V20.5H14V4.25C14 3.52169 13.9984 3.05091 13.9518 2.70403C13.908 2.37872 13.8374 2.27676 13.7803 2.21967C13.7232 2.16258 13.6213 2.09197 13.296 2.04823C12.9491 2.00159 12.4783 2 11.75 2C11.0217 2 10.5509 2.00159 10.204 2.04823C9.87872 2.09197 9.77676 2.16258 9.71967 2.21967C9.66258 2.27676 9.59196 2.37872 9.54823 2.70403C9.50159 3.05091 9.5 3.52169 9.5 4.25V20.5H8V8.75C8 8.33579 7.66421 8 7.25 8H4.25C3.83579 8 3.5 8.33579 3.5 8.75V20.5H2H1.75C1.33579 20.5 1 20.8358 1 21.25C1 21.6642 1.33579 22 1.75 22H21.75C22.1642 22 22.5 21.6642 22.5 21.25C22.5 20.8358 22.1642 20.5 21.75 20.5H21.5H20V13.75Z" fill="currentColor" />
      </svg>
    `;
  }

  return `
    <svg viewBox="0 -960 960 960" fill="none" aria-hidden="true">
      <path d="${verifiedUserPath}" fill="currentColor" />
    </svg>
  `;
}

function createEmployeeAccessFab() {
  if (employeeAccessFabRefs) {
    return employeeAccessFabRefs;
  }

  const fab = document.createElement("div");
  fab.className = "category-shortcut-fab employee-access-fab";
  fab.hidden = true;
  fab.innerHTML = `
    <button
      type="button"
      class="category-shortcut-fab__trigger employee-access-fab__trigger"
      data-employee-access-toggle
      aria-expanded="false"
      aria-haspopup="dialog"
      aria-label="Give Access"
      data-nav-tooltip="Give Access"
    >
      <span class="employee-access-fab__icon">
        ${createEmployeeAccessIcon("access")}
      </span>
    </button>
    <button
      type="button"
      class="category-shortcut-fab__trigger employee-access-fab__trigger employee-access-fab__trigger--evaluation"
      data-employee-evaluation-toggle
      aria-expanded="false"
      aria-haspopup="dialog"
      aria-label="Employee Evaluation"
      data-nav-tooltip="Employee Evaluation"
    >
      <span class="employee-access-fab__icon">
        ${createEmployeeAccessIcon("evaluation")}
      </span>
      <span class="employee-leave-icon-badge" data-employee-evaluation-leave-badge hidden></span>
    </button>
  `;

  document.body.appendChild(fab);

  const refs = {
    fab,
    toggle: fab.querySelector("[data-employee-access-toggle]"),
    evaluationToggle: fab.querySelector("[data-employee-evaluation-toggle]"),
    evaluationLeaveBadge: fab.querySelector("[data-employee-evaluation-leave-badge]"),
  };

  refs.toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    if (employeeAccessDrawerRefs && !employeeAccessDrawerRefs.overlay.hidden) {
      closeEmployeeAccessDrawer();
      return;
    }
    closeEmployeeAttendanceRecordsModal({ restoreFocus: false, immediate: true });
    closeEmployeeEvaluationDrawer({ restoreFocus: false, immediate: true });
    openEmployeeAccessDrawer();
  });

  refs.evaluationToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    if (employeeEvaluationDrawerRefs && !employeeEvaluationDrawerRefs.overlay.hidden) {
      closeEmployeeEvaluationDrawer();
      return;
    }
    closeEmployeeAttendanceRecordsModal({ restoreFocus: false, immediate: true });
    closeEmployeeAccessDrawer({ restoreFocus: false, immediate: true });
    openEmployeeEvaluationDrawer();
  });

  employeeAccessFabRefs = refs;
  return refs;
}

function createEmployeeAccessDrawer() {
  if (employeeAccessDrawerRefs) {
    return employeeAccessDrawerRefs;
  }

  const overlay = document.createElement("div");
  overlay.className = "employee-access-drawer-overlay";
  overlay.hidden = true;
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <aside class="employee-access-drawer" role="dialog" aria-modal="true" aria-labelledby="employee-access-drawer-title">
      <div class="employee-access-drawer__profile-panel">
        <div class="employee-access-drawer__header side-drawer__header">
          <div class="employee-access-drawer__heading">
            <h2 class="side-drawer__title" id="employee-access-drawer-title">Give Access</h2>
          </div>
          <button type="button" class="employee-access-drawer__close" data-employee-access-drawer-close aria-label="Close give access panel">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>
        <div class="employee-access-drawer__summary">
          <button type="button" class="employee-access-drawer__avatar" data-employee-access-avatar aria-label="See profile picture">EA</button>
          <div class="employee-access-drawer__summary-copy">
            <strong data-employee-access-name>Employee</strong>
            <span data-employee-access-position>Position</span>
          </div>
        </div>
      </div>
      <div class="employee-access-drawer__permissions-panel">
        <div class="employee-access-drawer__actions" aria-label="Give access list">
          ${employeeAccessPermissionItems.map(createEmployeeAccessPermissionMarkup).join("")}
        </div>
      </div>
      <div class="employee-access-drawer__footer">
        <p class="employee-access-drawer__feedback" data-employee-access-feedback aria-live="polite"></p>
        <button type="button" class="dashboard-link-button employee-access-drawer__save" data-employee-access-save>
          Save
        </button>
      </div>
    </aside>
  `;

  document.body.appendChild(overlay);

  const refs = {
    overlay,
    drawer: overlay.querySelector(".employee-access-drawer"),
    closeButton: overlay.querySelector("[data-employee-access-drawer-close]"),
    avatar: overlay.querySelector("[data-employee-access-avatar]"),
    name: overlay.querySelector("[data-employee-access-name]"),
    position: overlay.querySelector("[data-employee-access-position]"),
    permissionList: overlay.querySelector(".employee-access-drawer__actions"),
    permissionInputs: Array.from(overlay.querySelectorAll("[data-employee-access-permission]")),
    saveButton: overlay.querySelector("[data-employee-access-save]"),
    feedback: overlay.querySelector("[data-employee-access-feedback]"),
  };

  refs.closeButton.addEventListener("click", () => {
    closeEmployeeAccessDrawer();
  });

  refs.avatar.addEventListener("click", () => {
    openEmployeeProfilePictureViewer(getSelectedEmployeeAccessAccount());
  });

  refs.overlay.addEventListener("click", (event) => {
    if (event.target === refs.overlay) {
      closeEmployeeAccessDrawer();
    }
  });

  refs.permissionList.addEventListener("click", (event) => {
    const option = event.target?.closest?.(".employee-access-option");
    if (!option || !refs.permissionList.contains(option)) {
      return;
    }

    const input = option.querySelector("[data-employee-access-permission]");
    if (!(input instanceof HTMLInputElement) || input.disabled) {
      return;
    }

    if (event.target === input) {
      return;
    }

    event.preventDefault();
    input.checked = !input.checked;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  refs.permissionInputs.forEach((input) => {
    input.addEventListener("change", () => {
      setEmployeeAccessFeedback();
    });
  });
  refs.saveButton.addEventListener("click", () => {
    void saveSelectedEmployeeAccess();
  });

  employeeAccessDrawerRefs = refs;
  return refs;
}

function getEmployeeAccessAvatarText(account) {
  const firstInitial = String(account?.firstName ?? "").trim().charAt(0);
  const lastInitial = String(account?.lastName ?? "").trim().charAt(0);
  const initials = `${firstInitial}${lastInitial}`.trim();
  return (initials || "EA").toUpperCase();
}

function getEmployeeProfileImageUrl(account) {
  return [
    account?.profileImageUrl,
    account?.avatarUrl,
    account?.photoUrl,
    account?.profilePhotoUrl,
    account?.employeePhotoUrl,
    account?.pictureUrl,
    account?.imageUrl,
  ]
    .map((value) => String(value ?? "").trim())
    .find(Boolean) || "";
}

function syncEmployeeDrawerAvatar(avatarElement, account, fallbackText = "EA") {
  if (!(avatarElement instanceof HTMLElement)) {
    return;
  }

  const imageUrl = getEmployeeProfileImageUrl(account);
  avatarElement.replaceChildren();
  avatarElement.classList.toggle("has-image", Boolean(imageUrl));
  avatarElement.toggleAttribute("disabled", !imageUrl);
  avatarElement.setAttribute(
    "aria-label",
    imageUrl
      ? `See ${getEmployeeDisplayName(account)} profile picture`
      : `${getEmployeeDisplayName(account)} has no profile picture`,
  );
  avatarElement.setAttribute("title", imageUrl ? "See Profile Picture" : "No profile picture");

  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = `${getEmployeeDisplayName(account)} profile picture`;
    image.loading = "lazy";
    avatarElement.appendChild(image);
    return;
  }

  avatarElement.textContent = getEmployeeAccessAvatarText(account) || fallbackText;
}

function createEmployeeProfilePictureViewer() {
  if (employeeProfilePictureViewerRefs) {
    return employeeProfilePictureViewerRefs;
  }

  const overlay = document.createElement("div");
  overlay.className = "employee-account-settings-photo-viewer employee-data-profile-viewer";
  overlay.hidden = true;
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <section class="employee-account-settings-photo-viewer__dialog" role="dialog" aria-modal="true" aria-label="Employee profile picture preview">
      <button type="button" class="employee-account-settings-photo-viewer__close" data-employee-profile-viewer-close aria-label="Close profile picture preview">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
      <img data-employee-profile-viewer-image alt="" />
    </section>
  `;

  document.body.appendChild(overlay);
  window.WebTheme?.applyFontAwesomeIcons?.(overlay);

  const refs = {
    overlay,
    closeButton: overlay.querySelector("[data-employee-profile-viewer-close]"),
    image: overlay.querySelector("[data-employee-profile-viewer-image]"),
  };

  refs.closeButton.addEventListener("click", closeEmployeeProfilePictureViewer);
  refs.overlay.addEventListener("click", (event) => {
    if (event.target === refs.overlay) {
      closeEmployeeProfilePictureViewer();
    }
  });

  employeeProfilePictureViewerRefs = refs;
  return refs;
}

function openEmployeeProfilePictureViewer(account) {
  const imageUrl = getEmployeeProfileImageUrl(account);
  if (!imageUrl) {
    return;
  }

  const refs = createEmployeeProfilePictureViewer();
  refs.image.src = imageUrl;
  refs.image.alt = `${getEmployeeDisplayName(account)} profile picture`;
  refs.overlay.hidden = false;
  refs.overlay.setAttribute("aria-hidden", "false");
  syncEmployeeDataModalOpenClass();
  window.requestAnimationFrame(() => {
    refs.overlay.classList.add("is-open");
    refs.closeButton.focus();
  });
}

function closeEmployeeProfilePictureViewer() {
  if (!employeeProfilePictureViewerRefs || employeeProfilePictureViewerRefs.overlay.hidden) {
    return;
  }

  const refs = employeeProfilePictureViewerRefs;
  refs.overlay.classList.remove("is-open");
  refs.overlay.hidden = true;
  refs.overlay.setAttribute("aria-hidden", "true");
  refs.image.removeAttribute("src");
  refs.image.alt = "";
  syncEmployeeDataModalOpenClass();
}

function normalizeEmployeeEvaluationPercent(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return null;
  }

  const percentValue = numericValue > 0 && numericValue <= 1
    ? numericValue * 100
    : numericValue;
  return Math.max(0, Math.min(100, Math.round(percentValue)));
}

function normalizeEmployeeEvaluationRating(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(5, numericValue));
}

function getEmployeeEvaluationStarFillPercentage(rating, starIndex) {
  const normalizedRating = normalizeEmployeeEvaluationRating(rating);
  const rawFill = Math.max(0, Math.min(1, normalizedRating - starIndex));
  return Math.round(rawFill * 100);
}

function formatEmployeeEvaluationRatingScore(rating) {
  const normalizedRating = normalizeEmployeeEvaluationRating(rating);
  return normalizedRating > 0 ? normalizedRating.toFixed(1) : "No rating";
}

function createEmployeeEvaluationRatingStarsMarkup(rating) {
  return Array.from({ length: 5 }, (_, index) => {
    const fillPercentage = getEmployeeEvaluationStarFillPercentage(rating, index);
    return `
      <span class="employee-evaluation-rating-star" style="--star-fill: ${fillPercentage}%">
        <span class="employee-evaluation-rating-star__base" aria-hidden="true">&#9733;</span>
        <span class="employee-evaluation-rating-star__fill" aria-hidden="true">&#9733;</span>
      </span>
    `;
  }).join("");
}

function getEmployeeEvaluationThreadCustomerName(thread) {
  const candidates = [
    thread?.customerName,
    thread?.clientName,
    thread?.fullName,
    thread?.displayName,
    thread?.userName,
    thread?.customerLabel,
  ];

  for (const candidate of candidates) {
    const normalizedCandidate = String(candidate || "").trim();
    if (normalizedCandidate) {
      return normalizedCandidate;
    }
  }

  return "App User";
}

function getEmployeeEvaluationThreadAvatarText(thread) {
  return getEmployeeEvaluationThreadCustomerName(thread).charAt(0).toUpperCase() || "U";
}

function getEmployeeEvaluationRatingEntries() {
  return employeeEvaluationChatThreads
    .map((thread) => {
      const rating = normalizeEmployeeEvaluationRating(thread?.employeeRating);
      if (rating <= 0) {
        return null;
      }

      return {
        rating,
        customerName: getEmployeeEvaluationThreadCustomerName(thread),
        avatarText: getEmployeeEvaluationThreadAvatarText(thread),
        productName: String(thread?.productName || "Customer chat").trim() || "Customer chat",
        comment: String(thread?.employeeRatingComment || "").trim(),
        dateText: formatDateTime(thread?.employeeRatingUpdatedAt || thread?.updatedAt),
      };
    })
    .filter(Boolean);
}

function getEmployeeEvaluationRatingDetails() {
  const isLoading = !employeeEvaluationChatThreadsLoaded && employeeEvaluationChatThreads.length === 0;
  const entries = isLoading ? [] : getEmployeeEvaluationRatingEntries();
  const total = entries.length;
  const averageRating = total > 0
    ? entries.reduce((sum, entry) => sum + entry.rating, 0) / total
    : 0;
  const counts = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  entries.forEach((entry) => {
    const bucket = Math.max(1, Math.min(5, Math.round(entry.rating)));
    counts[bucket] += 1;
  });

  return {
    isLoading,
    entries,
    total,
    averageRating,
    scoreText: isLoading ? "Loading" : formatEmployeeEvaluationRatingScore(averageRating),
    totalText: isLoading
      ? "Loading reviews"
      : `${total} total review${total === 1 ? "" : "s"}`,
    counts,
  };
}

function getEmployeeEvaluationNumber(source, keys) {
  if (!source || typeof source !== "object") {
    return null;
  }

  for (const key of keys) {
    const numericValue = Number(source[key]);
    if (Number.isFinite(numericValue)) {
      return numericValue;
    }
  }

  return null;
}

function getEmployeeFaceAttendanceProfile(account) {
  return account?.face_attendance_lh
    || account?.faceAttendanceLh
    || account?.registeredFaceProfile
    || null;
}

function getEmployeeAttendanceRecords(profile) {
  if (!profile || typeof profile !== "object") {
    return [];
  }

  const recordKeys = [
    "attendance",
    "attendanceRecords",
    "attendance_records",
    "attendanceLogs",
    "attendance_logs",
    "records",
    "logs",
  ];
  for (const key of recordKeys) {
    if (Array.isArray(profile[key])) {
      return profile[key];
    }
  }

  return [];
}

function isEmployeeAttendancePresent(record) {
  if (!record || typeof record !== "object") {
    return false;
  }

  if (record.present === true || record.isPresent === true || record.checkedIn === true) {
    return true;
  }

  const status = String(
    record.status
      ?? record.attendanceStatus
      ?? record.attendance_status
      ?? "",
  ).trim().toLowerCase();
  if (status) {
    if (/(absent|no show|no-show|missing|leave|off)/.test(status)) {
      return false;
    }

    return /(present|on time|on-time|late|checked in|checked-in|time in|time-in)/.test(status);
  }

  return Boolean(
    record.timeIn
      || record.time_in
      || record.checkIn
      || record.check_in
      || record.clockIn
      || record.clock_in,
  );
}

function getEmployeeAttendanceRecordDate(record) {
  const rawDate = String(
    record?.date
      ?? record?.attendanceDate
      ?? record?.attendance_date
      ?? record?.recorded_at
      ?? record?.recordedAt
      ?? record?.timestamp
      ?? record?.createdAt
      ?? "",
  ).trim();

  if (!rawDate) {
    return null;
  }

  const dateKeyMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateKeyMatch) {
    const year = Number(dateKeyMatch[1]);
    const month = Number(dateKeyMatch[2]);
    const day = Number(dateKeyMatch[3]);
    if (year && month && day) {
      return new Date(year, month - 1, day);
    }
  }

  const date = new Date(rawDate);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getEmployeeAttendanceDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getEmployeeAttendanceRecordDateKey(record) {
  return getEmployeeAttendanceDateKey(getEmployeeAttendanceRecordDate(record));
}

function parseEmployeeAttendanceDateKey(dateKey) {
  const [year, month, day] = String(dateKey || "")
    .split("-")
    .map((part) => Number(part));
  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function formatEmployeeAttendanceDate(dateKey) {
  const date = parseEmployeeAttendanceDateKey(dateKey);
  if (!date) {
    return formatText(dateKey, "-");
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function isEmployeeAttendanceFutureDateKey(dateKey) {
  const date = parseEmployeeAttendanceDateKey(dateKey);
  if (!date) {
    return false;
  }

  const today = new Date();
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return date.getTime() > todayDate.getTime();
}

function getEmployeeCurrentMonthAttendanceRecords(records) {
  const now = new Date();
  return records.filter((record) => {
    const recordDate = getEmployeeAttendanceRecordDate(record);
    return recordDate
      && recordDate.getFullYear() === now.getFullYear()
      && recordDate.getMonth() === now.getMonth();
  });
}

function getEmployeeAttendanceRecordTimestamp(record) {
  const rawValue = String(
    record?.recorded_at
      ?? record?.recordedAt
      ?? record?.timestamp
      ?? record?.createdAt
      ?? record?.timeIn
      ?? record?.time_in
      ?? record?.timeOut
      ?? record?.time_out
      ?? "",
  ).trim();

  const parsed = rawValue ? new Date(rawValue) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) {
    return parsed.getTime();
  }

  const recordDate = getEmployeeAttendanceRecordDate(record);
  return recordDate ? recordDate.getTime() : 0;
}

function getEmployeeAttendanceMode(record) {
  return String(record?.mode ?? record?.attendanceMode ?? record?.attendance_mode ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-");
}

function isEmployeeAttendanceAbsentRecord(record) {
  return /(absent|no show|no-show|missing|leave|off)/.test(getEmployeeAttendanceStatus(record));
}

function isEmployeeAttendanceTimeOutRecord(record) {
  const mode = getEmployeeAttendanceMode(record);
  const status = getEmployeeAttendanceStatus(record);
  return mode === "time-out"
    || mode === "emergency-time-out"
    || /(timed out|time out|time-out|emergency time out|emergency-time-out)/.test(status);
}

function getEmployeeAttendanceRawTimeValue(record, keys) {
  for (const key of keys) {
    const value = String(record?.[key] ?? "").trim();
    if (value && !/^n\/?a$/i.test(value) && value !== "-") {
      return value;
    }
  }

  return "";
}

function getEmployeeAttendanceRecordTimeIn(record) {
  const rawValue = getEmployeeAttendanceRawTimeValue(record, [
    "timeIn",
    "time_in",
    "checkIn",
    "check_in",
    "clockIn",
    "clock_in",
  ]);
  if (rawValue) {
    return rawValue;
  }

  return isEmployeeAttendanceAbsentRecord(record) || isEmployeeAttendanceTimeOutRecord(record)
    ? ""
    : String(record?.recorded_at ?? record?.recordedAt ?? record?.timestamp ?? "").trim();
}

function getEmployeeAttendanceRecordTimeOut(record) {
  const rawValue = getEmployeeAttendanceRawTimeValue(record, [
    "timeOut",
    "time_out",
    "checkOut",
    "check_out",
    "clockOut",
    "clock_out",
  ]);
  if (rawValue) {
    return rawValue;
  }

  return isEmployeeAttendanceTimeOutRecord(record)
    ? String(record?.recorded_at ?? record?.recordedAt ?? record?.timestamp ?? "").trim()
    : "";
}

function formatEmployeeAttendanceClock(value) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue || /^n\/?a$/i.test(rawValue) || rawValue === "-") {
    return "-";
  }

  const timeMatch = rawValue.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AP]M)?$/i);
  if (timeMatch) {
    const hourValue = Number(timeMatch[1]);
    const minuteText = timeMatch[2];
    const periodText = timeMatch[3] ? timeMatch[3].toUpperCase() : "";
    if (periodText) {
      const displayHour = hourValue % 12 || 12;
      return `${displayHour}:${minuteText} ${periodText}`;
    }
    if (Number.isFinite(hourValue) && hourValue >= 0 && hourValue <= 23) {
      return formatScheduleTime(`${String(hourValue).padStart(2, "0")}:${minuteText}`);
    }
  }

  const parsed = new Date(rawValue);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return rawValue;
}

function getEmployeeAttendanceSummaryStatus(account, records) {
  const hasTimeRecord = records.some(
    (record) =>
      !isEmployeeAttendanceAbsentRecord(record)
      && (
        isEmployeeAttendanceTimeOutRecord(record)
        || getEmployeeAttendanceRecordTimeIn(record)
        || getEmployeeAttendanceRecordTimeOut(record)
        || isEmployeeAttendancePresent(record)
      ),
  );
  const hasLateRecord = records.some(
    (record) => getEmployeeAttendancePenalty(record, account).type === "late",
  );
  const hasAbsentRecord = records.some(isEmployeeAttendanceAbsentRecord);
  const hasLeaveRecord = records.some(isEmployeeAttendanceLeaveRecord);

  if (hasLeaveRecord && !hasTimeRecord) {
    return {
      key: "leave",
      label: "Leave",
      pillClass: "info",
    };
  }

  if (hasAbsentRecord && !hasTimeRecord) {
    return {
      key: "absent",
      label: "Absent",
      pillClass: "error",
    };
  }

  if (hasLateRecord) {
    return {
      key: "late",
      label: "Late",
      pillClass: "warning",
    };
  }

  return {
    key: "present",
    label: "Present",
    pillClass: "success",
  };
}

function isEmployeeAttendanceLeaveRecord(record) {
  return /(leave|off)/.test(getEmployeeAttendanceStatus(record));
}

function getEmployeeAttendanceDailySummaries(account, records) {
  const recordsByDate = new Map();

  records.forEach((record) => {
    const dateKey = getEmployeeAttendanceRecordDateKey(record);
    if (!dateKey) {
      return;
    }

    const dailyRecords = recordsByDate.get(dateKey) ?? [];
    dailyRecords.push(record);
    recordsByDate.set(dateKey, dailyRecords);
  });

  return [...recordsByDate.entries()]
    .map(([dateKey, dailyRecords]) => {
      const sortedRecords = [...dailyRecords].sort(
        (left, right) => getEmployeeAttendanceRecordTimestamp(left) - getEmployeeAttendanceRecordTimestamp(right),
      );
      const timeInRecord = sortedRecords.find(
        (record) => !isEmployeeAttendanceAbsentRecord(record) && !isEmployeeAttendanceTimeOutRecord(record),
      );
      const timeOutRecord = [...sortedRecords].reverse().find(isEmployeeAttendanceTimeOutRecord);
      const status = getEmployeeAttendanceSummaryStatus(account, sortedRecords);

      return {
        dateKey,
        statusKey: status.key,
        statusLabel: status.label,
        statusPillClass: status.pillClass,
        timeIn: formatEmployeeAttendanceClock(timeInRecord ? getEmployeeAttendanceRecordTimeIn(timeInRecord) : ""),
        timeOut: formatEmployeeAttendanceClock(timeOutRecord ? getEmployeeAttendanceRecordTimeOut(timeOutRecord) : ""),
      };
    })
    .sort((left, right) => String(left.dateKey).localeCompare(String(right.dateKey)));
}

function getEmployeeAttendanceMonthSummaries(account, monthDate) {
  const profile = getEmployeeFaceAttendanceProfile(account);
  const records = getEmployeeAttendanceRecords(profile);
  const targetDate = monthDate instanceof Date && !Number.isNaN(monthDate.getTime())
    ? monthDate
    : new Date();

  return getEmployeeAttendanceDailySummaries(account, records).filter((summary) => {
    const recordDate = parseEmployeeAttendanceDateKey(summary.dateKey);
    return recordDate
      && recordDate.getFullYear() === targetDate.getFullYear()
      && recordDate.getMonth() === targetDate.getMonth();
  });
}

function getEmployeeAttendanceInitialMonth(account) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getEmployeeAttendanceSelectedDateKey(summaries, monthDate, leaveRequests = []) {
  const month = monthDate instanceof Date && !Number.isNaN(monthDate.getTime())
    ? monthDate
    : new Date();
  const selectedDate = parseEmployeeAttendanceDateKey(employeeAttendanceSelectedDateKey);
  const requestedDateKeys = leaveRequests
    .map((request) => String(request?.dateKey ?? "").trim())
    .filter(Boolean);
  if (
    selectedDate
    && selectedDate.getFullYear() === month.getFullYear()
    && selectedDate.getMonth() === month.getMonth()
    && (
      !isEmployeeAttendanceFutureDateKey(employeeAttendanceSelectedDateKey)
      || requestedDateKeys.includes(employeeAttendanceSelectedDateKey)
    )
  ) {
    return employeeAttendanceSelectedDateKey;
  }

  const today = new Date();
  if (today.getFullYear() === month.getFullYear() && today.getMonth() === month.getMonth()) {
    return getEmployeeAttendanceDateKey(today);
  }

  return "";
}

function getEmployeeAttendanceStatus(record) {
  return String(
    record?.status
      ?? record?.attendanceStatus
      ?? record?.attendance_status
      ?? record?.recordStatus
      ?? record?.record_status
      ?? "",
  ).trim().toLowerCase();
}

function getEmployeeAttendanceCheckInMinutes(record) {
  const rawValue = String(
    record?.timeIn
      ?? record?.time_in
      ?? record?.checkIn
      ?? record?.check_in
      ?? record?.clockIn
      ?? record?.clock_in
      ?? record?.recorded_at
      ?? record?.recordedAt
      ?? record?.timestamp
      ?? "",
  ).trim();

  const directTime = parseScheduleTime(rawValue.slice(0, 5));
  if (directTime !== null) {
    return directTime;
  }

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getHours() * 60 + date.getMinutes();
}

function getEmployeeAttendancePenalty(record, account) {
  const status = getEmployeeAttendanceStatus(record);
  if (/(absent|no show|no-show|missing|leave|off)/.test(status)) {
    return {
      type: "absent",
      points: 10,
    };
  }

  if (/(late|tardy)/.test(status)) {
    return {
      type: "late",
      points: 5,
    };
  }

  if (/(on time|on-time|ontime)/.test(status)) {
    return {
      type: "on-time",
      points: 0,
    };
  }

  const scheduledTimeIn = parseScheduleTime(account?.timeIn);
  const checkInMinutes = getEmployeeAttendanceCheckInMinutes(record);
  if (
    scheduledTimeIn !== null
    && checkInMinutes !== null
    && checkInMinutes > scheduledTimeIn
  ) {
    return {
      type: "late",
      points: 5,
    };
  }

  return {
    type: "on-time",
    points: 0,
  };
}

function getEmployeeMonthlyAttendanceEvaluation(account, attendanceRecords) {
  const monthlyRecords = getEmployeeCurrentMonthAttendanceRecords(attendanceRecords);
  if (monthlyRecords.length === 0) {
    return null;
  }

  let absentCount = 0;
  let lateCount = 0;

  monthlyRecords.forEach((record) => {
    const penalty = getEmployeeAttendancePenalty(record, account);
    if (penalty.type === "absent") {
      absentCount += 1;
    } else if (penalty.type === "late") {
      lateCount += 1;
    }
  });

  const onTimeCount = Math.max(0, monthlyRecords.length - absentCount - lateCount);
  const performancePercent = Math.max(0, 100 - (absentCount * 10) - (lateCount * 5));

  return {
    performanceText: `${performancePercent}%`,
    performancePercent,
    sourceText: `${onTimeCount} on time, ${lateCount} late, ${absentCount} absent`,
  };
}

function getEmployeeAttendanceEvaluation(account) {
  const profile = getEmployeeFaceAttendanceProfile(account);
  const attendanceRecords = getEmployeeAttendanceRecords(profile);
  const monthlyAttendance = getEmployeeMonthlyAttendanceEvaluation(account, attendanceRecords);
  if (monthlyAttendance) {
    return monthlyAttendance;
  }

  const directPercent = normalizeEmployeeEvaluationPercent(
    getEmployeeEvaluationNumber(profile, [
      "attendancePerformance",
      "attendance_performance",
      "attendancePercent",
      "attendance_percent",
      "attendancePercentage",
      "attendance_percentage",
      "performancePercent",
      "performance_percent",
      "attendanceRate",
      "attendance_rate",
      "rate",
    ]),
  );

  if (directPercent !== null) {
    return {
      performanceText: `${directPercent}%`,
      performancePercent: directPercent,
      sourceText: "face_attendance_lh",
    };
  }

  const presentCount = getEmployeeEvaluationNumber(profile, [
    "presentDays",
    "present_days",
    "presentCount",
    "present_count",
    "attendedDays",
    "attended_days",
  ]);
  const totalCount = getEmployeeEvaluationNumber(profile, [
    "totalDays",
    "total_days",
    "totalCount",
    "total_count",
    "scheduledDays",
    "scheduled_days",
  ]);

  if (Number.isFinite(presentCount) && Number.isFinite(totalCount) && totalCount > 0) {
    const performancePercent = normalizeEmployeeEvaluationPercent(presentCount / totalCount);
    return {
      performanceText: `${performancePercent}%`,
      performancePercent,
      sourceText: "face_attendance_lh",
    };
  }

  if (attendanceRecords.length > 0) {
    const presentRecords = attendanceRecords.filter(isEmployeeAttendancePresent);
    const absentCount = attendanceRecords.length - presentRecords.length;
    const performancePercent = Math.max(0, 100 - (absentCount * 10));
    return {
      performanceText: `${performancePercent}%`,
      performancePercent,
      sourceText: `${presentRecords.length} present, ${absentCount} absent`,
    };
  }

  const hasFaceProfile = hasRegisteredFaceProfile(account);
  const hasSchedule = parseScheduleTime(account?.timeIn) !== null
    && parseScheduleTime(account?.timeOut) !== null;
  const sampleCount = Number(profile?.sampleCount ?? profile?.sample_count ?? 0);
  let fallbackPercent = 0;
  if (hasFaceProfile && hasSchedule) {
    fallbackPercent = 100;
  } else if (hasFaceProfile) {
    fallbackPercent = 75;
  } else if (hasSchedule) {
    fallbackPercent = 50;
  }

  return {
    performanceText: `${fallbackPercent}%`,
    performancePercent: fallbackPercent,
    sourceText: hasFaceProfile
      ? (sampleCount > 0 ? `${sampleCount} sample${sampleCount === 1 ? "" : "s"}` : "Linked")
      : "Not linked",
  };
}

function getEmployeeEvaluationMessageTime(message) {
  const time = new Date(message?.timestamp).getTime();
  return Number.isFinite(time) ? time : 0;
}

function getEmployeeEvaluationChatSummary() {
  if (!employeeEvaluationChatThreadsLoaded && employeeEvaluationChatThreads.length === 0) {
    return {
      responseText: "Loading",
      responsePercent: 0,
      ratingText: "Loading",
      ratingValue: 0,
      ratingCount: 0,
      ratingNote: "Loading ratings",
    };
  }

  let customerThreadCount = 0;
  let respondedThreadCount = 0;
  const ratings = [];

  employeeEvaluationChatThreads.forEach((thread) => {
    const messages = Array.isArray(thread?.messages)
      ? thread.messages.filter((message) => !message?.deletedAt)
      : [];
    const customerMessages = messages.filter((message) => message?.isFromSupport !== true);

    if (customerMessages.length > 0) {
      customerThreadCount += 1;
      const firstCustomerMessageTime = customerMessages.reduce((firstTime, message) => {
        const messageTime = getEmployeeEvaluationMessageTime(message);
        if (!messageTime) {
          return firstTime;
        }

        return firstTime ? Math.min(firstTime, messageTime) : messageTime;
      }, 0);
      const hasSupportReply = messages.some((message) => {
        if (message?.isFromSupport !== true) {
          return false;
        }

        const messageTime = getEmployeeEvaluationMessageTime(message);
        return !firstCustomerMessageTime || !messageTime || messageTime >= firstCustomerMessageTime;
      });

      if (hasSupportReply) {
        respondedThreadCount += 1;
      }
    }

    const rating = Number(thread?.employeeRating);
    if (Number.isFinite(rating) && rating > 0) {
      ratings.push(Math.max(0, Math.min(5, rating)));
    }
  });

  const responsePercent = customerThreadCount > 0
    ? normalizeEmployeeEvaluationPercent(respondedThreadCount / customerThreadCount)
    : 0;
  const averageRating = ratings.length > 0
    ? ratings.reduce((total, rating) => total + rating, 0) / ratings.length
    : 0;

  return {
    responseText: `${responsePercent}%`,
    responsePercent,
    ratingText: ratings.length > 0 ? averageRating.toFixed(1) : "No rating",
    ratingValue: averageRating,
    ratingCount: ratings.length,
    ratingNote: ratings.length > 0
      ? `${ratings.length} total review${ratings.length === 1 ? "" : "s"}`
      : "No employee ratings yet",
  };
}

async function loadEmployeeEvaluationChatThreads({ force = false } = {}) {
  if ((!force && employeeEvaluationChatThreadsLoaded) || employeeEvaluationChatThreadsLoading) {
    return;
  }

  employeeEvaluationChatThreadsLoading = true;
  syncEmployeeEvaluationDrawer();

  try {
    const response = await fetch("/api/chat-support", {
      cache: "no-store",
      headers: withEmployeeDataAdminHeaders({ Accept: "application/json" }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Unable to load chat support performance.");
    }

    employeeEvaluationChatThreads = Array.isArray(data.threads) ? data.threads : [];
  } catch (error) {
    console.error(error);
    employeeEvaluationChatThreads = [];
  } finally {
    employeeEvaluationChatThreadsLoaded = true;
    employeeEvaluationChatThreadsLoading = false;
    syncEmployeeEvaluationDrawer();
    renderEmployeeEvaluationRatingModal();
  }
}

function getEmployeeEvaluation(account) {
  const attendance = getEmployeeAttendanceEvaluation(account);
  const showChatResponse = hasEmployeeLiveChatAccess(account);
  const chat = showChatResponse
    ? getEmployeeEvaluationChatSummary()
    : {
      responseText: "0%",
      responsePercent: 0,
      ratingText: "No rating",
      ratingValue: 0,
      ratingCount: 0,
      ratingNote: "No employee ratings yet",
    };

  return {
    role: formatText(account?.position, "No position"),
    attendancePerformance: attendance.performanceText,
    attendancePerformancePercent: attendance.performancePercent,
    showChatResponse,
    chatResponseText: chat.responseText,
    chatResponsePercent: chat.responsePercent,
    chatRatingText: chat.ratingText,
    chatRatingValue: chat.ratingValue,
    chatRatingCount: chat.ratingCount,
    chatRatingNote: chat.ratingNote,
  };
}

function createEmployeeEvaluationDrawer() {
  if (employeeEvaluationDrawerRefs) {
    return employeeEvaluationDrawerRefs;
  }

  const overlay = document.createElement("div");
  overlay.className = "employee-access-drawer-overlay employee-evaluation-drawer-overlay";
  overlay.hidden = true;
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <aside class="employee-access-drawer employee-evaluation-drawer" role="dialog" aria-modal="true" aria-labelledby="employee-evaluation-drawer-title">
      <div class="employee-access-drawer__header side-drawer__header">
        <div class="employee-access-drawer__heading">
          <h2 class="side-drawer__title" id="employee-evaluation-drawer-title">Employee Evaluation</h2>
        </div>
        <button type="button" class="employee-access-drawer__close" data-employee-evaluation-drawer-close aria-label="Close employee evaluation panel">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
      <div class="employee-access-drawer__summary">
        <button type="button" class="employee-access-drawer__avatar" data-employee-evaluation-avatar aria-label="See profile picture">EA</button>
        <div class="employee-access-drawer__summary-copy">
          <strong data-employee-evaluation-name>Employee</strong>
          <span data-employee-evaluation-role>Position</span>
        </div>
      </div>
      <section class="employee-evaluation-panel" aria-label="Employee performance">
        <div class="employee-evaluation-panel__grid">
          <button type="button" class="employee-evaluation-panel__metric employee-evaluation-panel__metric--button" data-employee-attendance-records-open aria-haspopup="dialog">
            <span class="employee-evaluation-panel__metric-title">Attendance Performance</span>
            <span class="employee-leave-metric-badge" data-employee-attendance-leave-badge hidden aria-hidden="true"></span>
            <span
              class="employee-evaluation-percent-ring"
              data-employee-evaluation-attendance-ring
              style="--progress: 0"
              aria-label="Attendance Performance 0%"
            >
              <svg class="employee-evaluation-percent-ring__svg" viewBox="0 0 160 160" aria-hidden="true" focusable="false">
                <circle class="employee-evaluation-percent-ring__track" cx="80" cy="80" r="68" pathLength="100" />
                <circle class="employee-evaluation-percent-ring__bar" cx="80" cy="80" r="68" pathLength="100" />
              </svg>
              <strong class="employee-evaluation-percent-ring__value" data-employee-evaluation-attendance-performance>0%</strong>
            </span>
          </button>
          <span class="employee-evaluation-panel__metric" data-employee-evaluation-chat-response-metric>
            <span class="employee-evaluation-panel__metric-title">Chat Response Rate</span>
            <span
              class="employee-evaluation-percent-ring employee-evaluation-percent-ring--secondary"
              data-employee-evaluation-chat-response-ring
              style="--progress: 0"
              aria-label="Chat Response Rate Loading"
            >
              <svg class="employee-evaluation-percent-ring__svg" viewBox="0 0 160 160" aria-hidden="true" focusable="false">
                <circle class="employee-evaluation-percent-ring__track" cx="80" cy="80" r="68" pathLength="100" />
                <circle class="employee-evaluation-percent-ring__bar" cx="80" cy="80" r="68" pathLength="100" />
              </svg>
              <strong class="employee-evaluation-percent-ring__value" data-employee-evaluation-chat-response-rate>Loading</strong>
            </span>
          </span>
          <button type="button" class="employee-evaluation-panel__metric employee-evaluation-panel__metric--button employee-evaluation-panel__metric--rating" data-employee-evaluation-rating-metric aria-haspopup="dialog">
            <span class="employee-evaluation-panel__metric-title">Employee Rating</span>
            <strong class="employee-evaluation-rating-score" data-employee-evaluation-rating-score>Loading</strong>
            <span class="employee-evaluation-rating-stars" data-employee-evaluation-rating-stars aria-label="Loading ratings">
              ${createEmployeeEvaluationRatingStarsMarkup(0)}
            </span>
            <span class="employee-evaluation-panel__metric-note" data-employee-evaluation-rating-note>Loading ratings</span>
          </button>
        </div>
      </section>
    </aside>
  `;

  document.body.appendChild(overlay);

  const refs = {
    overlay,
    drawer: overlay.querySelector(".employee-evaluation-drawer"),
    closeButton: overlay.querySelector("[data-employee-evaluation-drawer-close]"),
    avatar: overlay.querySelector("[data-employee-evaluation-avatar]"),
    name: overlay.querySelector("[data-employee-evaluation-name]"),
    role: overlay.querySelector("[data-employee-evaluation-role]"),
    attendanceRecordsButton: overlay.querySelector("[data-employee-attendance-records-open]"),
    attendanceLeaveBadge: overlay.querySelector("[data-employee-attendance-leave-badge]"),
    attendanceRing: overlay.querySelector("[data-employee-evaluation-attendance-ring]"),
    attendancePerformance: overlay.querySelector("[data-employee-evaluation-attendance-performance]"),
    chatResponseMetric: overlay.querySelector("[data-employee-evaluation-chat-response-metric]"),
    chatResponseRing: overlay.querySelector("[data-employee-evaluation-chat-response-ring]"),
    chatResponseRate: overlay.querySelector("[data-employee-evaluation-chat-response-rate]"),
    ratingMetric: overlay.querySelector("[data-employee-evaluation-rating-metric]"),
    ratingScore: overlay.querySelector("[data-employee-evaluation-rating-score]"),
    ratingStars: overlay.querySelector("[data-employee-evaluation-rating-stars]"),
    ratingNote: overlay.querySelector("[data-employee-evaluation-rating-note]"),
  };

  refs.closeButton.addEventListener("click", () => {
    closeEmployeeEvaluationDrawer();
  });

  refs.avatar.addEventListener("click", () => {
    openEmployeeProfilePictureViewer(getSelectedEmployeeAccessAccount());
  });

  refs.attendanceRecordsButton.addEventListener("click", () => {
    openEmployeeAttendanceRecordsModal();
  });

  refs.ratingMetric.addEventListener("click", () => {
    openEmployeeEvaluationRatingModal();
  });

  refs.overlay.addEventListener("click", (event) => {
    if (event.target === refs.overlay) {
      closeEmployeeEvaluationDrawer();
    }
  });

  employeeEvaluationDrawerRefs = refs;
  return refs;
}

function syncEmployeeEvaluationDrawer() {
  if (!employeeEvaluationDrawerRefs) {
    return;
  }

  const account = getSelectedEmployeeAccessAccount();
  const evaluation = getEmployeeEvaluation(account);
  syncEmployeeDrawerAvatar(employeeEvaluationDrawerRefs.avatar, account, "EA");
  employeeEvaluationDrawerRefs.name.textContent = account ? getEmployeeDisplayName(account) : "Employee";
  employeeEvaluationDrawerRefs.role.textContent = evaluation.role;
  employeeEvaluationDrawerRefs.attendanceRecordsButton.disabled = !account;
  if (employeeEvaluationDrawerRefs.attendanceLeaveBadge) {
    employeeEvaluationDrawerRefs.attendanceLeaveBadge.hidden = !account || !hasEmployeePendingLeaveRequest(account);
  }
  employeeEvaluationDrawerRefs.attendancePerformance.textContent = evaluation.attendancePerformance;
  employeeEvaluationDrawerRefs.attendanceRing.style.setProperty(
    "--progress",
    String(evaluation.attendancePerformancePercent ?? 0),
  );
  employeeEvaluationDrawerRefs.attendanceRing.setAttribute(
    "aria-label",
    `Attendance Performance ${evaluation.attendancePerformance}`,
  );
  employeeEvaluationDrawerRefs.chatResponseMetric.hidden = !evaluation.showChatResponse;
  employeeEvaluationDrawerRefs.chatResponseRate.textContent = evaluation.chatResponseText;
  employeeEvaluationDrawerRefs.chatResponseRing.style.setProperty(
    "--progress",
    String(evaluation.chatResponsePercent ?? 0),
  );
  employeeEvaluationDrawerRefs.chatResponseRing.setAttribute(
    "aria-label",
    `Chat Response Rate ${evaluation.chatResponseText}`,
  );
  employeeEvaluationDrawerRefs.ratingMetric.hidden = !evaluation.showChatResponse;
  employeeEvaluationDrawerRefs.ratingScore.textContent = evaluation.chatRatingText;
  employeeEvaluationDrawerRefs.ratingStars.innerHTML = createEmployeeEvaluationRatingStarsMarkup(
    evaluation.chatRatingValue,
  );
  employeeEvaluationDrawerRefs.ratingStars.setAttribute(
    "aria-label",
    evaluation.chatRatingValue > 0
      ? `Employee Rating ${evaluation.chatRatingText}`
      : evaluation.chatRatingText,
  );
  employeeEvaluationDrawerRefs.ratingNote.textContent = evaluation.chatRatingNote;
  employeeEvaluationDrawerRefs.ratingMetric.classList.toggle(
    "is-muted",
    !(Number(evaluation.chatRatingValue) > 0),
  );
}

function openEmployeeEvaluationDrawer() {
  const account = getSelectedEmployeeAccessAccount();
  if (!account) {
    return;
  }

  const refs = createEmployeeEvaluationDrawer();
  if (employeeEvaluationDrawerCloseTimer) {
    window.clearTimeout(employeeEvaluationDrawerCloseTimer);
    employeeEvaluationDrawerCloseTimer = 0;
  }

  syncEmployeeEvaluationDrawer();
  if (hasEmployeeLiveChatAccess(account)) {
    void loadEmployeeEvaluationChatThreads({ force: true });
  }
  refs.overlay.hidden = false;
  refs.overlay.setAttribute("aria-hidden", "false");
  createEmployeeAccessFab().toggle.setAttribute("aria-expanded", "false");
  createEmployeeAccessFab().evaluationToggle.setAttribute("aria-expanded", "true");
  syncEmployeeDataModalOpenClass();

  window.requestAnimationFrame(() => {
    refs.overlay.classList.add("is-open");
    refs.closeButton.focus();
  });
}

function closeEmployeeEvaluationDrawer({ restoreFocus = true, immediate = false } = {}) {
  if (!employeeEvaluationDrawerRefs || employeeEvaluationDrawerRefs.overlay.hidden) {
    return;
  }

  const refs = employeeEvaluationDrawerRefs;
  if (employeeEvaluationDrawerCloseTimer) {
    window.clearTimeout(employeeEvaluationDrawerCloseTimer);
    employeeEvaluationDrawerCloseTimer = 0;
  }

  refs.overlay.classList.remove("is-open");
  refs.overlay.setAttribute("aria-hidden", "true");
  if (employeeAccessFabRefs) {
    employeeAccessFabRefs.evaluationToggle.setAttribute("aria-expanded", "false");
  }

  const finishClose = () => {
    refs.overlay.hidden = true;
    employeeEvaluationDrawerCloseTimer = 0;
    syncEmployeeDataModalOpenClass();
    if (restoreFocus && employeeAccessFabRefs && !employeeAccessFabRefs.fab.hidden) {
      employeeAccessFabRefs.evaluationToggle.focus();
    }
  };

  if (immediate) {
    finishClose();
    return;
  }

  employeeEvaluationDrawerCloseTimer = window.setTimeout(finishClose, 240);
}

function createEmployeeEvaluationRatingBreakdownMarkup(details) {
  return [5, 4, 3, 2, 1].map((rating) => {
    const count = details.counts[rating] || 0;
    const percentage = details.total > 0 ? Math.round((count / details.total) * 1000) / 10 : 0;
    return `
      <div class="employee-rating-modal__breakdown-row">
        <span class="employee-rating-modal__breakdown-label">${rating}</span>
        <span class="employee-rating-modal__breakdown-track">
          <span class="employee-rating-modal__breakdown-fill" style="width: ${percentage}%"></span>
        </span>
        <span class="employee-rating-modal__breakdown-count">${count}</span>
      </div>
    `;
  }).join("");
}

function createEmployeeEvaluationRatingCommentsMarkup(details) {
  if (details.isLoading) {
    return `<p class="employee-rating-modal__empty">Loading comments...</p>`;
  }

  if (details.entries.length === 0) {
    return `<p class="employee-rating-modal__empty">No rating comments yet.</p>`;
  }

  return details.entries.map((entry) => `
    <article class="employee-rating-comment">
      <div class="employee-rating-comment__header">
        <span class="employee-rating-comment__avatar" aria-hidden="true">${escapeEmployeeHtml(entry.avatarText)}</span>
        <div class="employee-rating-comment__identity">
          <strong>${escapeEmployeeHtml(entry.customerName)}</strong>
          <span>${escapeEmployeeHtml(entry.dateText)}</span>
        </div>
      </div>
      <div class="employee-rating-comment__rating-row">
        <span class="employee-rating-comment__score">${escapeEmployeeHtml(formatEmployeeEvaluationRatingScore(entry.rating))}</span>
        <span class="employee-rating-comment__stars employee-evaluation-rating-stars" aria-label="Rating ${escapeEmployeeHtml(formatEmployeeEvaluationRatingScore(entry.rating))}">
          ${createEmployeeEvaluationRatingStarsMarkup(entry.rating)}
        </span>
      </div>
      <p class="employee-rating-comment__copy">
        ${escapeEmployeeHtml(entry.comment || "No comment provided.")}
      </p>
    </article>
  `).join("");
}

function createEmployeeEvaluationRatingModal() {
  if (employeeEvaluationRatingModalRefs) {
    return employeeEvaluationRatingModalRefs;
  }

  const overlay = document.createElement("div");
  overlay.className = "employee-rating-modal-overlay";
  overlay.hidden = true;
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <section class="employee-rating-modal" role="dialog" aria-modal="true" aria-label="Employee rating details">
      <button type="button" class="employee-data-edit-modal__close employee-rating-modal__close" data-employee-rating-modal-close aria-label="Close employee rating modal">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
      <article class="employee-rating-modal__summary" aria-label="Employee rating summary">
        <strong class="employee-rating-modal__score" data-employee-rating-modal-score>Loading</strong>
        <span class="employee-rating-modal__stars employee-evaluation-rating-stars" data-employee-rating-modal-stars aria-label="Loading ratings">
          ${createEmployeeEvaluationRatingStarsMarkup(0)}
        </span>
        <span class="employee-rating-modal__total" data-employee-rating-modal-total>Loading reviews</span>
        <div class="employee-rating-modal__breakdown" data-employee-rating-modal-breakdown></div>
      </article>
      <section class="employee-rating-modal__comments-section" aria-label="Employee rating comments">
        <div class="employee-rating-modal__comments-heading">
          <strong data-employee-rating-modal-comments-title>Comments</strong>
        </div>
        <div class="employee-rating-modal__comments" data-employee-rating-modal-comments></div>
      </section>
    </section>
  `;

  document.body.appendChild(overlay);

  const refs = {
    overlay,
    modal: overlay.querySelector(".employee-rating-modal"),
    closeButton: overlay.querySelector("[data-employee-rating-modal-close]"),
    score: overlay.querySelector("[data-employee-rating-modal-score]"),
    stars: overlay.querySelector("[data-employee-rating-modal-stars]"),
    total: overlay.querySelector("[data-employee-rating-modal-total]"),
    breakdown: overlay.querySelector("[data-employee-rating-modal-breakdown]"),
    commentsTitle: overlay.querySelector("[data-employee-rating-modal-comments-title]"),
    comments: overlay.querySelector("[data-employee-rating-modal-comments]"),
  };

  refs.closeButton.addEventListener("click", () => {
    closeEmployeeEvaluationRatingModal();
  });

  refs.overlay.addEventListener("click", (event) => {
    if (event.target === refs.overlay) {
      closeEmployeeEvaluationRatingModal();
    }
  });

  employeeEvaluationRatingModalRefs = refs;
  return refs;
}

function renderEmployeeEvaluationRatingModal() {
  if (!employeeEvaluationRatingModalRefs) {
    return;
  }

  const details = getEmployeeEvaluationRatingDetails();
  const scoreLabel = details.averageRating > 0
    ? `Employee Rating ${details.scoreText}`
    : details.scoreText;

  employeeEvaluationRatingModalRefs.score.textContent = details.scoreText;
  employeeEvaluationRatingModalRefs.stars.innerHTML = createEmployeeEvaluationRatingStarsMarkup(details.averageRating);
  employeeEvaluationRatingModalRefs.stars.setAttribute("aria-label", scoreLabel);
  employeeEvaluationRatingModalRefs.total.textContent = details.totalText;
  employeeEvaluationRatingModalRefs.breakdown.innerHTML = createEmployeeEvaluationRatingBreakdownMarkup(details);
  employeeEvaluationRatingModalRefs.commentsTitle.textContent = details.isLoading
    ? "Comments"
    : `Comments (${details.entries.length})`;
  employeeEvaluationRatingModalRefs.comments.innerHTML = createEmployeeEvaluationRatingCommentsMarkup(details);
  employeeEvaluationRatingModalRefs.modal.classList.toggle("is-muted", !(details.averageRating > 0));
}

function openEmployeeEvaluationRatingModal() {
  const account = getSelectedEmployeeAccessAccount();
  if (!account || !hasEmployeeLiveChatAccess(account)) {
    return;
  }

  const refs = createEmployeeEvaluationRatingModal();
  if (employeeEvaluationRatingModalCloseTimer) {
    window.clearTimeout(employeeEvaluationRatingModalCloseTimer);
    employeeEvaluationRatingModalCloseTimer = 0;
  }

  renderEmployeeEvaluationRatingModal();
  if (!employeeEvaluationChatThreadsLoaded && !employeeEvaluationChatThreadsLoading) {
    void loadEmployeeEvaluationChatThreads({ force: true });
  }

  refs.overlay.hidden = false;
  refs.overlay.setAttribute("aria-hidden", "false");
  syncEmployeeDataModalOpenClass();

  window.requestAnimationFrame(() => {
    refs.overlay.classList.add("is-open");
    refs.closeButton.focus();
  });
}

function closeEmployeeEvaluationRatingModal({ restoreFocus = true, immediate = false } = {}) {
  if (!employeeEvaluationRatingModalRefs || employeeEvaluationRatingModalRefs.overlay.hidden) {
    return;
  }

  const refs = employeeEvaluationRatingModalRefs;
  if (employeeEvaluationRatingModalCloseTimer) {
    window.clearTimeout(employeeEvaluationRatingModalCloseTimer);
    employeeEvaluationRatingModalCloseTimer = 0;
  }

  refs.overlay.classList.remove("is-open");
  refs.overlay.setAttribute("aria-hidden", "true");

  const finishClose = () => {
    refs.overlay.hidden = true;
    employeeEvaluationRatingModalCloseTimer = 0;
    syncEmployeeDataModalOpenClass();
    if (
      restoreFocus
      && employeeEvaluationDrawerRefs
      && !employeeEvaluationDrawerRefs.overlay.hidden
      && employeeEvaluationDrawerRefs.ratingMetric
    ) {
      employeeEvaluationDrawerRefs.ratingMetric.focus();
    }
  };

  if (immediate) {
    finishClose();
    return;
  }

  employeeEvaluationRatingModalCloseTimer = window.setTimeout(finishClose, 180);
}

function createEmployeeAttendanceRecordsModal() {
  if (employeeAttendanceRecordsModalRefs) {
    return employeeAttendanceRecordsModalRefs;
  }

  const overlay = document.createElement("div");
  overlay.className = "employee-attendance-records-modal-overlay";
  overlay.hidden = true;
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <section class="employee-attendance-records-modal" role="dialog" aria-modal="true" aria-labelledby="employee-attendance-records-title">
      <div class="employee-attendance-records-modal__header">
        <div>
          <h2 id="employee-attendance-records-title">Attendance Records</h2>
          <p data-employee-attendance-records-employee>Employee</p>
        </div>
        <button type="button" class="employee-data-edit-modal__close employee-attendance-records-modal__close" data-employee-attendance-records-close aria-label="Close attendance records">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
      <div class="employee-attendance-records-modal__content">
        <article class="employee-attendance-calendar" aria-label="Attendance calendar">
          <div class="employee-attendance-calendar__header">
            <button type="button" class="employee-attendance-calendar__nav" data-employee-attendance-calendar-step="-1" aria-label="Previous month">
              <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
            </button>
            <strong class="employee-attendance-calendar__month" data-employee-attendance-calendar-month>Month Year</strong>
            <button type="button" class="employee-attendance-calendar__nav" data-employee-attendance-calendar-step="1" aria-label="Next month">
              <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
            </button>
          </div>
          <div class="employee-attendance-calendar__weekdays" aria-hidden="true">
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
            <span>Su</span>
          </div>
          <div class="employee-attendance-calendar__days" data-employee-attendance-calendar-days role="grid"></div>
          <div class="employee-attendance-calendar__actions">
            <button type="button" class="employee-attendance-calendar__today-button" data-employee-attendance-today>
              Today
            </button>
          </div>
          <div class="employee-attendance-calendar__legend" aria-label="Attendance status legend">
            <span><i class="employee-attendance-calendar__legend-dot is-present" aria-hidden="true"></i>Present</span>
            <span><i class="employee-attendance-calendar__legend-dot is-late" aria-hidden="true"></i>Late</span>
            <span><i class="employee-attendance-calendar__legend-dot is-absent" aria-hidden="true"></i>Absent</span>
            <span><i class="employee-attendance-calendar__legend-dot is-leave" aria-hidden="true"></i>Leave</span>
          </div>
        </article>
        <article class="employee-attendance-table-card" aria-label="Attendance table">
          <div class="employee-attendance-table-card__header">
            <h3 data-employee-attendance-table-title>Month Records</h3>
          </div>
          <div class="employee-attendance-table-shell">
            <table class="employee-attendance-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Time In</th>
                  <th>Time Out</th>
                </tr>
              </thead>
              <tbody data-employee-attendance-record-list></tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  `;

  document.body.appendChild(overlay);

  const refs = {
    overlay,
    modal: overlay.querySelector(".employee-attendance-records-modal"),
    closeButton: overlay.querySelector("[data-employee-attendance-records-close]"),
    employee: overlay.querySelector("[data-employee-attendance-records-employee]"),
    monthLabel: overlay.querySelector("[data-employee-attendance-calendar-month]"),
    days: overlay.querySelector("[data-employee-attendance-calendar-days]"),
    monthButtons: [...overlay.querySelectorAll("[data-employee-attendance-calendar-step]")],
    todayButton: overlay.querySelector("[data-employee-attendance-today]"),
    tableTitle: overlay.querySelector("[data-employee-attendance-table-title]"),
    recordList: overlay.querySelector("[data-employee-attendance-record-list]"),
  };

  refs.closeButton.addEventListener("click", () => {
    closeEmployeeAttendanceRecordsModal();
  });

  refs.overlay.addEventListener("click", (event) => {
    if (event.target === refs.overlay) {
      closeEmployeeAttendanceRecordsModal();
    }
  });

  refs.recordList.addEventListener("click", (event) => {
    const decisionButton = event.target.closest("[data-employee-leave-decision]");
    if (!decisionButton) {
      return;
    }

    decideEmployeeLeaveRequest(
      decisionButton.dataset.employeeLeaveRequestId,
      decisionButton.dataset.employeeLeaveDecision,
    );
    renderEmployeeAccountList();
    syncEmployeeAccessFab();
    syncEmployeeEvaluationDrawer();
    renderEmployeeAttendanceRecordsModal();
  });

  refs.days.addEventListener("click", (event) => {
    const dayButton = event.target.closest("[data-employee-attendance-date]");
    if (!dayButton || dayButton.disabled) {
      return;
    }

    employeeAttendanceSelectedDateKey = String(dayButton.dataset.employeeAttendanceDate || "").trim();
    renderEmployeeAttendanceRecordsModal();
  });

  refs.todayButton.addEventListener("click", () => {
    const today = new Date();
    employeeAttendanceCalendarMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    employeeAttendanceSelectedDateKey = getEmployeeAttendanceDateKey(today);
    renderEmployeeAttendanceRecordsModal();
  });

  refs.monthButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const monthStep = Number(button.dataset.employeeAttendanceCalendarStep);
      employeeAttendanceCalendarMonth = new Date(
        employeeAttendanceCalendarMonth.getFullYear(),
        employeeAttendanceCalendarMonth.getMonth() + (Number.isFinite(monthStep) ? monthStep : 0),
        1,
      );
      renderEmployeeAttendanceRecordsModal();
    });
  });

  employeeAttendanceRecordsModalRefs = refs;
  return refs;
}

function renderEmployeeAttendanceCalendar(summaries, leaveRequests = []) {
  if (!employeeAttendanceRecordsModalRefs) {
    return;
  }

  const refs = employeeAttendanceRecordsModalRefs;
  const statusByDate = new Map(summaries.map((summary) => [summary.dateKey, summary]));
  const leaveRequestByDate = new Map(
    leaveRequests
      .map((request) => [String(request?.dateKey ?? "").trim(), request])
      .filter(([dateKey]) => Boolean(dateKey)),
  );
  const todayKey = getEmployeeAttendanceDateKey(new Date());
  const year = employeeAttendanceCalendarMonth.getFullYear();
  const month = employeeAttendanceCalendarMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekdayOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayNodes = [];

  refs.monthLabel.textContent = employeeAttendanceCalendarMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  refs.todayButton.disabled = employeeAttendanceSelectedDateKey === todayKey
    && year === new Date().getFullYear()
    && month === new Date().getMonth();

  for (let index = 0; index < firstWeekdayOffset; index += 1) {
    dayNodes.push(`<span class="employee-attendance-calendar__blank-day" aria-hidden="true"></span>`);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const dateKey = getEmployeeAttendanceDateKey(date);
    const isFutureDate = isEmployeeAttendanceFutureDateKey(dateKey);
    const leaveRequest = leaveRequestByDate.get(dateKey);
    const leaveStatus = getEmployeeLeaveRequestStatus(leaveRequest);
    const summary = isFutureDate && !leaveRequest ? null : statusByDate.get(dateKey);
    const statusKey = leaveStatus === "approved"
      ? "leave"
      : leaveStatus === "pending"
      ? "leave-pending"
      : summary?.statusKey || "";
    const statusClass = statusKey ? ` is-${statusKey}` : "";
    const todayClass = dateKey === todayKey ? " is-today" : "";
    const futureClass = isFutureDate && !leaveRequest ? " is-future" : "";
    const selectedClass = (!isFutureDate || leaveRequest) && dateKey === employeeAttendanceSelectedDateKey ? " is-selected" : "";
    const label = leaveRequest
      ? `${formatEmployeeAttendanceDate(dateKey)} leave`
      : isFutureDate
      ? `${formatEmployeeAttendanceDate(dateKey)} not available yet`
      : summary
      ? `${formatEmployeeAttendanceDate(dateKey)} ${summary.statusLabel}`
      : formatEmployeeAttendanceDate(dateKey);

    dayNodes.push(`
      <button
        type="button"
        class="employee-attendance-calendar__day${statusClass}${todayClass}${futureClass}${selectedClass}"
        data-employee-attendance-date="${escapeEmployeeHtml(dateKey)}"
        aria-label="${escapeEmployeeHtml(label)}"
        aria-pressed="${dateKey === employeeAttendanceSelectedDateKey ? "true" : "false"}"
        title="${escapeEmployeeHtml(label)}"
        ${isFutureDate && !leaveRequest ? "disabled" : ""}
      >
        <span class="employee-attendance-calendar__day-number">${day}</span>
      </button>
    `);
  }

  refs.days.innerHTML = dayNodes.join("");
}

function renderEmployeeAttendanceRecordsTable(summary, selectedDateKey, leaveRequest = null) {
  if (!employeeAttendanceRecordsModalRefs) {
    return;
  }

  const refs = employeeAttendanceRecordsModalRefs;

  if (!selectedDateKey) {
    refs.recordList.innerHTML = `
      <tr class="employee-attendance-table__empty-row">
        <td colspan="3">Select a date to view attendance records.</td>
      </tr>
    `;
    return;
  }

  if (leaveRequest) {
    const leaveStatus = getEmployeeLeaveRequestStatus(leaveRequest);
    const statusLabel = "Leave";
    const statusClass = leaveStatus === "approved"
      ? "info"
      : leaveStatus === "declined"
      ? "error"
      : "error";
    const decisionMarkup = leaveStatus === "pending"
      ? `
        <div class="employee-leave-decision-actions">
          <button type="button" class="employee-leave-decision-button is-yes" data-employee-leave-decision="approved" data-employee-leave-request-id="${escapeEmployeeHtml(leaveRequest.id)}">Yes</button>
          <button type="button" class="employee-leave-decision-button is-no" data-employee-leave-decision="declined" data-employee-leave-request-id="${escapeEmployeeHtml(leaveRequest.id)}">No</button>
        </div>`
      : leaveStatus === "approved"
      ? "Approved"
      : "Cancel";

    refs.recordList.innerHTML = `
      <tr class="employee-leave-request-record is-${escapeEmployeeHtml(leaveStatus)}">
        <td>
          <span class="status-pill ${statusClass}">
            ${escapeEmployeeHtml(statusLabel)}
          </span>
        </td>
        <td>${escapeEmployeeHtml(leaveRequest.reason || "Schedule Leave")}</td>
        <td>${decisionMarkup}</td>
      </tr>
    `;
    return;
  }

  if (!summary) {
    refs.recordList.innerHTML = `
      <tr class="employee-attendance-table__empty-row">
        <td colspan="3">No attendance record for ${escapeEmployeeHtml(formatEmployeeAttendanceDate(selectedDateKey))}.</td>
      </tr>
    `;
    return;
  }

  refs.recordList.innerHTML = `
    <tr>
      <td>
        <span class="status-pill ${summary.statusPillClass}">
          ${escapeEmployeeHtml(summary.statusLabel)}
        </span>
      </td>
      <td>${escapeEmployeeHtml(summary.timeIn)}</td>
      <td>${escapeEmployeeHtml(summary.timeOut)}</td>
    </tr>
  `;
}

function renderEmployeeAttendanceRecordsModal() {
  if (!employeeAttendanceRecordsModalRefs) {
    return;
  }

  const account = getSelectedEmployeeAccessAccount();
  const refs = employeeAttendanceRecordsModalRefs;
  const summaries = getEmployeeAttendanceMonthSummaries(account, employeeAttendanceCalendarMonth);
  const leaveRequests = getEmployeeLeaveRequestsForAccount(account).filter((request) => {
    const requestDate = parseEmployeeAttendanceDateKey(request?.dateKey);
    return requestDate
      && requestDate.getFullYear() === employeeAttendanceCalendarMonth.getFullYear()
      && requestDate.getMonth() === employeeAttendanceCalendarMonth.getMonth();
  });
  employeeAttendanceSelectedDateKey = getEmployeeAttendanceSelectedDateKey(
    summaries,
    employeeAttendanceCalendarMonth,
    leaveRequests,
  );
  const selectedSummary = summaries.find(
    (summary) => summary.dateKey === employeeAttendanceSelectedDateKey,
  );
  const selectedLeaveRequest = leaveRequests.find(
    (request) => String(request?.dateKey ?? "").trim() === employeeAttendanceSelectedDateKey,
  ) || null;
  const role = formatText(account?.position, "No position");

  refs.employee.textContent = account
    ? `${getEmployeeDisplayName(account)} - ${role}`
    : "Employee";
  refs.tableTitle.textContent = employeeAttendanceSelectedDateKey
    ? formatEmployeeAttendanceDate(employeeAttendanceSelectedDateKey)
    : "No selectable date";

  renderEmployeeAttendanceCalendar(summaries, leaveRequests);
  renderEmployeeAttendanceRecordsTable(selectedSummary, employeeAttendanceSelectedDateKey, selectedLeaveRequest);
}

function openEmployeeAttendanceRecordsModal() {
  const account = getSelectedEmployeeAccessAccount();
  if (!account) {
    return;
  }

  const refs = createEmployeeAttendanceRecordsModal();
  if (employeeAttendanceRecordsCloseTimer) {
    window.clearTimeout(employeeAttendanceRecordsCloseTimer);
    employeeAttendanceRecordsCloseTimer = 0;
  }

  employeeAttendanceCalendarMonth = getEmployeeAttendanceInitialMonth(account);
  employeeAttendanceSelectedDateKey = "";
  renderEmployeeAttendanceRecordsModal();
  refs.overlay.hidden = false;
  refs.overlay.setAttribute("aria-hidden", "false");
  syncEmployeeDataModalOpenClass();

  window.requestAnimationFrame(() => {
    refs.overlay.classList.add("is-open");
    refs.closeButton.focus();
    refs.closeButton.focus();
  });
}

function closeEmployeeAttendanceRecordsModal({ restoreFocus = true, immediate = false } = {}) {
  if (!employeeAttendanceRecordsModalRefs || employeeAttendanceRecordsModalRefs.overlay.hidden) {
    return;
  }

  const refs = employeeAttendanceRecordsModalRefs;
  if (employeeAttendanceRecordsCloseTimer) {
    window.clearTimeout(employeeAttendanceRecordsCloseTimer);
    employeeAttendanceRecordsCloseTimer = 0;
  }

  refs.overlay.classList.remove("is-open");
  refs.overlay.setAttribute("aria-hidden", "true");

  const finishClose = () => {
    refs.overlay.hidden = true;
    employeeAttendanceRecordsCloseTimer = 0;
    syncEmployeeDataModalOpenClass();
    if (
      restoreFocus
      && employeeEvaluationDrawerRefs
      && !employeeEvaluationDrawerRefs.overlay.hidden
      && employeeEvaluationDrawerRefs.attendanceRecordsButton
    ) {
      employeeEvaluationDrawerRefs.attendanceRecordsButton.focus();
    }
  };

  if (immediate) {
    finishClose();
    return;
  }

  employeeAttendanceRecordsCloseTimer = window.setTimeout(finishClose, 180);
}

function createEmployeeAccessPermissionMarkup(item) {
  const iconMarkup = employeeAccessPermissionIconMarkup[item.key] || "";
  return `
    <label class="category-chip employee-access-option">
      <span class="employee-access-option__icon" aria-hidden="true">
        ${iconMarkup.trim()}
      </span>
      <span class="category-chip__main employee-access-option__copy">
        <span class="category-chip__name">${item.label}</span>
        <span class="category-chip__meta">${item.meta}</span>
      </span>
      <span class="employee-access-option__control">
        <input
          type="checkbox"
          value="${item.key}"
          data-employee-access-permission
        />
        <span class="employee-access-option__checkbox" aria-hidden="true">
          <i class="fa-solid fa-check" aria-hidden="true"></i>
        </span>
      </span>
    </label>
  `;
}

function syncEmployeeAccessDrawer() {
  if (!employeeAccessDrawerRefs) {
    return;
  }

  const account = getSelectedEmployeeAccessAccount();
  const permissionKeys = new Set(getEmployeeAccessPermissionKeys(account));
  const isLiveChatRequired = isAdminEmployeeAccount(account);
  syncEmployeeDrawerAvatar(employeeAccessDrawerRefs.avatar, account, "EA");
  employeeAccessDrawerRefs.name.textContent = account ? getEmployeeDisplayName(account) : "Employee";
  employeeAccessDrawerRefs.position.textContent = account
    ? String(account.position || "No position").trim()
    : "Position";
  employeeAccessDrawerRefs.permissionInputs.forEach((input) => {
    const isRequiredPermission = isLiveChatRequired && input.value === "live-chat";
    const isPackingOnlyPermission = input.value === "packing-dashboard";
    const isAvailablePermission = !isPackingOnlyPermission || isPackingEmployeeAccount(account);
    input.checked =
      (isAvailablePermission && permissionKeys.has(input.value)) || isRequiredPermission;
    input.disabled =
      employeeAccessGrantBusy || !account || isRequiredPermission || !isAvailablePermission;
    input.closest(".employee-access-option")?.classList.toggle(
      "is-required",
      isRequiredPermission,
    );
    input.closest(".employee-access-option")?.toggleAttribute("hidden", !isAvailablePermission);
  });
  employeeAccessDrawerRefs.saveButton.disabled = employeeAccessGrantBusy || !account;
}

function setEmployeeAccessFeedback(message = "", mode = "") {
  if (!employeeAccessDrawerRefs) {
    return;
  }

  employeeAccessDrawerRefs.feedback.textContent = message;
  employeeAccessDrawerRefs.feedback.className = "employee-access-drawer__feedback";
  if (mode) {
    employeeAccessDrawerRefs.feedback.classList.add(`is-${mode}`);
  }
}

function getCheckedEmployeeAccessPermissionKeys() {
  if (!employeeAccessDrawerRefs) {
    return [];
  }

  const account = getSelectedEmployeeAccessAccount();
  const checkedKeys = employeeAccessDrawerRefs.permissionInputs
    .filter((input) => input.checked)
    .map((input) => input.value)
    .filter((key, index, keys) =>
      employeeAccessPermissionKeys.has(key) && keys.indexOf(key) === index,
    );

  return ensureRequiredEmployeeAccessPermissionKeys(checkedKeys, account);
}

function openEmployeeAccessDrawer() {
  const account = getSelectedEmployeeAccessAccount();
  if (!account) {
    return;
  }

  const refs = createEmployeeAccessDrawer();
  if (employeeAccessDrawerCloseTimer) {
    window.clearTimeout(employeeAccessDrawerCloseTimer);
    employeeAccessDrawerCloseTimer = 0;
  }

  syncEmployeeAccessDrawer();
  setEmployeeAccessFeedback();
  refs.overlay.hidden = false;
  refs.overlay.setAttribute("aria-hidden", "false");
  createEmployeeAccessFab().toggle.setAttribute("aria-expanded", "true");
  createEmployeeAccessFab().evaluationToggle.setAttribute("aria-expanded", "false");
  syncEmployeeDataModalOpenClass();

  window.requestAnimationFrame(() => {
    refs.overlay.classList.add("is-open");
    refs.closeButton.focus();
  });
}

function closeEmployeeAccessDrawer({ restoreFocus = true, immediate = false } = {}) {
  if (!employeeAccessDrawerRefs || employeeAccessDrawerRefs.overlay.hidden) {
    return;
  }

  const refs = employeeAccessDrawerRefs;
  if (employeeAccessDrawerCloseTimer) {
    window.clearTimeout(employeeAccessDrawerCloseTimer);
    employeeAccessDrawerCloseTimer = 0;
  }

  refs.overlay.classList.remove("is-open");
  refs.overlay.setAttribute("aria-hidden", "true");
  if (employeeAccessFabRefs) {
    employeeAccessFabRefs.toggle.setAttribute("aria-expanded", "false");
  }

  const finishClose = () => {
    refs.overlay.hidden = true;
    employeeAccessDrawerCloseTimer = 0;
    syncEmployeeDataModalOpenClass();
    if (restoreFocus && employeeAccessFabRefs && !employeeAccessFabRefs.fab.hidden) {
      employeeAccessFabRefs.toggle.focus();
    }
  };

  if (immediate) {
    finishClose();
    return;
  }

  employeeAccessDrawerCloseTimer = window.setTimeout(finishClose, 240);
}

function setEmployeeAccessGrantBusy(isBusy) {
  const refs = createEmployeeAccessFab();
  employeeAccessGrantBusy = Boolean(isBusy);
  refs.toggle.disabled = employeeAccessGrantBusy;
  refs.evaluationToggle.disabled = employeeAccessGrantBusy || !getSelectedEmployeeAccessAccount();
  syncEmployeeAccessDrawer();
}

function isEmployeeDataSettingsMenuOpen() {
  return Array.from(document.querySelectorAll("[data-settings-dropdown]")).some((dropdown) =>
    dropdown instanceof HTMLElement && !dropdown.hidden,
  );
}

function isEmployeeDataDrawerOpen() {
  return Boolean(
    (employeeAccessDrawerRefs && !employeeAccessDrawerRefs.overlay.hidden)
      || (employeeEvaluationDrawerRefs && !employeeEvaluationDrawerRefs.overlay.hidden),
  );
}

function getOpenEmployeeDataDrawer() {
  if (employeeAccessDrawerRefs && !employeeAccessDrawerRefs.overlay.hidden) {
    return employeeAccessDrawerRefs.drawer;
  }

  if (employeeEvaluationDrawerRefs && !employeeEvaluationDrawerRefs.overlay.hidden) {
    return employeeEvaluationDrawerRefs.drawer;
  }

  return null;
}

function getScrollableEmployeeDrawerElement(event, drawer) {
  const path = typeof event?.composedPath === "function" ? event.composedPath() : [];
  const candidates = Array.isArray(path) && path.length
    ? path
    : [event?.target];

  for (const candidate of candidates) {
    if (!(candidate instanceof HTMLElement) || !drawer.contains(candidate)) {
      continue;
    }

    const style = window.getComputedStyle(candidate);
    const canScrollY = /(auto|scroll)/.test(style.overflowY)
      && candidate.scrollHeight > candidate.clientHeight;
    if (canScrollY) {
      return candidate;
    }
  }

  return drawer.scrollHeight > drawer.clientHeight ? drawer : null;
}

function canScrollEmployeeDrawer(event, drawer) {
  if (!(event instanceof WheelEvent)) {
    return false;
  }

  const scrollable = getScrollableEmployeeDrawerElement(event, drawer);
  if (!scrollable || !event.deltaY) {
    return false;
  }

  const maxScrollTop = scrollable.scrollHeight - scrollable.clientHeight;
  if (maxScrollTop <= 0) {
    return false;
  }

  return event.deltaY > 0
    ? scrollable.scrollTop < maxScrollTop
    : scrollable.scrollTop > 0;
}

function blockEmployeeDrawerBackgroundScroll(event) {
  const drawer = getOpenEmployeeDataDrawer();
  if (!drawer) {
    return;
  }

  if (event.type === "touchmove" && event.target instanceof Node && drawer.contains(event.target)) {
    return;
  }

  if (event.target instanceof Node && drawer.contains(event.target) && canScrollEmployeeDrawer(event, drawer)) {
    return;
  }

  event.preventDefault();
}

function blockEmployeeDrawerBackgroundKeyScroll(event) {
  const drawer = getOpenEmployeeDataDrawer();
  if (
    !drawer
    || (event.target instanceof Node && drawer.contains(event.target))
    || !employeeDrawerScrollLockKeys.has(event.key)
  ) {
    return;
  }

  event.preventDefault();
}

function handleEmployeeDataSettingsControlsState() {
  if (!employeeAccessFabRefs) {
    return;
  }

  if (!isEmployeeDataSettingsMenuOpen()) {
    if (isEmployeeDataDrawerOpen()) {
      return;
    }
    syncEmployeeAccessFab();
    return;
  }

  employeeAccessFabRefs.fab.hidden = true;
  closeEmployeeAccessDrawer({ restoreFocus: false, immediate: true });
  closeEmployeeEvaluationDrawer({ restoreFocus: false, immediate: true });
}

function setupEmployeeDataSettingsControlsObserver() {
  if (employeeDataSettingsControlsObserver) {
    return;
  }

  const syncSoon = () => {
    window.setTimeout(handleEmployeeDataSettingsControlsState, 0);
  };
  employeeDataSettingsControlsObserver = new MutationObserver(syncSoon);
  document.querySelectorAll("[data-settings-dropdown]").forEach((dropdown) => {
    employeeDataSettingsControlsObserver.observe(dropdown, {
      attributes: true,
      attributeFilter: ["hidden"],
    });
  });
  document.querySelectorAll("[data-settings-toggle], [data-settings-close]").forEach((control) => {
    control.addEventListener("click", syncSoon);
  });
  document.addEventListener("click", (event) => {
    if (event.target?.closest?.(".employee-access-drawer-overlay")) {
      return;
    }
    syncSoon();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      syncSoon();
    }
  });
  syncSoon();
}

function syncEmployeeAccessFab() {
  const refs = createEmployeeAccessFab();
  const account = getSelectedEmployeeAccessAccount();
  const shouldHideForSettings = isEmployeeDataSettingsMenuOpen();

  refs.fab.hidden = !account || shouldHideForSettings;
  refs.toggle.disabled = employeeAccessGrantBusy || !account || shouldHideForSettings;
  refs.evaluationToggle.disabled = employeeAccessGrantBusy || !account || shouldHideForSettings;
  if (refs.evaluationLeaveBadge) {
    refs.evaluationLeaveBadge.hidden = !account || !hasEmployeePendingLeaveRequest(account);
  }
  if (!account || shouldHideForSettings) {
    closeEmployeeAccessDrawer({ restoreFocus: false, immediate: true });
    closeEmployeeEvaluationDrawer({ restoreFocus: false, immediate: true });
    return;
  }

  syncEmployeeAccessDrawer();
  syncEmployeeEvaluationDrawer();
  if (
    employeeEvaluationDrawerRefs
    && !employeeEvaluationDrawerRefs.overlay.hidden
    && hasEmployeeLiveChatAccess(account)
  ) {
    void loadEmployeeEvaluationChatThreads();
  }
}

function animateEmployeeAccessFabEntrance() {
  const refs = createEmployeeAccessFab();
  if (refs.fab.hidden) {
    return;
  }

  refs.fab.classList.remove("is-slide-left");
  void refs.fab.offsetWidth;
  refs.fab.classList.add("is-slide-left");
}

function selectEmployeeAccessAccount(account) {
  const accountId = getEmployeeAccountId(account);
  if (!accountId) {
    return;
  }

  selectedEmployeeAccessAccountId =
    selectedEmployeeAccessAccountId === accountId ? "" : accountId;

  userAccountList
    .querySelectorAll("[data-employee-account-id]")
    .forEach((row) => {
      row.classList.toggle(
        "is-selected",
        row.dataset.employeeAccountId === selectedEmployeeAccessAccountId,
      );
  });

  syncEmployeeAccessFab();
  if (selectedEmployeeAccessAccountId) {
    animateEmployeeAccessFabEntrance();
  }
}

async function saveSelectedEmployeeAccess() {
  const account = getSelectedEmployeeAccessAccount();
  if (!account || employeeAccessGrantBusy) {
    return;
  }

  const accessPermissions = getCheckedEmployeeAccessPermissionKeys();
  const timeIn = String(account.timeIn ?? "").trim() || "09:00";
  const timeOut = String(account.timeOut ?? "").trim() || computeTimeOutValue(timeIn);
  setEmployeeAccessGrantBusy(true);
  setEmployeeAccessFeedback("Saving access...");

  try {
    const response = await fetch("/api/accounts", {
      method: "PUT",
      headers: withEmployeeDataAdminHeaders({
        "Content-Type": "application/json",
        Accept: "application/json",
      }),
      body: JSON.stringify({
        id: getEmployeeAccountId(account),
        accessPermissions,
        accessPermissionsConfigured: true,
        timeIn,
        timeOut,
        firstName: String(account.firstName ?? "").trim(),
        middleName: String(account.middleName ?? "").trim(),
        lastName: String(account.lastName ?? "").trim(),
        suffix: String(account.suffix ?? "").trim(),
        email: String(account.email ?? "").trim(),
        address: String(account.address ?? "").trim(),
        countryCode: String(account.countryCode ?? "").trim() || "+63",
        mobileNumber: normalizeEmployeePhone(account.mobileNumber),
        profileImageUrl: getEmployeeProfileImageUrl(account),
        source: "web",
      }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Unable to give access.");
    }

    await loadAccounts();
    try {
      window.localStorage?.setItem(
        employeeAccessUpdatedStorageKey,
        JSON.stringify({
          accountId: getEmployeeAccountId(account),
          updatedAt: Date.now(),
        }),
      );
    } catch (error) {
      // Ignore storage sync failures; the saved access still persists on the server.
    }
    setEmployeeAccessFeedback();
    closeEmployeeAccessDrawer({ restoreFocus: false });
    window.setTimeout(() => {
      openEmployeeDataSuccessModal("Access saved successfully.");
    }, 260);
  } catch (error) {
    setEmployeeAccessFeedback(
      error instanceof Error ? error.message : "Unable to give access.",
      "error",
    );
  } finally {
    setEmployeeAccessGrantBusy(false);
  }
}

function syncEmployeeEditTimeOut() {
  if (!employeeEditModalRefs) {
    return;
  }

  const timeOutValue = computeTimeOutValue(employeeEditModalRefs.timeIn.value);
  employeeEditModalRefs.timeOut.value = timeOutValue ? formatScheduleTime(timeOutValue) : "";
  employeeEditModalRefs.timeOutHidden.value = timeOutValue;
}

function setEmployeeEditFeedback(message = "", mode = "") {
  if (!employeeEditModalRefs) {
    return;
  }

  employeeEditModalRefs.feedback.textContent = message;
  employeeEditModalRefs.feedback.className = "feedback-note employee-data-edit-modal__feedback";
  if (mode) {
    employeeEditModalRefs.feedback.classList.add(`is-${mode}`);
  }
}

function setEmployeeEditPasswordInvalid(input, isInvalid = false) {
  const fieldShell = input?.closest?.(".password-field");
  if (!fieldShell) {
    return;
  }

  fieldShell.classList.toggle("is-invalid", Boolean(isInvalid));
  if (isInvalid) {
    input?.setAttribute?.("aria-invalid", "true");
    return;
  }

  input?.removeAttribute?.("aria-invalid");
}

function clearEmployeeEditPasswordInvalid(refs = employeeEditModalRefs) {
  if (!refs) {
    return;
  }

  setEmployeeEditPasswordInvalid(refs.password, false);
  setEmployeeEditPasswordInvalid(refs.confirmPassword, false);
}

function normalizeEmployeeEditPosition(value) {
  if (window.GMSEmployeePositions?.normalize) {
    return window.GMSEmployeePositions.normalize(value);
  }

  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
}

function loadEmployeeEditPositions(extraPosition = "") {
  const positions = Array.isArray(window.GMSEmployeePositions?.load?.())
    ? window.GMSEmployeePositions.load()
    : ["Packing", "Admin Employee"];
  const normalizedPositions = [];
  const seen = new Set();

  [...positions, extraPosition].forEach((value) => {
    const position = normalizeEmployeeEditPosition(value);
    const key = position.toLowerCase();
    if (position.length < 2 || seen.has(key)) {
      return;
    }

    seen.add(key);
    normalizedPositions.push(position);
  });

  return normalizedPositions;
}

function renderEmployeeEditPositionOptions(options = {}) {
  if (!employeeEditModalRefs) {
    return;
  }

  const refs = employeeEditModalRefs;
  const currentValue = normalizeEmployeeEditPosition(refs.position.value);
  const positions = loadEmployeeEditPositions(options.includeCurrent ? currentValue : "");
  refs.positionMenu.replaceChildren();

  const placeholder = document.createElement("button");
  placeholder.type = "button";
  placeholder.className =
    "product-category-multiselect__option product-category-multiselect__option--placeholder";
  placeholder.dataset.positionValue = "";
  placeholder.setAttribute("role", "option");
  placeholder.setAttribute("aria-selected", "true");
  placeholder.textContent = "Select position";
  refs.positionMenu.appendChild(placeholder);

  positions.forEach((position) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "product-category-multiselect__option";
    option.dataset.positionValue = position;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", "false");
    option.textContent = position;
    refs.positionMenu.appendChild(option);
  });

  refs.positionOptions = Array.from(
    refs.positionMenu.querySelectorAll("[data-position-value]"),
  );
  syncEmployeeEditPositionDropdown();
}

function syncEmployeeEditPositionDropdown() {
  if (!employeeEditModalRefs) {
    return;
  }

  const refs = employeeEditModalRefs;
  const selectedValue = refs.position.value.trim();
  const selectedOption = refs.positionOptions.find(
    (option) => option.dataset.positionValue === selectedValue,
  );
  const selectedLabel = selectedOption?.textContent?.trim() || "Select position";

  refs.positionSummary.textContent = selectedLabel;
  refs.positionSummary.classList.toggle("is-placeholder", !selectedValue);
  refs.positionOptions.forEach((option) => {
    const isSelected = option === selectedOption;
    option.classList.toggle("is-selected", isSelected);
    option.setAttribute("aria-selected", isSelected ? "true" : "false");
  });
}

function closeEmployeeEditPositionDropdown() {
  if (!employeeEditModalRefs) {
    return;
  }

  employeeEditModalRefs.positionDropdown.classList.remove("is-open");
  employeeEditModalRefs.positionTrigger.setAttribute("aria-expanded", "false");
  employeeEditModalRefs.positionMenu.hidden = true;
}

function openEmployeeEditPositionDropdown() {
  const refs = getEmployeeEditModalRefs();
  refs.positionDropdown.classList.add("is-open");
  refs.positionTrigger.setAttribute("aria-expanded", "true");
  refs.positionMenu.hidden = false;
  closeEmployeeEditTimeInDropdown();
}

function setEmployeeEditPosition(value) {
  const refs = getEmployeeEditModalRefs();
  refs.position.value = value;
  syncEmployeeEditPositionDropdown();
}

function syncEmployeeEditTimeInDropdown() {
  if (!employeeEditModalRefs) {
    return;
  }

  const refs = employeeEditModalRefs;
  const selectedValue = refs.timeIn.value.trim();
  const selectedOption = refs.timeInOptions.find(
    (option) => option.dataset.timeInValue === selectedValue,
  );
  const selectedLabel = selectedOption?.textContent?.trim() || "Select time";

  refs.timeInSummary.textContent = selectedLabel;
  refs.timeInSummary.classList.toggle("is-placeholder", !selectedValue);
  refs.timeInOptions.forEach((option) => {
    const isSelected = option === selectedOption;
    option.classList.toggle("is-selected", isSelected);
    option.setAttribute("aria-selected", isSelected ? "true" : "false");
  });
}

function closeEmployeeEditTimeInDropdown() {
  if (!employeeEditModalRefs) {
    return;
  }

  employeeEditModalRefs.timeInDropdown.classList.remove("is-open");
  employeeEditModalRefs.timeInTrigger.setAttribute("aria-expanded", "false");
  employeeEditModalRefs.timeInMenu.hidden = true;
}

function openEmployeeEditTimeInDropdown() {
  const refs = getEmployeeEditModalRefs();
  refs.timeInDropdown.classList.add("is-open");
  refs.timeInTrigger.setAttribute("aria-expanded", "true");
  refs.timeInMenu.hidden = false;
  closeEmployeeEditPositionDropdown();
}

function setEmployeeEditTimeIn(value) {
  const refs = getEmployeeEditModalRefs();
  refs.timeIn.value = value;
  syncEmployeeEditTimeInDropdown();
  syncEmployeeEditTimeOut();
}

function closeEmployeeEditDropdowns() {
  closeEmployeeEditPositionDropdown();
  closeEmployeeEditTimeInDropdown();
}

function getEmployeeEditPasswordToggleIcon(isVisible) {
  if (isVisible) {
    return `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 12C2 12 5.63636 5 12 5C18.3636 5 22 12 22 12C22 12 18.3636 19 12 19C5.63636 19 2 12 2 12Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="12" cy="12" r="3" stroke-width="2"/>
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 2L22 22" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M6.71277 6.7226C3.66479 8.79527 2 12 2 12C2 12 5.63636 19 12 19C14.0503 19 15.8174 18.2734 17.2711 17.2884M11 5.05822C11.3254 5.02013 11.6588 5 12 5C18.3636 5 22 12 22 12C22 12 21.3082 13.3317 20 14.8335" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M14 14.2362C13.4692 14.7112 12.7684 15.0001 12 15.0001C10.3431 15.0001 9 13.657 9 12.0001C9 11.1764 9.33193 10.4303 9.86932 9.88818" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
}

function syncEmployeeEditPasswordToggle(button, input) {
  const isVisible = input.type === "text";
  button.innerHTML = getEmployeeEditPasswordToggleIcon(isVisible);
  button.classList.toggle("is-visible", isVisible);
  button.setAttribute("aria-label", isVisible ? "Hide password" : "Show password");
  button.setAttribute("title", isVisible ? "Hide password" : "Show password");
  button.setAttribute("aria-pressed", isVisible ? "true" : "false");
}

function initializeEmployeeEditPasswordToggle(button, input) {
  syncEmployeeEditPasswordToggle(button, input);
  button.addEventListener("click", () => {
    input.type = input.type === "password" ? "text" : "password";
    syncEmployeeEditPasswordToggle(button, input);
    input.focus({ preventScroll: true });
    const valueLength = input.value.length;
    if (typeof input.setSelectionRange === "function") {
      input.setSelectionRange(valueLength, valueLength);
    }
  });
}

function createEmployeeEditModal() {
  const overlay = document.createElement("div");
  overlay.className = "employee-data-edit-modal-overlay";
  overlay.hidden = true;

  overlay.innerHTML = `
    <section class="employee-data-edit-modal" role="dialog" aria-modal="true" aria-labelledby="employee-data-edit-title">
      <div class="employee-data-edit-modal__header">
        <div>
          <h2 id="employee-data-edit-title">Edit Employee</h2>
          <p>Update employee details and schedule.</p>
        </div>
        <button
          type="button"
          class="product-gallery-modal__close employee-data-edit-modal__close"
          aria-label="Close edit modal"
          title="Close edit modal"
        >
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
      <form class="product-form register-form-panel__form employee-data-edit-modal__form" novalidate>
        <div class="form-grid register-employment-grid">
          <label>
            Employee ID
            <input
              name="employeeId"
              type="text"
              placeholder="GMS-012345"
              autocomplete="off"
              readonly
            />
          </label>
          <label>
            Position
            <input name="position" type="hidden" autocomplete="organization-title" />
            <div class="product-category-multiselect product-panel-grid__inventory-category-filter" data-employee-edit-position-dropdown>
              <button
                type="button"
                class="product-category-multiselect__trigger"
                aria-haspopup="listbox"
                aria-expanded="false"
              >
                <span class="product-category-multiselect__summary" data-employee-edit-position-summary>
                  Select position
                </span>
                <span class="product-panel-grid__inventory-category-filter-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="m6.5 9.5 5.5 5 5.5-5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </span>
              </button>
              <div class="product-category-multiselect__menu" role="listbox" hidden data-employee-edit-position-menu>
                <button type="button" class="product-category-multiselect__option product-category-multiselect__option--placeholder" data-position-value="" role="option" aria-selected="true">Select position</button>
                <button type="button" class="product-category-multiselect__option" data-position-value="Packing" role="option" aria-selected="false">Packing</button>
                <button type="button" class="product-category-multiselect__option" data-position-value="Admin Employee" role="option" aria-selected="false">Admin Employee</button>
              </div>
            </div>
          </label>
          <label>
            Time In
            <input name="timeIn" type="hidden" />
            <div class="register-time-dropdown" data-employee-edit-time-in-dropdown>
              <button
                type="button"
                class="register-time-dropdown__trigger"
                aria-haspopup="listbox"
                aria-expanded="false"
              >
                <span class="register-time-dropdown__summary is-placeholder" data-employee-edit-time-in-summary>
                  Select time
                </span>
                <span class="register-time-dropdown__chevron" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="m6.5 9.5 5.5 5 5.5-5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </span>
              </button>
              <div class="register-time-dropdown__menu" role="listbox" hidden data-employee-edit-time-in-menu>
                <button type="button" class="register-time-dropdown__item" data-time-in-value="" role="option" aria-selected="true">Select time</button>
                <button type="button" class="register-time-dropdown__item" data-time-in-value="06:00" role="option" aria-selected="false">6:00 AM</button>
                <button type="button" class="register-time-dropdown__item" data-time-in-value="07:00" role="option" aria-selected="false">7:00 AM</button>
                <button type="button" class="register-time-dropdown__item" data-time-in-value="08:00" role="option" aria-selected="false">8:00 AM</button>
                <button type="button" class="register-time-dropdown__item" data-time-in-value="09:00" role="option" aria-selected="false">9:00 AM</button>
                <button type="button" class="register-time-dropdown__item" data-time-in-value="10:00" role="option" aria-selected="false">10:00 AM</button>
                <button type="button" class="register-time-dropdown__item" data-time-in-value="11:00" role="option" aria-selected="false">11:00 AM</button>
                <button type="button" class="register-time-dropdown__item" data-time-in-value="12:00" role="option" aria-selected="false">12:00 PM</button>
              </div>
            </div>
          </label>
          <label>
            Time Out
            <input name="timeOutDisplay" type="text" placeholder="Auto time out" readonly />
            <input name="timeOut" type="hidden" />
          </label>
        </div>

        <div class="form-grid register-name-grid">
          <label class="register-applicant-name-shell">
            First Name
            <input name="firstName" type="text" placeholder="Juan" autocomplete="given-name" />
            <span class="register-applicant-name-status"></span>
          </label>
          <label>
            Middle Name (Optional)
            <input name="middleName" type="text" placeholder="Santos" autocomplete="additional-name" />
          </label>
          <label>
            Last Name
            <input name="lastName" type="text" placeholder="Dela Cruz" autocomplete="family-name" />
          </label>
          <label class="register-name-grid__suffix">
            Suffix
            <input name="suffix" type="text" placeholder="Jr." autocomplete="honorific-suffix" />
          </label>
        </div>

        <div class="form-grid">
          <label>
            Email Address
            <input name="email" type="email" placeholder="employee@example.com" autocomplete="email" />
          </label>
          <label>
            Phone Number
            <div class="register-phone-field">
              <span class="register-phone-field__prefix">+63</span>
              <input
                name="mobileNumber"
                type="tel"
                placeholder="9123456789"
                autocomplete="tel-national"
                inputmode="numeric"
                maxlength="10"
              />
              <span class="register-phone-field__status"></span>
            </div>
            <p class="register-phone-validation" aria-live="polite"></p>
          </label>
        </div>

        <label>
          Address
          <input name="address" type="text" placeholder="Enter full address" autocomplete="street-address" />
        </label>

        <div class="form-grid">
          <label>
            Password
            <div class="password-field">
              <input name="password" type="password" placeholder="Enter your password" autocomplete="new-password" />
              <button type="button" class="password-field__toggle" aria-controls="employee-edit-password">Show</button>
            </div>
          </label>

          <label>
            Confirm Password
            <div class="password-field">
              <input name="confirmPassword" type="password" placeholder="Confirm your password" autocomplete="new-password" />
              <button type="button" class="password-field__toggle" aria-controls="employee-edit-confirm-password">Show</button>
            </div>
          </label>
        </div>

        <div class="form-actions register-form-panel__actions employee-data-edit-modal__actions">
          <button
            type="button"
            class="ghost-button validation-modal__action-button validation-modal__action-button--secondary"
            data-employee-edit-cancel
          >
            Cancel
          </button>
          <button type="submit">Save</button>
        </div>

        <p class="feedback-note employee-data-edit-modal__feedback" aria-live="polite"></p>
      </form>
    </section>
  `;

  document.body.appendChild(overlay);
  window.WebTheme?.applyFontAwesomeIcons?.(overlay);

  const form = overlay.querySelector(".employee-data-edit-modal__form");
  const closeButton = overlay.querySelector(".employee-data-edit-modal__close");
  const cancelButton = overlay.querySelector("[data-employee-edit-cancel]");
  const refs = {
    overlay,
    form,
    closeButton,
    cancelButton,
    feedback: overlay.querySelector(".employee-data-edit-modal__feedback"),
    submitButton: form.querySelector('button[type="submit"]'),
    employeeId: form.elements.employeeId,
    position: form.elements.position,
    positionDropdown: overlay.querySelector("[data-employee-edit-position-dropdown]"),
    positionTrigger: overlay.querySelector("[data-employee-edit-position-dropdown] .product-category-multiselect__trigger"),
    positionSummary: overlay.querySelector("[data-employee-edit-position-summary]"),
    positionMenu: overlay.querySelector("[data-employee-edit-position-menu]"),
    positionOptions: Array.from(overlay.querySelectorAll("[data-employee-edit-position-menu] [data-position-value]")),
    timeIn: form.elements.timeIn,
    timeInDropdown: overlay.querySelector("[data-employee-edit-time-in-dropdown]"),
    timeInTrigger: overlay.querySelector("[data-employee-edit-time-in-dropdown] .register-time-dropdown__trigger"),
    timeInSummary: overlay.querySelector("[data-employee-edit-time-in-summary]"),
    timeInMenu: overlay.querySelector("[data-employee-edit-time-in-menu]"),
    timeInOptions: Array.from(overlay.querySelectorAll("[data-employee-edit-time-in-menu] [data-time-in-value]")),
    timeOut: form.elements.timeOutDisplay,
    timeOutHidden: form.elements.timeOut,
    firstName: form.elements.firstName,
    middleName: form.elements.middleName,
    lastName: form.elements.lastName,
    suffix: form.elements.suffix,
    email: form.elements.email,
    address: form.elements.address,
    mobileNumber: form.elements.mobileNumber,
    password: form.elements.password,
    confirmPassword: form.elements.confirmPassword,
    passwordToggle: form.elements.password.parentElement.querySelector(".password-field__toggle"),
    confirmPasswordToggle: form.elements.confirmPassword.parentElement.querySelector(".password-field__toggle"),
  };

  refs.password.id = "employee-edit-password";
  refs.confirmPassword.id = "employee-edit-confirm-password";
  refs.passwordToggle.setAttribute("aria-controls", refs.password.id);
  refs.confirmPasswordToggle.setAttribute("aria-controls", refs.confirmPassword.id);

  refs.positionTrigger.addEventListener("click", () => {
    if (refs.positionMenu.hidden) {
      renderEmployeeEditPositionOptions({ includeCurrent: true });
      openEmployeeEditPositionDropdown();
      return;
    }

    closeEmployeeEditPositionDropdown();
  });
  refs.positionMenu.addEventListener("click", (event) => {
    const option = event.target?.closest?.("[data-position-value]");
    if (!option || !refs.positionMenu.contains(option)) {
      return;
    }

    setEmployeeEditPosition(option.dataset.positionValue ?? "");
    closeEmployeeEditPositionDropdown();
    refs.positionTrigger.focus();
  });
  refs.timeInTrigger.addEventListener("click", () => {
    if (refs.timeInMenu.hidden) {
      openEmployeeEditTimeInDropdown();
      return;
    }

    closeEmployeeEditTimeInDropdown();
  });
  refs.timeInOptions.forEach((option) => {
    option.addEventListener("click", () => {
      setEmployeeEditTimeIn(option.dataset.timeInValue ?? "");
      closeEmployeeEditTimeInDropdown();
      refs.timeInTrigger.focus();
    });
  });
  refs.mobileNumber.addEventListener("input", () => {
    refs.mobileNumber.value = normalizeEmployeePhone(refs.mobileNumber.value);
  });
  refs.password.addEventListener("input", () => {
    clearEmployeeEditPasswordInvalid(refs);
  });
  refs.confirmPassword.addEventListener("input", () => {
    clearEmployeeEditPasswordInvalid(refs);
  });
  initializeEmployeeEditPasswordToggle(refs.passwordToggle, refs.password);
  initializeEmployeeEditPasswordToggle(refs.confirmPasswordToggle, refs.confirmPassword);
  refs.closeButton.addEventListener("click", closeEmployeeEditModal);
  refs.cancelButton.addEventListener("click", closeEmployeeEditModal);
  refs.overlay.addEventListener("click", (event) => {
    if (event.target === refs.overlay) {
      closeEmployeeEditModal();
      return;
    }

    if (!refs.positionDropdown.contains(event.target)) {
      closeEmployeeEditPositionDropdown();
    }

    if (!refs.timeInDropdown.contains(event.target)) {
      closeEmployeeEditTimeInDropdown();
    }
  });
  refs.form.addEventListener("submit", (event) => {
    event.preventDefault();
    void saveEmployeeEdit();
  });

  return refs;
}

function getEmployeeEditModalRefs() {
  if (!employeeEditModalRefs) {
    employeeEditModalRefs = createEmployeeEditModal();
  }

  return employeeEditModalRefs;
}

function openEmployeeEditModal(account) {
  const refs = getEmployeeEditModalRefs();
  employeeEditAccount = account;
  refs.employeeId.value = String(account.employeeId ?? account.accountCode ?? "").trim();
  refs.position.value = String(account.position ?? "").trim() || "Packing";
  refs.timeIn.value = String(account.timeIn ?? "").trim() || "09:00";
  refs.firstName.value = String(account.firstName ?? "").trim();
  refs.middleName.value = String(account.middleName ?? "").trim();
  refs.lastName.value = String(account.lastName ?? "").trim();
  refs.suffix.value = String(account.suffix ?? "").trim();
  refs.email.value = String(account.email ?? "").trim();
  refs.mobileNumber.value = normalizeEmployeePhone(account.mobileNumber);
  refs.address.value = String(account.address ?? "").trim();
  refs.password.value = "";
  refs.confirmPassword.value = "";
  refs.password.type = "password";
  refs.confirmPassword.type = "password";
  syncEmployeeEditPasswordToggle(refs.passwordToggle, refs.password);
  syncEmployeeEditPasswordToggle(refs.confirmPasswordToggle, refs.confirmPassword);
  renderEmployeeEditPositionOptions({ includeCurrent: true });
  syncEmployeeEditTimeInDropdown();
  syncEmployeeEditTimeOut();
  setEmployeeEditFeedback();
  clearEmployeeEditPasswordInvalid(refs);
  refs.overlay.hidden = false;
  refs.overlay.setAttribute("aria-hidden", "false");
  syncEmployeeDataModalOpenClass();
  window.setTimeout(() => {
    refs.firstName.focus();
  }, 0);
}

function closeEmployeeEditModal() {
  if (!employeeEditModalRefs) {
    return;
  }

  employeeEditModalRefs.overlay.hidden = true;
  employeeEditModalRefs.overlay.setAttribute("aria-hidden", "true");
  closeEmployeeEditDropdowns();
  employeeEditAccount = null;
  syncEmployeeDataModalOpenClass();
}

async function saveEmployeeEdit() {
  const refs = getEmployeeEditModalRefs();
  if (!employeeEditAccount) {
    return;
  }

  syncEmployeeEditTimeOut();
  const position = refs.position.value.trim();
  const timeIn = refs.timeIn.value.trim();
  const timeOut = refs.timeOutHidden.value.trim();
  const firstName = refs.firstName.value.trim();
  const lastName = refs.lastName.value.trim();
  const email = refs.email.value.trim();
  const mobileNumber = normalizeEmployeePhone(refs.mobileNumber.value);
  const password = refs.password.value.trim();
  const confirmPassword = refs.confirmPassword.value.trim();

  if (!position || !timeIn || !timeOut) {
    setEmployeeEditFeedback("Please complete employee position and schedule.", "error");
    return;
  }

  if (!firstName || !lastName || !email || !mobileNumber) {
    setEmployeeEditFeedback("Please complete first name, last name, email, and phone number.", "error");
    return;
  }

  if (password || confirmPassword) {
    if (password.length < 6) {
      setEmployeeEditPasswordInvalid(refs.password, true);
      setEmployeeEditPasswordInvalid(refs.confirmPassword, false);
      setEmployeeEditFeedback("Password must be at least 6 characters long.", "error");
      return;
    }

    if (password !== confirmPassword) {
      setEmployeeEditPasswordInvalid(refs.password, false);
      setEmployeeEditPasswordInvalid(refs.confirmPassword, true);
      setEmployeeEditFeedback("Password and confirm password must match.", "error");
      refs.confirmPassword.focus();
      return;
    }
  }

  clearEmployeeEditPasswordInvalid(refs);
  refs.mobileNumber.value = mobileNumber;
  refs.submitButton.disabled = true;
  setEmployeeEditFeedback("Saving employee changes...");

  try {
    const response = await fetch("/api/accounts", {
      method: "PUT",
      headers: withEmployeeDataAdminHeaders({
        "Content-Type": "application/json",
        Accept: "application/json",
      }),
      body: JSON.stringify({
        id: getEmployeeAccountId(employeeEditAccount),
        position,
        timeIn,
        timeOut,
        firstName,
        middleName: refs.middleName.value.trim(),
        lastName,
        suffix: refs.suffix.value.trim(),
        email,
        address: refs.address.value.trim(),
        countryCode: "+63",
        mobileNumber,
        profileImageUrl: getEmployeeProfileImageUrl(employeeEditAccount),
        ...(password ? { password } : {}),
        source: "web",
      }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Unable to update employee account.");
    }

    const updatedDisplayName = `${firstName} ${lastName}`.trim() || getEmployeeDisplayName(employeeEditAccount);
    closeEmployeeEditModal();
    await loadAccounts();
    window.GMSAdminSuccessModal?.show?.({
      title: "Saved",
      copy: `${updatedDisplayName} updated successfully.`,
    });
  } catch (error) {
    setEmployeeEditFeedback(
      error instanceof Error ? error.message : "Unable to update employee account.",
      "error",
    );
  } finally {
    refs.submitButton.disabled = false;
  }
}

function createEmployeeDeleteModal() {
  const overlay = document.createElement("div");
  overlay.className = "validation-modal-overlay employee-data-delete-modal-overlay";
  overlay.hidden = true;
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <section
      class="validation-modal employee-data-delete-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="employee-data-delete-modal-title"
    >
      <button
        type="button"
        class="product-gallery-modal__close validation-modal__close"
        data-employee-delete-modal-close
        aria-label="Close delete modal"
        title="Close delete modal"
      >
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
      <div class="validation-modal__top">
        <div
          class="validation-modal__icon validation-modal__icon--error validation-modal__icon--delete"
          aria-hidden="true"
          role="presentation"
          tabindex="-1"
        >
          <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
        </div>
      </div>
      <div class="validation-modal__body">
        <h2 class="validation-modal__title" id="employee-data-delete-modal-title">Opps!</h2>
        <p class="validation-modal__copy" data-employee-delete-modal-copy></p>
        <div class="validation-modal__actions">
          <button
            type="button"
            class="ghost-button validation-modal__action-button validation-modal__action-button--secondary"
            data-employee-delete-modal-cancel
          >
            Cancel
          </button>
          <button
            type="button"
            class="validation-modal__action-button"
            data-employee-delete-modal-action
          >
            Delete
          </button>
        </div>
      </div>
    </section>
  `;

  document.body.appendChild(overlay);
  window.WebTheme?.applyFontAwesomeIcons?.(overlay);

  const refs = {
    overlay,
    closeButton: overlay.querySelector("[data-employee-delete-modal-close]"),
    cancelButton: overlay.querySelector("[data-employee-delete-modal-cancel]"),
    actionButton: overlay.querySelector("[data-employee-delete-modal-action]"),
    title: overlay.querySelector("#employee-data-delete-modal-title"),
    copy: overlay.querySelector("[data-employee-delete-modal-copy]"),
  };

  refs.closeButton.addEventListener("click", () => {
    if (!employeeDeleteBusy) {
      closeEmployeeDeleteModal();
    }
  });
  refs.cancelButton.addEventListener("click", () => {
    if (!employeeDeleteBusy) {
      closeEmployeeDeleteModal();
    }
  });
  refs.actionButton.addEventListener("click", () => {
    prepareEmployeeDeleteSuccessAudio();
    void confirmEmployeeDelete();
  });
  refs.overlay.addEventListener("click", (event) => {
    if (event.target === refs.overlay && !employeeDeleteBusy) {
      closeEmployeeDeleteModal();
    }
  });

  return refs;
}

function getEmployeeDeleteModalRefs() {
  if (!employeeDeleteModalRefs) {
    employeeDeleteModalRefs = createEmployeeDeleteModal();
  }

  return employeeDeleteModalRefs;
}

function setEmployeeDeleteModalBusy(isBusy) {
  const refs = getEmployeeDeleteModalRefs();
  employeeDeleteBusy = isBusy;
  refs.closeButton.disabled = isBusy;
  refs.cancelButton.disabled = isBusy;
  refs.actionButton.disabled = isBusy;
  refs.actionButton.textContent = isBusy ? "Deleting..." : "Delete";
}

function getEmployeeDeleteSuccessAudio() {
  if (typeof Audio !== "function") {
    return null;
  }

  if (!employeeDeleteSuccessAudio) {
    employeeDeleteSuccessAudio = new Audio(employeeDataDeleteSuccessAudioUrl);
    employeeDeleteSuccessAudio.preload = "auto";
  }

  return employeeDeleteSuccessAudio;
}

function prepareEmployeeDeleteSuccessAudio() {
  const audio = getEmployeeDeleteSuccessAudio();
  if (audio?.load) {
    audio.load();
  }
}

function playEmployeeDeleteSuccessAudio() {
  const audio = getEmployeeDeleteSuccessAudio();
  if (!audio) {
    return;
  }

  try {
    audio.pause();
    audio.currentTime = 0;
    const playResult = audio.play();
    if (playResult?.catch) {
      playResult.catch((error) => {
        console.warn("Unable to play delete success audio.", error);
      });
    }
  } catch (error) {
    console.warn("Unable to play delete success audio.", error);
  }
}

function ensureEmployeeDataLottiePlayer() {
  if (window.lottie?.loadAnimation) {
    return Promise.resolve(true);
  }

  if (employeeDataLottieLoadPromise) {
    return employeeDataLottieLoadPromise;
  }

  employeeDataLottieLoadPromise = new Promise((resolve) => {
    const existingScript = document.querySelector(
      `script[src$="${employeeDataLottiePlayerUrl}"], script[src*="${employeeDataLottiePlayerUrl}?"]`,
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
    scriptElement.src = employeeDataLottiePlayerUrl;
    scriptElement.async = true;
    scriptElement.addEventListener("load", () => resolve(Boolean(window.lottie?.loadAnimation)), { once: true });
    scriptElement.addEventListener("error", () => resolve(false), { once: true });
    document.head.appendChild(scriptElement);
  });

  return employeeDataLottieLoadPromise;
}

function destroyEmployeeDeleteSuccessAnimation() {
  if (employeeDeleteSuccessAnimation?.destroy) {
    employeeDeleteSuccessAnimation.destroy();
  }
  employeeDeleteSuccessAnimation = null;
}

async function playEmployeeDeleteSuccessAnimation() {
  const container = employeeDeleteSuccessModalRefs?.icon?.querySelector("[data-employee-delete-success-lottie]");
  if (!(container instanceof HTMLElement)) {
    return;
  }

  destroyEmployeeDeleteSuccessAnimation();
  container.innerHTML = "";

  const canUseLottie = await ensureEmployeeDataLottiePlayer();
  if (
    !canUseLottie
    || !window.lottie?.loadAnimation
    || !container.isConnected
    || employeeDeleteSuccessModalRefs?.overlay?.hidden
  ) {
    return;
  }

  employeeDeleteSuccessAnimation = window.lottie.loadAnimation({
    container,
    renderer: "svg",
    loop: false,
    autoplay: true,
    path: employeeDataSuccessAnimationPath,
  });
}

function createEmployeeDeleteSuccessModal() {
  const overlay = document.createElement("div");
  overlay.className = "validation-modal-overlay employee-data-delete-success-modal-overlay";
  overlay.hidden = true;
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <section
      class="validation-modal employee-data-delete-success-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="employee-data-delete-success-title"
      tabindex="-1"
    >
      <div class="validation-modal__top">
        <div
          class="validation-modal__icon validation-modal__icon--success"
          aria-hidden="true"
          role="presentation"
          tabindex="-1"
        >
          <div class="product-validation-lottie-check" data-employee-delete-success-lottie></div>
        </div>
      </div>
      <div class="validation-modal__body">
        <h2 class="validation-modal__title" id="employee-data-delete-success-title">Success</h2>
        <p class="validation-modal__copy" data-employee-delete-success-copy></p>
      </div>
    </section>
  `;

  document.body.appendChild(overlay);

  return {
    overlay,
    dialog: overlay.querySelector(".employee-data-delete-success-modal"),
    icon: overlay.querySelector(".validation-modal__icon"),
    copy: overlay.querySelector("[data-employee-delete-success-copy]"),
  };
}

function getEmployeeDeleteSuccessModalRefs() {
  if (!employeeDeleteSuccessModalRefs) {
    employeeDeleteSuccessModalRefs = createEmployeeDeleteSuccessModal();
  }

  return employeeDeleteSuccessModalRefs;
}

function clearEmployeeDeleteSuccessCloseTimer() {
  if (employeeDeleteSuccessCloseTimer) {
    window.clearTimeout(employeeDeleteSuccessCloseTimer);
    employeeDeleteSuccessCloseTimer = 0;
  }
}

function closeEmployeeDeleteSuccessModal() {
  if (!employeeDeleteSuccessModalRefs) {
    return;
  }

  clearEmployeeDeleteSuccessCloseTimer();
  destroyEmployeeDeleteSuccessAnimation();
  hideEmployeeDeleteValidationOverlay(employeeDeleteSuccessModalRefs.overlay, () => {
    syncEmployeeDataModalOpenClass();
  });
}

function openEmployeeDeleteSuccessModal(copy = "Employee deleted successfully.") {
  const refs = getEmployeeDeleteSuccessModalRefs();

  clearEmployeeDeleteSuccessCloseTimer();
  destroyEmployeeDeleteSuccessAnimation();
  refs.copy.textContent = String(copy ?? "").trim() || "Employee deleted successfully.";
  refs.overlay.hidden = false;
  refs.overlay.setAttribute("aria-hidden", "false");
  syncEmployeeDataModalOpenClass();
  playEmployeeDeleteSuccessAudio();
  void playEmployeeDeleteSuccessAnimation();

  window.requestAnimationFrame(() => {
    refs.overlay.classList.add("is-open");
    refs.dialog?.focus?.();
  });

  employeeDeleteSuccessCloseTimer = window.setTimeout(() => {
    employeeDeleteSuccessCloseTimer = 0;
    closeEmployeeDeleteSuccessModal();
  }, 2000);
}

function openEmployeeDataSuccessModal(copy = "Saved successfully.") {
  openEmployeeDeleteSuccessModal(copy);
}

function hideEmployeeDeleteValidationOverlay(overlay, callback) {
  if (!(overlay instanceof HTMLElement)) {
    if (typeof callback === "function") {
      callback();
    }
    return;
  }

  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");

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

function openEmployeeDeleteModal(account, triggerElement = null) {
  const refs = getEmployeeDeleteModalRefs();
  const accountId = getEmployeeAccountId(account);
  const displayName = `${account.firstName ?? ""} ${account.lastName ?? ""}`.trim()
    || account.employeeId
    || "this employee";

  employeeDeleteAccount = account;
  employeeDeleteTriggerElement = triggerElement instanceof HTMLElement ? triggerElement : null;
  refs.title.textContent = "Opps!";
  refs.copy.textContent = accountId
    ? `Are you sure you want to delete ${displayName}?`
    : "Unable to delete employee account without an account ID.";
  refs.cancelButton.textContent = accountId ? "Cancel" : "Close";
  refs.actionButton.hidden = !accountId;
  setEmployeeDeleteModalBusy(false);
  refs.overlay.hidden = false;
  refs.overlay.setAttribute("aria-hidden", "false");
  syncEmployeeDataModalOpenClass();
  window.requestAnimationFrame(() => {
    refs.overlay.classList.add("is-open");
    if (accountId) {
      refs.actionButton.focus();
      return;
    }

    refs.cancelButton.focus();
  });
}

function closeEmployeeDeleteModal({ restoreFocus = true, force = false, onClosed = null } = {}) {
  if (!employeeDeleteModalRefs || (employeeDeleteBusy && !force)) {
    return;
  }

  const triggerElement = employeeDeleteTriggerElement;
  hideEmployeeDeleteValidationOverlay(employeeDeleteModalRefs.overlay, () => {
    employeeDeleteAccount = null;
    employeeDeleteTriggerElement = null;
    setEmployeeDeleteModalBusy(false);
    syncEmployeeDataModalOpenClass();

    if (restoreFocus && triggerElement instanceof HTMLElement) {
      triggerElement.focus();
    }

    if (typeof onClosed === "function") {
      onClosed();
    }
  });
}

function deleteEmployeeAccount(account, triggerElement = null) {
  openEmployeeDeleteModal(account, triggerElement);
}

async function confirmEmployeeDelete() {
  if (!employeeDeleteAccount || employeeDeleteBusy) {
    return;
  }

  const refs = getEmployeeDeleteModalRefs();
  const accountId = getEmployeeAccountId(employeeDeleteAccount);
  const deletedDisplayName =
    `${employeeDeleteAccount.firstName ?? ""} ${employeeDeleteAccount.lastName ?? ""}`.trim()
    || employeeDeleteAccount.employeeId
    || "Employee";

  if (!accountId) {
    return;
  }

  setEmployeeDeleteModalBusy(true);
  try {
    const response = await fetch(`/api/accounts?id=${encodeURIComponent(accountId)}`, {
      method: "DELETE",
      headers: withEmployeeDataAdminHeaders({ Accept: "application/json" }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Unable to delete employee account.");
    }

    await loadAccounts();
    closeEmployeeDeleteModal({
      restoreFocus: false,
      force: true,
      onClosed: () => {
        openEmployeeDeleteSuccessModal(`${deletedDisplayName} deleted successfully.`);
      },
    });
  } catch (error) {
    refs.title.textContent = "Unable to Delete";
    refs.copy.textContent = error instanceof Error ? error.message : "Unable to delete employee account.";
    setEmployeeDeleteModalBusy(false);
  }
}

async function loadAccounts() {
  try {
    const response = await fetch("/api/accounts", {
      cache: "no-store",
      headers: withEmployeeDataAdminHeaders({ Accept: "application/json" }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to load created accounts.");
    }

    const accounts = Array.isArray(data.accounts) ? data.accounts : [];
    const employeeAccounts = accounts.filter((account) => account.source === "web");
    renderAccounts(employeeAccounts);
  } catch (error) {
    console.error(error);
    currentEmployeeAccounts = [];
    selectedEmployeeAccessAccountId = "";
    syncEmployeeAccessFab();
    userAccountList.replaceChildren();
    userAccountList.appendChild(createEmptyState("Unable to load registered employee accounts right now."));

    if (accountsTotal) {
      accountsTotal.textContent = "0";
    }

    if (accountsVerified) {
      accountsVerified.textContent = "0";
    }

    if (accountsLatest) {
      accountsLatest.textContent = "No data";
    }

    if (accountsCountPill) {
      accountsCountPill.textContent = "0 employees";
    }
  }
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  if (employeeProfilePictureViewerRefs && !employeeProfilePictureViewerRefs.overlay.hidden) {
    event.preventDefault();
    closeEmployeeProfilePictureViewer();
    return;
  }

  if (employeeEvaluationRatingModalRefs && !employeeEvaluationRatingModalRefs.overlay.hidden) {
    event.preventDefault();
    closeEmployeeEvaluationRatingModal();
    return;
  }

  if (employeeAttendanceRecordsModalRefs && !employeeAttendanceRecordsModalRefs.overlay.hidden) {
    event.preventDefault();
    closeEmployeeAttendanceRecordsModal();
    return;
  }

  if (employeeDeleteModalRefs && !employeeDeleteModalRefs.overlay.hidden) {
    event.preventDefault();
    if (!employeeDeleteBusy) {
      closeEmployeeDeleteModal();
    }
    return;
  }

  if (employeeAccessDrawerRefs && !employeeAccessDrawerRefs.overlay.hidden) {
    event.preventDefault();
    closeEmployeeAccessDrawer();
    return;
  }

  if (employeeEvaluationDrawerRefs && !employeeEvaluationDrawerRefs.overlay.hidden) {
    event.preventDefault();
    closeEmployeeEvaluationDrawer();
    return;
  }

  if (employeeEditModalRefs && !employeeEditModalRefs.overlay.hidden) {
    if (!employeeEditModalRefs.positionMenu.hidden || !employeeEditModalRefs.timeInMenu.hidden) {
      closeEmployeeEditDropdowns();
      return;
    }

    closeEmployeeEditModal();
  }
});

document.addEventListener("wheel", blockEmployeeDrawerBackgroundScroll, {
  capture: true,
  passive: false,
});
document.addEventListener("touchmove", blockEmployeeDrawerBackgroundScroll, {
  capture: true,
  passive: false,
});
document.addEventListener("keydown", blockEmployeeDrawerBackgroundKeyScroll, true);

if (employeeSearchInput) {
  employeeSearchInput.addEventListener("input", () => {
    window.clearTimeout(employeeSearchTimer);
    employeeSearchTimer = window.setTimeout(() => {
      employeeSearchQuery = employeeSearchInput.value;
      renderEmployeeAccountList();
    }, 500);
  });
}

window.addEventListener("gms:employee-positions-updated", () => {
  if (employeeEditModalRefs) {
    renderEmployeeEditPositionOptions({ includeCurrent: true });
  }
});

function refreshEmployeeLeaveRequestUi() {
  renderEmployeeAccountList();
  syncEmployeeAccessFab();
  syncEmployeeEvaluationDrawer();
  if (employeeAttendanceRecordsModalRefs && !employeeAttendanceRecordsModalRefs.overlay.hidden) {
    renderEmployeeAttendanceRecordsModal();
  }
}

function scheduleEmployeeAccountRefresh() {
  if (employeeAccountRefreshTimer) {
    window.clearTimeout(employeeAccountRefreshTimer);
  }

  employeeAccountRefreshTimer = window.setTimeout(() => {
    employeeAccountRefreshTimer = 0;
    void loadAccounts();
  }, 120);
}

window.addEventListener(employeeLeaveRequestsChangedEventName, refreshEmployeeLeaveRequestUi);
window.addEventListener(employeeAccountUpdatedEventName, scheduleEmployeeAccountRefresh);
window.addEventListener("storage", (event) => {
  if (event.key === employeeLeaveRequestsStorageKey) {
    refreshEmployeeLeaveRequestUi();
  }

  if (event.key === employeeAccountUpdatedStorageKey) {
    scheduleEmployeeAccountRefresh();
  }
});

setupEmployeeDataSettingsControlsObserver();
setupEmployeeLeaveNavBadgeObserver();
loadAccounts();
