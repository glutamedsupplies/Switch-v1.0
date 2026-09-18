// Live Chat page runtime. Keep page-specific chat behavior in this file.
(function () {
  function readStoredEmployeeSession() {
    try {
      const rawEmployeeSession = window.sessionStorage.getItem("gms-employee-session");
      return rawEmployeeSession ? JSON.parse(rawEmployeeSession) : null;
    } catch (error) {
      console.warn("Unable to load employee session.", error);
      return null;
    }
  }

  function readStoredAdminSession() {
    try {
      const rawAdminSession = window.sessionStorage.getItem("gms-admin-session");
      return rawAdminSession ? JSON.parse(rawAdminSession) : null;
    } catch (error) {
      console.warn("Unable to load admin session.", error);
      return null;
    }
  }

  function hasEmployeeWorkspaceSession(session) {
    return Boolean(
      session &&
      typeof session === "object" &&
      (
        session.role === "employee" ||
        session.employeeId ||
        session.accountCode ||
        session.position
      ),
    );
  }

  function hasAdminWorkspaceSession(session) {
    return Boolean(
      session &&
      typeof session === "object" &&
      (
        String(session.role ?? "").trim().toLowerCase() === "admin" ||
        session.adminId ||
        session.ownerAdminId ||
        session.tenantId ||
        session.workspaceId ||
        session.storeAdminId ||
        session.id ||
        session.accountCode ||
        session.email
      ),
    );
  }

  function hasStoredEmployeePermission(session, permissionKey) {
    if (!session?.accessPermissionsConfigured || !Array.isArray(session?.accessPermissions)) {
      return false;
    }

    const normalizedPermissionKey = String(permissionKey ?? "").trim().toLowerCase();
    return session.accessPermissions.some((permission) =>
      String(permission ?? "").trim().toLowerCase() === normalizedPermissionKey,
    );
  }

  const currentPagePath = String(window.location.pathname || "").trim().toLowerCase();
  let storedEmployeeSession = readStoredEmployeeSession();
  let storedAdminSession = readStoredAdminSession();
  let employeeDashboardAttendanceCalendarMonth = new Date();
  let employeeDashboardAttendanceSelectedDateKey = "";
  const employeeDashboardScheduleLeaveReasons = Object.freeze([
    "Sick Leave",
    "Personal Leave",
    "Emergency Leave",
    "Vacation Leave",
  ]);
  const employeeDashboardScheduleLeaveModal = document.querySelector("[data-employee-dashboard-schedule-leave-modal]");
  const employeeDashboardScheduleLeaveModalDate = document.querySelector("[data-employee-dashboard-schedule-leave-modal-date]");
  const employeeDashboardScheduleLeaveModalReasons = document.querySelector("[data-employee-dashboard-schedule-leave-modal-reasons]");
  const employeeDashboardScheduleLeaveModalInput = document.querySelector("[data-employee-dashboard-schedule-leave-modal-input]");
  const employeeDashboardScheduleLeaveModalApply = document.querySelector("[data-employee-dashboard-schedule-leave-modal-apply]");
  let employeeDashboardScheduleLeavePendingDateKey = "";
  const employeeDashboardLeaveRequestsStorageKey = "gms-employee-leave-requests";
  const employeeDashboardLeaveRequestsChangedEventName = "gms-employee-leave-requests-changed";
  const isLiveChatPage =
    currentPagePath === "/live_chat.html"
    || Boolean(document.querySelector("[data-main-live-chat-view]"));
  let isAdminLiveChatReadOnly = false;

  function syncLiveChatAccessState(
    employeeSession = readStoredEmployeeSession(),
    adminSession = readStoredAdminSession(),
  ) {
    storedEmployeeSession = employeeSession;
    storedAdminSession = adminSession;
    isAdminLiveChatReadOnly =
      isLiveChatPage &&
      !hasEmployeeWorkspaceSession(storedEmployeeSession) &&
      !hasAdminWorkspaceSession(storedAdminSession);
  }

  syncLiveChatAccessState(storedEmployeeSession);

  function normalizeEmployeeDashboardPosition(session) {
    return String(session?.position ?? "")
      .trim()
      .toLowerCase();
  }

  function isEmployeeDashboardAdminEmployee(session) {
    return normalizeEmployeeDashboardPosition(session) === "admin employee";
  }

  function hasEmployeeDashboardLiveChatAccess(session) {
    return isEmployeeDashboardAdminEmployee(session) || hasStoredEmployeePermission(session, "live-chat");
  }

  function normalizeEmployeeDashboardMatchValue(value) {
    return String(value ?? "").trim().toLowerCase();
  }

  function getEmployeeDashboardMatchValues(session) {
    return [
      session?.id,
      session?.accountCode,
      session?.employeeId,
      session?.email,
    ]
      .map(normalizeEmployeeDashboardMatchValue)
      .filter(Boolean);
  }

  function getEmployeeDashboardAccountId(session) {
    return String(
      session?.id
        ?? session?.employeeId
        ?? session?.accountCode
        ?? session?.email
        ?? "",
    ).trim();
  }

  function normalizeEmployeeDashboardAdminScope(value, fallback = "") {
    const normalized = String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return normalized || fallback;
  }

  function getEmployeeDashboardSessionAdminScope(session, fallback = "") {
    if (!session || typeof session !== "object") {
      return fallback;
    }

    return normalizeEmployeeDashboardAdminScope(
      session.adminId ??
        session.ownerAdminId ??
        session.tenantId ??
        session.workspaceId ??
        session.storeAdminId,
      fallback,
    );
  }

  function normalizeEmployeeDashboardDisplayText(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function getEmployeeDashboardSessionDisplayName(session, fallback = "Employee") {
    if (!session || typeof session !== "object") {
      return fallback;
    }

    const fullName = [
      session.firstName,
      session.lastName,
    ]
      .map(normalizeEmployeeDashboardDisplayText)
      .filter(Boolean)
      .join(" ");
    return [
      fullName,
      session.employeeName,
      session.displayName,
      session.fullName,
      session.name,
      session.companyName,
      session.storeName,
      session.businessName,
      session.employeeId,
      session.accountCode,
      session.email,
    ]
      .map(normalizeEmployeeDashboardDisplayText)
      .find(Boolean) || fallback;
  }

  function getEmployeeDashboardSessionProfileImageUrl(session) {
    if (!session || typeof session !== "object") {
      return "";
    }

    return [
      session.employeePhotoUrl,
      session.employeeProfileImageUrl,
      session.photoUrl,
      session.profileImageUrl,
      session.avatarUrl,
      session.companyPictureUrl,
      session.companyProfileImageUrl,
      session.logoUrl,
    ]
      .map((value) => String(value ?? "").trim())
      .find(Boolean) || "";
  }

  function getLiveChatSupportSender() {
    const employeeSession = storedEmployeeSession || readStoredEmployeeSession();
    if (hasEmployeeWorkspaceSession(employeeSession)) {
      return {
        id: getEmployeeDashboardAccountId(employeeSession),
        role: "employee",
        displayName: getEmployeeDashboardSessionDisplayName(employeeSession, "Employee"),
        avatarUrl: getEmployeeDashboardSessionProfileImageUrl(employeeSession),
      };
    }

    const adminSession = storedAdminSession || readStoredAdminSession();
    if (hasAdminWorkspaceSession(adminSession)) {
      return {
        id: getEmployeeDashboardAccountId(adminSession),
        role: "admin",
        displayName: getEmployeeDashboardSessionDisplayName(adminSession, "Admin"),
        avatarUrl: getEmployeeDashboardSessionProfileImageUrl(adminSession),
      };
    }

    return {
      id: "",
      role: "employee",
      displayName: "Employee",
      avatarUrl: "",
    };
  }

  function withEmployeeDashboardAdminHeaders(headers = {}) {
    const employeeSession = storedEmployeeSession || readStoredEmployeeSession();
    const adminSession = storedAdminSession || readStoredAdminSession();
    const adminId =
      getEmployeeDashboardSessionAdminScope(employeeSession, "") ||
      getEmployeeDashboardSessionAdminScope(adminSession, "");
    const employeeId = !adminSession && employeeSession
      ? getEmployeeDashboardAccountId(employeeSession)
      : "";
    return {
      ...headers,
      ...(adminId ? { "X-GMS-Admin-ID": adminId } : {}),
      ...(employeeId ? { "X-GMS-Employee-ID": employeeId } : {}),
    };
  }

  function getEmployeeDashboardLeaveRequestAdminScope(request) {
    if (!request || typeof request !== "object") {
      return "";
    }

    return normalizeEmployeeDashboardAdminScope(
      request.adminId ??
        request.ownerAdminId ??
        request.tenantId ??
        request.workspaceId ??
        request.storeAdminId,
      "",
    );
  }

  function isEmployeeDashboardLeaveRequestInAdminScope(request, session) {
    const sessionScope = getEmployeeDashboardSessionAdminScope(session, "");
    if (!sessionScope) {
      return true;
    }

    return getEmployeeDashboardLeaveRequestAdminScope(request) === sessionScope;
  }

  function readEmployeeDashboardLeaveRequests() {
    try {
      const rawRequests = window.localStorage?.getItem(employeeDashboardLeaveRequestsStorageKey);
      const requests = rawRequests ? JSON.parse(rawRequests) : [];
      return Array.isArray(requests) ? requests : [];
    } catch (error) {
      console.warn("Unable to read employee leave requests.", error);
      return [];
    }
  }

  function writeEmployeeDashboardLeaveRequests(requests) {
    try {
      window.localStorage?.setItem(
        employeeDashboardLeaveRequestsStorageKey,
        JSON.stringify(Array.isArray(requests) ? requests : []),
      );
      window.dispatchEvent(new CustomEvent(employeeDashboardLeaveRequestsChangedEventName));
    } catch (error) {
      console.warn("Unable to save employee leave requests.", error);
    }
  }

  function isEmployeeDashboardLeaveRequestForSession(request, session) {
    const matchValues = getEmployeeDashboardMatchValues(session);
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
      .map(normalizeEmployeeDashboardMatchValue)
      .some((value) => value && matchValues.includes(value));
  }

  function getEmployeeDashboardLeaveRequests(session) {
    return readEmployeeDashboardLeaveRequests()
      .filter((request) => isEmployeeDashboardLeaveRequestInAdminScope(request, session))
      .filter((request) => isEmployeeDashboardLeaveRequestForSession(request, session))
      .sort((left, right) => String(right.updatedAt || right.createdAt || "")
        .localeCompare(String(left.updatedAt || left.createdAt || "")));
  }

  function getEmployeeDashboardLeaveRequestStatus(request) {
    if (!request || typeof request !== "object") {
      return "";
    }
    const status = String(request?.status ?? "").trim().toLowerCase();
    if (status === "approved" || status === "declined") {
      return status;
    }
    return "pending";
  }

  function getEmployeeDashboardLeaveRequestForDate(session, dateKey) {
    const normalizedDateKey = String(dateKey ?? "").trim();
    if (!normalizedDateKey) {
      return null;
    }

    return getEmployeeDashboardLeaveRequests(session)
      .find((request) => String(request?.dateKey ?? "").trim() === normalizedDateKey) || null;
  }

  function saveEmployeeDashboardLeaveRequest(dateKey, reason, session = readStoredEmployeeSession()) {
    const normalizedDateKey = String(dateKey ?? "").trim();
    const accountId = getEmployeeDashboardAccountId(session);
    const adminId = getEmployeeDashboardSessionAdminScope(session, "");
    if (!normalizedDateKey || !accountId) {
      return null;
    }

    const requests = readEmployeeDashboardLeaveRequests();
    const requestId = `leave-${adminId || "global"}-${accountId}-${normalizedDateKey}`;
    const existingIndex = requests.findIndex((request) =>
      String(request?.id ?? "") === requestId
      || (
        String(request?.dateKey ?? "").trim() === normalizedDateKey
        && isEmployeeDashboardLeaveRequestForSession(request, session)
      ),
    );
    const now = new Date().toISOString();
    const nextRequest = {
      ...(existingIndex >= 0 ? requests[existingIndex] : {}),
      id: requestId,
      ...(adminId
        ? {
            adminId,
            ownerAdminId: adminId,
            tenantId: adminId,
          }
        : {}),
      employeeAccountId: accountId,
      accountId,
      employeeId: String(session?.employeeId ?? "").trim(),
      accountCode: String(session?.accountCode ?? "").trim(),
      email: String(session?.email ?? "").trim(),
      firstName: String(session?.firstName ?? "").trim(),
      employeeName: `${session?.firstName ?? ""} ${session?.lastName ?? ""}`.trim()
        || String(session?.employeeId ?? session?.accountCode ?? "Employee").trim(),
      position: String(session?.position ?? "").trim(),
      dateKey: normalizedDateKey,
      reason: String(reason ?? "").trim() || "Schedule Leave",
      status: "pending",
      createdAt: existingIndex >= 0 ? (requests[existingIndex].createdAt || now) : now,
      updatedAt: now,
      decidedAt: "",
      decision: "",
    };

    if (existingIndex >= 0) {
      requests[existingIndex] = nextRequest;
    } else {
      requests.push(nextRequest);
    }

    writeEmployeeDashboardLeaveRequests(requests);
    return nextRequest;
  }

  function getEmployeeDashboardFaceAttendanceProfile(session) {
    return session?.face_attendance_lh
      || session?.faceAttendanceLh
      || session?.registeredFaceProfile
      || null;
  }

  function getEmployeeDashboardAttendanceRecords(session) {
    const profile = getEmployeeDashboardFaceAttendanceProfile(session);
    if (!profile || typeof profile !== "object") {
      return [];
    }

    for (const key of [
      "attendance",
      "attendanceRecords",
      "attendance_records",
      "attendanceLogs",
      "attendance_logs",
      "records",
      "logs",
    ]) {
      if (Array.isArray(profile[key])) {
        return profile[key];
      }
    }

    return [];
  }

  function getEmployeeDashboardDateKey(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return "";
    }

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }

  function getEmployeeDashboardRecordDateKey(record) {
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
      return "";
    }

    const dateKeyMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateKeyMatch) {
      return `${dateKeyMatch[1]}-${dateKeyMatch[2]}-${dateKeyMatch[3]}`;
    }

    const date = new Date(rawDate);
    return getEmployeeDashboardDateKey(date);
  }

  function getEmployeeDashboardAttendanceStatus(record) {
    return String(
      record?.status
        ?? record?.attendanceStatus
        ?? record?.attendance_status
        ?? "",
    ).trim().toLowerCase();
  }

  function isEmployeeDashboardAbsentAttendance(record) {
    return /(absent|no show|no-show|missing|leave|off)/.test(
      getEmployeeDashboardAttendanceStatus(record),
    );
  }

  function isEmployeeDashboardLeaveAttendance(record) {
    return /(leave|off)/.test(getEmployeeDashboardAttendanceStatus(record));
  }

  function isEmployeeDashboardTimeOutAttendance(record) {
    const mode = String(record?.mode ?? record?.attendanceMode ?? record?.attendance_mode ?? "")
      .trim()
      .toLowerCase()
      .replaceAll("_", "-");
    const status = getEmployeeDashboardAttendanceStatus(record);

    return mode === "time-out"
      || mode === "emergency-time-out"
      || /(timed out|time out|time-out|emergency time out|emergency-time-out)/.test(status);
  }

  function parseEmployeeDashboardScheduleTime(value) {
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

    return (hours * 60) + minutes;
  }

  function normalizeEmployeeDashboardPercent(value) {
    const rawValue = String(value ?? "").trim();
    if (!rawValue) {
      return null;
    }

    const numericValue = Number(rawValue.replace("%", ""));
    if (!Number.isFinite(numericValue)) {
      return null;
    }

    const percentValue = numericValue > 0 && numericValue <= 1
      ? numericValue * 100
      : numericValue;
    return Math.max(0, Math.min(100, Math.round(percentValue)));
  }

  function getEmployeeDashboardNumber(source, keys) {
    if (!source || typeof source !== "object") {
      return null;
    }

    for (const key of keys) {
      const value = source[key];
      const rawValue = String(value ?? "").trim();
      if (!rawValue) {
        continue;
      }

      const numberValue = Number(rawValue.replace("%", ""));
      if (Number.isFinite(numberValue)) {
        return numberValue;
      }
    }

    return null;
  }

  function getEmployeeDashboardRecordDate(record) {
    const dateKey = getEmployeeDashboardRecordDateKey(record);
    if (!dateKey) {
      return null;
    }

    const [year, month, day] = dateKey.split("-").map((part) => Number(part));
    if (!year || !month || !day) {
      return null;
    }

    return new Date(year, month - 1, day);
  }

  function getEmployeeDashboardCurrentMonthAttendanceRecords(records) {
    const now = new Date();
    return records.filter((record) => {
      const recordDate = getEmployeeDashboardRecordDate(record);
      return recordDate
        && recordDate.getFullYear() === now.getFullYear()
        && recordDate.getMonth() === now.getMonth();
    });
  }

  function getEmployeeDashboardMonthAttendanceRecords(records, monthDate) {
    const targetDate = monthDate instanceof Date && !Number.isNaN(monthDate.getTime())
      ? monthDate
      : new Date();
    return records.filter((record) => {
      const recordDate = getEmployeeDashboardRecordDate(record);
      return recordDate
        && recordDate.getFullYear() === targetDate.getFullYear()
        && recordDate.getMonth() === targetDate.getMonth();
    });
  }

  function isEmployeeDashboardPresentAttendance(record) {
    if (!record || typeof record !== "object") {
      return false;
    }

    if (record.present === true || record.isPresent === true || record.checkedIn === true) {
      return true;
    }

    const status = getEmployeeDashboardAttendanceStatus(record);
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

  function getEmployeeDashboardAttendanceCheckInMinutes(record) {
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

    const directTime = parseEmployeeDashboardScheduleTime(rawValue.slice(0, 5));
    if (directTime !== null) {
      return directTime;
    }

    const date = new Date(rawValue);
    return Number.isNaN(date.getTime()) ? null : (date.getHours() * 60) + date.getMinutes();
  }

  function getEmployeeDashboardAttendancePenalty(record, session) {
    const status = getEmployeeDashboardAttendanceStatus(record);
    if (/(absent|no show|no-show|missing|leave|off)/.test(status)) {
      return "absent";
    }

    if (/(late|tardy)/.test(status)) {
      return "late";
    }

    if (/(on time|on-time|ontime)/.test(status)) {
      return "on-time";
    }

    const scheduledTimeIn = parseEmployeeDashboardScheduleTime(session?.timeIn ?? session?.time_in);
    const checkInMinutes = getEmployeeDashboardAttendanceCheckInMinutes(record);
    return scheduledTimeIn !== null && checkInMinutes !== null && checkInMinutes > scheduledTimeIn
      ? "late"
      : "on-time";
  }

  function hasEmployeeDashboardFaceProfile(session) {
    const profile = getEmployeeDashboardFaceAttendanceProfile(session);
    if (profile && typeof profile === "object") {
      const sampleCount = Number(profile.sampleCount ?? profile.sample_count ?? 0);
      return Boolean(profile.registeredAt || profile.registered_at || sampleCount > 0);
    }

    return Boolean(profile);
  }

  function getEmployeeDashboardAttendancePercent(session) {
    const profile = getEmployeeDashboardFaceAttendanceProfile(session);
    const attendanceRecords = getEmployeeDashboardAttendanceRecords(session);
    const monthlyRecords = getEmployeeDashboardCurrentMonthAttendanceRecords(attendanceRecords);

    if (monthlyRecords.length > 0) {
      let absentCount = 0;
      let lateCount = 0;
      monthlyRecords.forEach((record) => {
        const penalty = getEmployeeDashboardAttendancePenalty(record, session);
        if (penalty === "absent") {
          absentCount += 1;
        } else if (penalty === "late") {
          lateCount += 1;
        }
      });
      return Math.max(0, 100 - (absentCount * 10) - (lateCount * 5));
    }

    const directPercent = normalizeEmployeeDashboardPercent(
      getEmployeeDashboardNumber(profile, [
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
      return directPercent;
    }

    const presentCount = getEmployeeDashboardNumber(profile, [
      "presentDays",
      "present_days",
      "presentCount",
      "present_count",
      "attendedDays",
      "attended_days",
    ]);
    const totalCount = getEmployeeDashboardNumber(profile, [
      "totalDays",
      "total_days",
      "totalCount",
      "total_count",
      "scheduledDays",
      "scheduled_days",
    ]);
    if (Number.isFinite(presentCount) && Number.isFinite(totalCount) && totalCount > 0) {
      return normalizeEmployeeDashboardPercent(presentCount / totalCount) ?? 0;
    }

    if (attendanceRecords.length > 0) {
      const presentRecords = attendanceRecords.filter(isEmployeeDashboardPresentAttendance);
      const absentCount = attendanceRecords.length - presentRecords.length;
      return Math.max(0, 100 - (absentCount * 10));
    }

    const hasFaceProfile = hasEmployeeDashboardFaceProfile(session);
    const hasSchedule = parseEmployeeDashboardScheduleTime(session?.timeIn ?? session?.time_in) !== null
      && parseEmployeeDashboardScheduleTime(session?.timeOut ?? session?.time_out) !== null;

    if (hasFaceProfile && hasSchedule) {
      return 100;
    }
    if (hasFaceProfile) {
      return 75;
    }
    if (hasSchedule) {
      return 50;
    }

    return 0;
  }

  function getEmployeeDashboardAttendanceRecordTimestamp(record) {
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

    const recordDate = getEmployeeDashboardRecordDate(record);
    return recordDate ? recordDate.getTime() : 0;
  }

  function getEmployeeDashboardAttendanceDayStatus(session, records) {
    const sortedRecords = [...records].sort(
      (left, right) =>
        getEmployeeDashboardAttendanceRecordTimestamp(left)
        - getEmployeeDashboardAttendanceRecordTimestamp(right),
    );
    const hasTimeRecord = sortedRecords.some((record) =>
      !isEmployeeDashboardAbsentAttendance(record)
      && (
        isEmployeeDashboardTimeOutAttendance(record)
        || getEmployeeDashboardAttendanceTimeIn(record)
        || getEmployeeDashboardAttendanceTimeOut(record)
        || isEmployeeDashboardPresentAttendance(record)
      ),
    );
    const hasAbsentRecord = sortedRecords.some(isEmployeeDashboardAbsentAttendance);
    const hasLeaveRecord = sortedRecords.some(isEmployeeDashboardLeaveAttendance);
    const hasLateRecord = sortedRecords.some(
      (record) => getEmployeeDashboardAttendancePenalty(record, session) === "late",
    );

    if (hasLeaveRecord && !hasTimeRecord) {
      return "leave";
    }
    if (hasAbsentRecord && !hasTimeRecord) {
      return "absent";
    }
    if (hasLateRecord) {
      return "late";
    }
    if (hasTimeRecord) {
      return "present";
    }

    return "";
  }

  function getEmployeeDashboardAttendanceCalendarSummaries(session, monthDate) {
    const records = getEmployeeDashboardMonthAttendanceRecords(
      getEmployeeDashboardAttendanceRecords(session),
      monthDate,
    );
    const recordsByDate = new Map();

    records.forEach((record) => {
      const dateKey = getEmployeeDashboardRecordDateKey(record);
      if (!dateKey) {
        return;
      }

      const dayRecords = recordsByDate.get(dateKey) ?? [];
      dayRecords.push(record);
      recordsByDate.set(dateKey, dayRecords);
    });

    const summaries = new Map();
    recordsByDate.forEach((dayRecords, dateKey) => {
      const status = getEmployeeDashboardAttendanceDayStatus(session, dayRecords);
      if (status) {
        summaries.set(dateKey, status);
      }
    });

    return summaries;
  }

  function getEmployeeDashboardAttendanceStatusLabel(status) {
    switch (status) {
      case "leave":
        return "Leave";
      case "absent":
        return "Absent";
      case "late":
        return "Late";
      case "present":
        return "Present";
      default:
        return "Recorded";
    }
  }

  function escapeEmployeeDashboardHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function parseEmployeeDashboardDateKey(dateKey) {
    const [year, month, day] = String(dateKey || "")
      .split("-")
      .map((part) => Number(part));
    if (!year || !month || !day) {
      return null;
    }

    return new Date(year, month - 1, day);
  }

  function isEmployeeDashboardFutureDateKey(dateKey) {
    const date = parseEmployeeDashboardDateKey(dateKey);
    if (!date) {
      return false;
    }

    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return date.getTime() > todayDate.getTime();
  }

  function getEmployeeDashboardSelectedAttendanceDateKey(monthDate, summaries, leaveRequests = []) {
    const month = monthDate instanceof Date && !Number.isNaN(monthDate.getTime())
      ? monthDate
      : new Date();
    const selectedDate = parseEmployeeDashboardDateKey(employeeDashboardAttendanceSelectedDateKey);
    if (
      selectedDate
      && selectedDate.getFullYear() === month.getFullYear()
      && selectedDate.getMonth() === month.getMonth()
    ) {
      return employeeDashboardAttendanceSelectedDateKey;
    }

    const today = new Date();
    if (today.getFullYear() === month.getFullYear() && today.getMonth() === month.getMonth()) {
      return getEmployeeDashboardDateKey(today);
    }

    const visibleLeaveRequest = leaveRequests
      .filter((request) => ["pending", "approved"].includes(getEmployeeDashboardLeaveRequestStatus(request)))
      .find((request) => {
        const requestDate = parseEmployeeDashboardDateKey(request?.dateKey);
        return requestDate
          && requestDate.getFullYear() === month.getFullYear()
          && requestDate.getMonth() === month.getMonth();
      });
    if (visibleLeaveRequest?.dateKey) {
      return visibleLeaveRequest.dateKey;
    }

    const latestSummaryDateKey = [...summaries.keys()]
      .filter((dateKey) => !isEmployeeDashboardFutureDateKey(dateKey))
      .sort((left, right) => String(right).localeCompare(String(left)))[0];
    if (latestSummaryDateKey) {
      return latestSummaryDateKey;
    }

    const firstMonthDateKey = getEmployeeDashboardDateKey(new Date(month.getFullYear(), month.getMonth(), 1));
    return isEmployeeDashboardFutureDateKey(firstMonthDateKey) ? "" : firstMonthDateKey;
  }

  function getEmployeeDashboardAttendanceRecordSummaries(session, monthDate) {
    const records = getEmployeeDashboardMonthAttendanceRecords(
      getEmployeeDashboardAttendanceRecords(session),
      monthDate,
    );
    const recordsByDate = new Map();

    records.forEach((record) => {
      const dateKey = getEmployeeDashboardRecordDateKey(record);
      if (!dateKey) {
        return;
      }

      const dayRecords = recordsByDate.get(dateKey) ?? [];
      dayRecords.push(record);
      recordsByDate.set(dateKey, dayRecords);
    });

    return [...recordsByDate.entries()]
      .map(([dateKey, dayRecords]) => {
        const sortedRecords = [...dayRecords].sort(
          (left, right) =>
            getEmployeeDashboardAttendanceRecordTimestamp(left)
            - getEmployeeDashboardAttendanceRecordTimestamp(right),
        );
        const timeInRecord = sortedRecords.find(
          (record) => !isEmployeeDashboardAbsentAttendance(record) && !isEmployeeDashboardTimeOutAttendance(record),
        );
        const timeOutRecord = [...sortedRecords].reverse().find(isEmployeeDashboardTimeOutAttendance);
        const status = getEmployeeDashboardAttendanceDayStatus(session, sortedRecords);

        return {
          dateKey,
          status,
          statusLabel: getEmployeeDashboardAttendanceStatusLabel(status),
          timeIn: formatEmployeeDashboardClock(
            timeInRecord ? getEmployeeDashboardAttendanceTimeIn(timeInRecord) : "",
          ),
          timeOut: formatEmployeeDashboardClock(
            timeOutRecord ? getEmployeeDashboardAttendanceTimeOut(timeOutRecord) : "",
          ),
        };
      })
      .sort((left, right) => String(right.dateKey).localeCompare(String(left.dateKey)));
  }

  function renderEmployeeDashboardAttendanceRecords(session, monthDate, selectedDateKey) {
    const recordList = document.querySelector("[data-employee-dashboard-attendance-record-list]");
    if (!recordList) {
      return;
    }

    const summaries = getEmployeeDashboardAttendanceRecordSummaries(session, monthDate);
    const leaveRequest = getEmployeeDashboardLeaveRequestForDate(session, selectedDateKey);
    if (!selectedDateKey) {
      recordList.innerHTML = `
        <tr class="employee-attendance-table__empty-row">
          <td colspan="3">Select a date on the calendar.</td>
        </tr>`;
      return;
    }

    if (leaveRequest) {
      const leaveStatus = getEmployeeDashboardLeaveRequestStatus(leaveRequest);
      const statusLabel = "Leave";
      const statusClass = leaveStatus === "approved"
        ? " is-leave"
        : leaveStatus === "pending"
        ? " is-leave-pending"
        : " is-absent";
      const decisionText = leaveStatus === "approved"
        ? "Approved by admin"
        : leaveStatus === "declined"
        ? "Admin is not let you leave"
        : "Waiting for admin approval";

      recordList.innerHTML = `
        <tr class="employee-dashboard-attendance-record${statusClass}">
          <td>
            <span class="employee-dashboard-attendance-record__status">
              <span class="employee-dashboard-attendance-record__dot" aria-hidden="true"></span>
              <strong>${escapeEmployeeDashboardHtml(statusLabel)}</strong>
            </span>
          </td>
          <td>${escapeEmployeeDashboardHtml(leaveRequest.reason || "Schedule Leave")}</td>
          <td>${escapeEmployeeDashboardHtml(decisionText)}</td>
        </tr>`;
      return;
    }

    if (isEmployeeDashboardFutureDateKey(selectedDateKey)) {
      recordList.innerHTML = `
        <tr class="employee-attendance-table__empty-row employee-dashboard-schedule-leave-row">
          <td colspan="3">
            <div
              class="employee-dashboard-schedule-leave"
              data-employee-dashboard-schedule-leave-panel
              data-employee-dashboard-schedule-leave-date="${escapeEmployeeDashboardHtml(selectedDateKey)}"
            >
              <button
                type="button"
                class="employee-dashboard-schedule-leave__button"
                data-employee-dashboard-schedule-leave-button
                data-employee-dashboard-schedule-leave-date="${escapeEmployeeDashboardHtml(selectedDateKey)}"
              >
                Apply Schedule Leave
              </button>
            </div>
          </td>
        </tr>`;
      return;
    }

    const summary = summaries.find((item) => item.dateKey === selectedDateKey);
    if (!summary) {
      recordList.innerHTML = `
        <tr class="employee-attendance-table__empty-row">
          <td colspan="3">No attendance record for ${escapeEmployeeDashboardHtml(formatEmployeeDashboardSelectedDateText(selectedDateKey))}.</td>
        </tr>`;
      return;
    }

    const statusClass = summary.status ? ` is-${summary.status}` : "";
    recordList.innerHTML = `
      <tr class="employee-dashboard-attendance-record${statusClass}">
        <td>
          <span class="employee-dashboard-attendance-record__status">
            <span class="employee-dashboard-attendance-record__dot" aria-hidden="true"></span>
            <strong>${escapeEmployeeDashboardHtml(summary.statusLabel)}</strong>
          </span>
        </td>
        <td>${escapeEmployeeDashboardHtml(summary.timeIn)}</td>
        <td>${escapeEmployeeDashboardHtml(summary.timeOut)}</td>
      </tr>`;
  }

  function formatEmployeeDashboardCalendarDateLabel(date) {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  }

  function formatEmployeeDashboardSelectedDateText(dateKey) {
    const date = parseEmployeeDashboardDateKey(dateKey);
    return date
      ? formatEmployeeDashboardCalendarDateLabel(date)
      : "the selected day";
  }

  function renderEmployeeDashboardAttendanceCalendar(session) {
    const calendarElement = document.querySelector("[data-employee-dashboard-attendance-calendar]");
    const monthElement = document.querySelector("[data-employee-dashboard-attendance-calendar-month]");
    const daysElement = document.querySelector("[data-employee-dashboard-attendance-calendar-days]");
    const todayButton = document.querySelector("[data-employee-dashboard-attendance-calendar-today]");
    if (!calendarElement || !monthElement || !daysElement) {
      return;
    }

    const monthDate = employeeDashboardAttendanceCalendarMonth instanceof Date
      && !Number.isNaN(employeeDashboardAttendanceCalendarMonth.getTime())
      ? employeeDashboardAttendanceCalendarMonth
      : new Date();
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todayKey = getEmployeeDashboardDateKey(today);
    const summaries = getEmployeeDashboardAttendanceCalendarSummaries(session, monthDate);
    const leaveRequests = getEmployeeDashboardLeaveRequests(session);
    const leaveRequestByDate = new Map(
      leaveRequests
        .map((request) => [String(request?.dateKey ?? "").trim(), request])
        .filter(([dateKey]) => Boolean(dateKey)),
    );
    employeeDashboardAttendanceSelectedDateKey = getEmployeeDashboardSelectedAttendanceDateKey(
      monthDate,
      summaries,
      leaveRequests,
    );
    const dayNodes = [];

    monthElement.textContent = monthDate.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });

    if (todayButton) {
      todayButton.disabled = employeeDashboardAttendanceSelectedDateKey === todayKey
        && year === today.getFullYear()
        && month === today.getMonth();
    }

    for (let index = 0; index < firstDay.getDay(); index += 1) {
      dayNodes.push(`<span class="employee-attendance-calendar__blank-day" aria-hidden="true"></span>`);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      const dateKey = getEmployeeDashboardDateKey(date);
      const leaveRequest = leaveRequestByDate.get(dateKey);
      const leaveStatus = getEmployeeDashboardLeaveRequestStatus(leaveRequest);
      const status = leaveStatus === "approved"
        ? "leave"
        : leaveStatus === "pending"
        ? "leave-pending"
        : summaries.get(dateKey) || "";
      const isToday = dateKey === todayKey;
      const isFuture = date.getTime() > new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const isSelected = dateKey === employeeDashboardAttendanceSelectedDateKey;
      const statusClass = status ? ` is-${status}` : "";
      const todayClass = isToday ? " is-today" : "";
      const selectedClass = isSelected ? " is-selected" : "";
      const futureClass = isFuture && !leaveRequest ? " is-future" : "";
      const statusLabel = leaveRequest
        ? " leave"
        : status
        ? ` ${status}`
        : "";

      dayNodes.push(`
        <button
          type="button"
          class="employee-attendance-calendar__day${statusClass}${todayClass}${selectedClass}${futureClass}"
          data-employee-dashboard-attendance-calendar-date="${dateKey}"
          aria-label="${formatEmployeeDashboardCalendarDateLabel(date)}${statusLabel}"
          aria-pressed="${isSelected ? "true" : "false"}"
          title="${formatEmployeeDashboardCalendarDateLabel(date)}${statusLabel}"
        >
          <span class="employee-attendance-calendar__day-number">${day}</span>
        </button>`);
    }

    daysElement.innerHTML = dayNodes.join("");
    renderEmployeeDashboardAttendanceRecords(session, monthDate, employeeDashboardAttendanceSelectedDateKey);
  }

  function closeEmployeeDashboardScheduleLeaveModal() {
    if (!employeeDashboardScheduleLeaveModal) {
      return;
    }

    employeeDashboardScheduleLeaveModal.classList.remove("is-open");
    employeeDashboardScheduleLeaveModal.hidden = true;
    employeeDashboardScheduleLeavePendingDateKey = "";
    if (employeeDashboardScheduleLeaveModalInput) {
      employeeDashboardScheduleLeaveModalInput.value = "";
    }
    if (employeeDashboardScheduleLeaveModalApply) {
      employeeDashboardScheduleLeaveModalApply.disabled = true;
    }
    if (employeeDashboardScheduleLeaveModalReasons) {
      employeeDashboardScheduleLeaveModalReasons.querySelectorAll(".is-selected").forEach((button) => {
        button.classList.remove("is-selected");
        button.setAttribute("aria-pressed", "false");
      });
    }
  }

  function syncEmployeeDashboardScheduleLeaveApplyState() {
    if (!employeeDashboardScheduleLeaveModalApply || !employeeDashboardScheduleLeaveModalInput) {
      return;
    }

    employeeDashboardScheduleLeaveModalApply.disabled =
      !String(employeeDashboardScheduleLeaveModalInput.value || "").trim();
  }

  function setEmployeeDashboardScheduleLeaveApplied(dateKey, reason) {
    const normalizedDateKey = String(dateKey ?? "").trim();
    const leavePanel = Array.from(
      document.querySelectorAll("[data-employee-dashboard-schedule-leave-panel]"),
    ).find((panel) =>
      String(panel?.dataset?.employeeDashboardScheduleLeaveDate || "").trim() === normalizedDateKey,
    );

    if (!leavePanel) {
      return;
    }

    leavePanel.classList.remove("is-choosing");
    leavePanel.classList.add("is-applied");
    leavePanel.innerHTML = `
      <span>Schedule leave reason: ${escapeEmployeeDashboardHtml(reason || "Schedule Leave")}</span>
      <button type="button" class="employee-dashboard-schedule-leave__button" disabled>
        Schedule Leave Applied
      </button>`;
  }

  function openEmployeeDashboardScheduleLeaveModal(dateKey) {
    if (
      !employeeDashboardScheduleLeaveModal ||
      !employeeDashboardScheduleLeaveModalDate ||
      !employeeDashboardScheduleLeaveModalReasons ||
      !employeeDashboardScheduleLeaveModalInput ||
      !employeeDashboardScheduleLeaveModalApply
    ) {
      return;
    }

    const normalizedDateKey = String(dateKey ?? "").trim();
    const leaveDateText = formatEmployeeDashboardSelectedDateText(normalizedDateKey);
    const reasonButtons = employeeDashboardScheduleLeaveReasons.map((reason) => `
      <button
        type="button"
        class="employee-dashboard-schedule-leave-modal__reason"
        data-employee-dashboard-schedule-leave-reason="${escapeEmployeeDashboardHtml(reason)}"
        aria-pressed="false"
      >
        ${escapeEmployeeDashboardHtml(reason)}
      </button>`).join("");

    employeeDashboardScheduleLeavePendingDateKey = normalizedDateKey;
    employeeDashboardScheduleLeaveModalDate.textContent = `Choose a reason for ${leaveDateText}.`;
    employeeDashboardScheduleLeaveModalReasons.innerHTML = reasonButtons;
    employeeDashboardScheduleLeaveModalInput.value = "";
    employeeDashboardScheduleLeaveModalApply.disabled = true;
    employeeDashboardScheduleLeaveModal.hidden = false;
    requestAnimationFrame(() => {
      employeeDashboardScheduleLeaveModal.classList.add("is-open");
    });

    employeeDashboardScheduleLeaveModalInput.focus();
  }

  function getEmployeeDashboardAttendanceRawTime(record, keys) {
    for (const key of keys) {
      const value = String(record?.[key] ?? "").trim();
      if (value && !/^n\/?a$/i.test(value) && value !== "-") {
        return value;
      }
    }

    return "";
  }

  function getEmployeeDashboardAttendanceTimeIn(record) {
    const rawValue = getEmployeeDashboardAttendanceRawTime(record, [
      "timeIn",
      "time_in",
      "checkIn",
      "check_in",
      "clockIn",
      "clock_in",
    ]);

    return rawValue || String(record?.recorded_at ?? record?.recordedAt ?? record?.timestamp ?? "").trim();
  }

  function getEmployeeDashboardAttendanceTimeOut(record) {
    const rawValue = getEmployeeDashboardAttendanceRawTime(record, [
      "timeOut",
      "time_out",
      "checkOut",
      "check_out",
      "clockOut",
      "clock_out",
    ]);

    return rawValue || (
      isEmployeeDashboardTimeOutAttendance(record)
        ? String(record?.recorded_at ?? record?.recordedAt ?? record?.timestamp ?? "").trim()
        : ""
    );
  }

  function formatEmployeeDashboardClock(value) {
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
        return `${hourValue % 12 || 12}:${minuteText} ${periodText}`;
      }
      if (Number.isFinite(hourValue) && hourValue >= 0 && hourValue <= 23) {
        const displayHour = hourValue % 12 || 12;
        const displayPeriod = hourValue >= 12 ? "PM" : "AM";
        return `${displayHour}:${minuteText} ${displayPeriod}`;
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

  function renderEmployeeDashboardAttendance(session) {
    const statusElement = document.querySelector("[data-employee-dashboard-attendance-status]");
    const dateElement = document.querySelector("[data-employee-dashboard-attendance-date]");
    const pillElement = document.querySelector("[data-employee-dashboard-attendance-pill]");
    const timeInElement = document.querySelector("[data-employee-dashboard-attendance-time-in]");
    const timeOutElement = document.querySelector("[data-employee-dashboard-attendance-time-out]");
    const ringElement = document.querySelector("[data-employee-dashboard-attendance-ring]");
    const percentElement = document.querySelector("[data-employee-dashboard-attendance-percent]");
    if (!statusElement || !dateElement || !pillElement || !timeInElement || !timeOutElement) {
      return;
    }

    const today = new Date();
    const todayKey = getEmployeeDashboardDateKey(today);
    const todayRecords = getEmployeeDashboardAttendanceRecords(session)
      .filter((record) => getEmployeeDashboardRecordDateKey(record) === todayKey)
      .sort((left, right) => {
        const leftTime = new Date(
          left?.recorded_at ?? left?.recordedAt ?? left?.timestamp ?? left?.createdAt ?? 0,
        ).getTime();
        const rightTime = new Date(
          right?.recorded_at ?? right?.recordedAt ?? right?.timestamp ?? right?.createdAt ?? 0,
        ).getTime();
        return (Number.isFinite(leftTime) ? leftTime : 0) - (Number.isFinite(rightTime) ? rightTime : 0);
      });
    const timeInRecord = todayRecords.find((record) =>
      !isEmployeeDashboardAbsentAttendance(record) && !isEmployeeDashboardTimeOutAttendance(record),
    );
    const timeOutRecord = [...todayRecords].reverse().find(isEmployeeDashboardTimeOutAttendance);
    const hasAbsentRecord = todayRecords.some(isEmployeeDashboardAbsentAttendance);
    const hasLateRecord = todayRecords.some((record) =>
      /(late|tardy)/.test(getEmployeeDashboardAttendanceStatus(record)),
    );
    const scheduledTimeIn = session?.timeIn ?? session?.time_in ?? "";
    const scheduledTimeOut = session?.timeOut ?? session?.time_out ?? "";

    dateElement.textContent = today.toLocaleDateString(undefined, {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
    timeInElement.textContent = formatEmployeeDashboardClock(
      timeInRecord ? getEmployeeDashboardAttendanceTimeIn(timeInRecord) : scheduledTimeIn,
    );
    timeOutElement.textContent = formatEmployeeDashboardClock(
      timeOutRecord ? getEmployeeDashboardAttendanceTimeOut(timeOutRecord) : scheduledTimeOut,
    );

    const attendancePercent = getEmployeeDashboardAttendancePercent(session);
    if (ringElement) {
      ringElement.style.setProperty("--progress", String(attendancePercent));
      ringElement.setAttribute("aria-label", `Attendance Performance ${attendancePercent}%`);
    }
    if (percentElement) {
      percentElement.textContent = `${attendancePercent}%`;
    }
    renderEmployeeDashboardAttendanceCalendar(session);

    pillElement.className = "employee-dashboard-attendance-summary__pill";
    if (hasAbsentRecord && !timeInRecord) {
      statusElement.textContent = "Absent";
      pillElement.textContent = "Absent";
      pillElement.classList.add("is-error");
      return;
    }

    if (timeInRecord) {
      statusElement.textContent = hasLateRecord ? "Late" : "Present";
      pillElement.textContent = hasLateRecord ? "Late" : "Present";
      pillElement.classList.add(hasLateRecord ? "is-warning" : "is-success");
      return;
    }

    statusElement.textContent = "Scheduled";
    pillElement.textContent = "Pending";
    pillElement.classList.add("is-muted");
  }

  function syncEmployeeDashboardMetricCardHeights(session = readStoredEmployeeSession()) {
    const chatResponseCard = document.querySelector("[data-employee-dashboard-card='chat-response']");
    const employeeRatingCard = document.querySelector("[data-employee-dashboard-admin-only].stat-card--employee-rating");
    const shouldUseNaturalHeight =
      !isEmployeeDashboardAdminEmployee(session) ||
      !chatResponseCard ||
      !employeeRatingCard ||
      chatResponseCard.hidden ||
      employeeRatingCard.hidden ||
      window.matchMedia("(max-width: 1120px)").matches;

    if (chatResponseCard) {
      chatResponseCard.style.height = "";
      chatResponseCard.style.minHeight = "";
    }

    if (shouldUseNaturalHeight) {
      return;
    }

    const ratingHeight = employeeRatingCard.getBoundingClientRect().height;
    if (ratingHeight > 0) {
      chatResponseCard.style.height = `${Math.round(ratingHeight)}px`;
      chatResponseCard.style.minHeight = `${Math.round(ratingHeight)}px`;
    }
  }

  function syncEmployeeDashboardPanels(session = readStoredEmployeeSession()) {
    const resolvedSession = session && typeof session === "object" ? session : {};
    const isAdminEmployee = isEmployeeDashboardAdminEmployee(resolvedSession);
    const hasLiveChatAccess = hasEmployeeDashboardLiveChatAccess(resolvedSession);

    document.querySelectorAll("[data-employee-dashboard-card='chat-response']").forEach((card) => {
      card.hidden = !hasLiveChatAccess;
    });
    document.querySelectorAll("[data-employee-dashboard-admin-only]").forEach((section) => {
      section.hidden = !isAdminEmployee;
    });
    document.documentElement.classList.toggle("employee-dashboard-admin-employee", isAdminEmployee);
    document.documentElement.classList.toggle(
      "employee-dashboard-attendance-only",
      !isAdminEmployee && !hasLiveChatAccess,
    );

    renderEmployeeDashboardAttendance(resolvedSession);
    requestAnimationFrame(() => {
      syncEmployeeDashboardMetricCardHeights(resolvedSession);
    });
  }

  syncEmployeeDashboardPanels(storedEmployeeSession);
  window.addEventListener("resize", () => {
    syncEmployeeDashboardMetricCardHeights(storedEmployeeSession || readStoredEmployeeSession() || {});
  });
  window.addEventListener(employeeDashboardLeaveRequestsChangedEventName, () => {
    renderEmployeeDashboardAttendanceCalendar(storedEmployeeSession || readStoredEmployeeSession() || {});
  });
  window.addEventListener("storage", (event) => {
    if (event.key === employeeDashboardLeaveRequestsStorageKey) {
      renderEmployeeDashboardAttendanceCalendar(storedEmployeeSession || readStoredEmployeeSession() || {});
    }
  });
  window.addEventListener("gms-employee-session-updated", (event) => {
    syncEmployeeDashboardPanels(event?.detail?.session || readStoredEmployeeSession());
  });

  if (window.gmsEmployeeAccessReady && typeof window.gmsEmployeeAccessReady.then === "function") {
    window.gmsEmployeeAccessReady
      .then((session) => {
        syncEmployeeDashboardPanels(session || readStoredEmployeeSession());
      })
      .catch(() => {
        syncEmployeeDashboardPanels();
      });
  }

  document.addEventListener("click", (event) => {
    const eventTarget = event.target instanceof Element ? event.target : null;
    const scheduleLeaveModalClose = eventTarget?.closest("[data-employee-dashboard-schedule-leave-modal-close]");
    if (
      scheduleLeaveModalClose ||
      eventTarget?.matches("[data-employee-dashboard-schedule-leave-modal]")
    ) {
      closeEmployeeDashboardScheduleLeaveModal();
      return;
    }

    const scheduleLeaveModalApply = eventTarget?.closest("[data-employee-dashboard-schedule-leave-modal-apply]");
    if (scheduleLeaveModalApply) {
      const reason = String(employeeDashboardScheduleLeaveModalInput?.value || "").trim();
      if (!reason) {
        employeeDashboardScheduleLeaveModalInput?.focus();
        syncEmployeeDashboardScheduleLeaveApplyState();
        return;
      }
      saveEmployeeDashboardLeaveRequest(
        employeeDashboardScheduleLeavePendingDateKey,
        reason,
        storedEmployeeSession || readStoredEmployeeSession() || {},
      );
      setEmployeeDashboardScheduleLeaveApplied(employeeDashboardScheduleLeavePendingDateKey, reason);
      closeEmployeeDashboardScheduleLeaveModal();
      const today = new Date();
      employeeDashboardAttendanceCalendarMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      employeeDashboardAttendanceSelectedDateKey = getEmployeeDashboardDateKey(today);
      renderEmployeeDashboardAttendanceCalendar(storedEmployeeSession || readStoredEmployeeSession() || {});
      return;
    }

    const scheduleLeaveReasonButton = eventTarget?.closest("[data-employee-dashboard-schedule-leave-reason]");
    if (scheduleLeaveReasonButton) {
      const reason = String(scheduleLeaveReasonButton.dataset.employeeDashboardScheduleLeaveReason || "").trim();
      if (employeeDashboardScheduleLeaveModalInput) {
        employeeDashboardScheduleLeaveModalInput.value = reason;
        employeeDashboardScheduleLeaveModalInput.focus();
      }
      employeeDashboardScheduleLeaveModalReasons?.querySelectorAll("[data-employee-dashboard-schedule-leave-reason]")
        .forEach((button) => {
          const isSelected = button === scheduleLeaveReasonButton;
          button.classList.toggle("is-selected", isSelected);
          button.setAttribute("aria-pressed", isSelected ? "true" : "false");
        });
      syncEmployeeDashboardScheduleLeaveApplyState();
      return;
    }

    const scheduleLeaveButton = eventTarget?.closest("[data-employee-dashboard-schedule-leave-button]");
    if (scheduleLeaveButton) {
      openEmployeeDashboardScheduleLeaveModal(scheduleLeaveButton.dataset.employeeDashboardScheduleLeaveDate);
      return;
    }

    const dayButton = eventTarget?.closest("[data-employee-dashboard-attendance-calendar-date]");
    if (dayButton) {
      if (dayButton.disabled) {
        return;
      }

      employeeDashboardAttendanceSelectedDateKey = String(
        dayButton.dataset.employeeDashboardAttendanceCalendarDate || "",
      ).trim();
      renderEmployeeDashboardAttendanceCalendar(storedEmployeeSession || readStoredEmployeeSession() || {});
      return;
    }

    const stepButton = eventTarget?.closest("[data-employee-dashboard-attendance-calendar-step]");
    if (stepButton) {
      const monthStep = Number(stepButton.dataset.employeeDashboardAttendanceCalendarStep);
      employeeDashboardAttendanceCalendarMonth = new Date(
        employeeDashboardAttendanceCalendarMonth.getFullYear(),
        employeeDashboardAttendanceCalendarMonth.getMonth() + (Number.isFinite(monthStep) ? monthStep : 0),
        1,
      );
      renderEmployeeDashboardAttendanceCalendar(storedEmployeeSession || readStoredEmployeeSession() || {});
      return;
    }

    const todayButton = eventTarget?.closest("[data-employee-dashboard-attendance-calendar-today]");
    if (todayButton) {
      const today = new Date();
      employeeDashboardAttendanceCalendarMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      employeeDashboardAttendanceSelectedDateKey = getEmployeeDashboardDateKey(today);
      renderEmployeeDashboardAttendanceCalendar(storedEmployeeSession || readStoredEmployeeSession() || {});
    }
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      employeeDashboardScheduleLeaveModal &&
      !employeeDashboardScheduleLeaveModal.hidden
    ) {
      closeEmployeeDashboardScheduleLeaveModal();
    }
  });

  document.addEventListener("input", (event) => {
    if (event.target === employeeDashboardScheduleLeaveModalInput) {
      employeeDashboardScheduleLeaveModalReasons?.querySelectorAll("[data-employee-dashboard-schedule-leave-reason]")
        .forEach((button) => {
          button.classList.remove("is-selected");
          button.setAttribute("aria-pressed", "false");
        });
      syncEmployeeDashboardScheduleLeaveApplyState();
    }
  });

  const CHAT_REFRESH_INTERVAL_MS = 1000;
  const CHAT_TYPING_ACTIVE_WINDOW_MS = 5000;
  const CHAT_ONLINE_ACTIVE_WINDOW_MS = 45000;
  const CHAT_TYPING_IDLE_MS = 2500;
  const CHAT_TYPING_REFRESH_MS = 1200;
  const ORDERS_REFRESH_INTERVAL_MS = 10000;
  const STOCK_REFRESH_INTERVAL_MS = 10000;
  const SCROLL_DOWN_BUTTON_HIDE_DURATION_MS = 260;
  const SCROLL_DOWN_BUTTON_SHOW_DURATION_MS = 420;
  const board = document.querySelector("[data-employee-chat-board]");
  if (!board) {
    return;
  }

  const threadList = board.querySelector("[data-employee-chat-thread-list]");
  const conversationCount = document.querySelector("[data-employee-chat-count]");
  const emptyState = board.querySelector("[data-employee-chat-empty]");
  const conversationShell = board.querySelector("[data-employee-chat-shell]");
  const avatar = board.querySelector("[data-employee-chat-avatar]");
  const customerLabel = board.querySelector("[data-employee-chat-customer]");
  const productName = board.querySelector("[data-employee-chat-product-name]");
  const productMeta = board.querySelector("[data-employee-chat-product-meta]");
  const pinnedProductSlot = board.querySelector("[data-employee-chat-pinned-product]");
  const messageList = board.querySelector("[data-employee-chat-messages]");
  const scrollDownButton = board.querySelector("[data-employee-chat-scroll-down]");
  const searchInput =
    document.querySelector("[data-employee-chat-search]") ||
    board.querySelector("[data-employee-chat-search]");
  const form = board.querySelector("[data-employee-chat-form]");
  const input = board.querySelector("[data-employee-chat-input]");
  const mediaInput = board.querySelector("[data-employee-chat-media-input]");
  const mediaPreview = board.querySelector("[data-employee-chat-media-preview]");
  const replyState = board.querySelector("[data-employee-chat-reply-state]");
  const mediaButton = board.querySelector("[data-employee-chat-media]");
  const composePlusButton = board.querySelector("[data-employee-chat-compose-plus]");
  const heartButton = board.querySelector("[data-employee-chat-heart]");
  const sendButton = board.querySelector("[data-employee-chat-send]");
  const sendButtonLabel = sendButton?.querySelector(".visually-hidden") || null;
  const chatMediaModal = document.querySelector("[data-chat-media-modal]");
  const chatMediaModalAmbient = document.querySelector("[data-chat-media-modal-ambient]");
  const chatMediaModalStage = document.querySelector("[data-chat-media-modal-stage]");
  const chatMediaModalImage = document.querySelector("[data-chat-media-modal-image]");
  const chatMediaModalVideo = document.querySelector("[data-chat-media-modal-video]");
  const chatMediaModalZoom = document.querySelector("[data-chat-media-modal-zoom]");
  const chatMediaModalThumbs = document.querySelector("[data-chat-media-modal-thumbs]");
  const chatMediaZoomRange = document.querySelector("[data-chat-media-zoom-range]");
  const chatMediaZoomIn = document.querySelector("[data-chat-media-zoom-in]");
  const chatMediaZoomOut = document.querySelector("[data-chat-media-zoom-out]");
  const chatMediaZoomLabel = document.querySelector("[data-chat-media-zoom-label]");
  const chatMediaModalClose = document.querySelector("[data-chat-media-modal-close]");
  const chatMediaModalPrev = document.querySelector('[data-chat-media-nav="prev"]');
  const chatMediaModalNext = document.querySelector('[data-chat-media-nav="next"]');
  const deleteModalOverlay = document.querySelector("[data-chat-delete-modal-overlay]");
  const deleteModalClose = document.querySelector("[data-chat-delete-modal-close]");
  const deleteModalCancel = document.querySelector("[data-chat-delete-modal-cancel]");
  const deleteModalConfirm = document.querySelector("[data-chat-delete-modal-confirm]");
  const deleteModalCopy = document.querySelector("[data-chat-delete-modal-copy]");
  const liveChatNotificationMenu = document.querySelector("[data-live-chat-notification-menu]");
  const liveChatNotificationToggle = document.querySelector("[data-live-chat-notification-toggle]");
  const liveChatNotificationDropdown = document.querySelector("[data-live-chat-notification-dropdown]");
  const conversationMenu = board.querySelector("[data-employee-chat-conversation-menu]");
  const conversationMenuToggle = board.querySelector("[data-employee-chat-conversation-toggle]");
  const conversationMenuDropdown = board.querySelector("[data-employee-chat-conversation-dropdown]");
  const liveChatHeroTools = document.querySelector(".live-chat-hero-tools");
  const liveChatMenuToggle = document.querySelector("[data-live-chat-menu-toggle]");
  const liveChatProfilePanel = document.querySelector("[data-live-chat-profile-panel]");
  const liveChatSideAvatar = document.querySelector("[data-live-chat-side-avatar]");
  const liveChatSideName = document.querySelector("[data-live-chat-side-name]");
  const liveChatSideStatus = document.querySelector("[data-live-chat-side-status]");
  const liveChatSideStatusDot = document.querySelector("[data-live-chat-side-status-dot]");
  const liveChatSideAbout = document.querySelector("[data-live-chat-side-about]");
  const liveChatSideMedia = document.querySelector("[data-live-chat-side-media]");
  const liveChatSideFiles = document.querySelector("[data-live-chat-side-files]");
  const liveChatStockShell = document.querySelector(".live-chat-stock-shell");
  const liveChatStockSearchInput = document.querySelector("[data-live-chat-stock-search]");
  const liveChatStockList = document.querySelector("[data-live-chat-stock-list]");
  const conversationTabButtons = Array.from(
    board.querySelectorAll("[data-employee-chat-tab]"),
  );
  const conversationTabPanels = Array.from(
    board.querySelectorAll("[data-employee-chat-tab-panel]"),
  );
  const mediaPanel = board.querySelector("[data-employee-chat-media-panel]");
  const profilePanel = board.querySelector("[data-employee-chat-profile-panel]");
  const historyPanel = board.querySelector("[data-employee-chat-history-panel]");
  let chatSearchTimer = 0;
  let liveChatStockSearchTimer = 0;

  function readLiveChatTargetFromUrl() {
    if (!isLiveChatPage) {
      return null;
    }

    const params = new URLSearchParams(window.location.search);
    const target = {
      threadId: String(params.get("thread") || params.get("threadId") || "").trim(),
      orderId: String(params.get("order") || params.get("orderId") || "").trim(),
      customer: String(params.get("customer") || params.get("customerName") || "").trim(),
      productId: String(params.get("productId") || "").trim(),
      product: String(params.get("product") || params.get("productName") || "").trim(),
    };

    return Object.values(target).some(Boolean) ? target : null;
  }

  const state = {
    threads: [],
    orders: [],
    activeThreadId: "",
    activeConversationTab: "conversation",
    isSending: false,
    isLoadingThreads: false,
    isLoadingOrders: false,
    hasLoadedOrders: false,
    ordersLoadError: false,
    pendingThreadReload: false,
    lastRenderedThreadId: "",
    lastThreadListSignature: "",
    lastConversationSignature: "",
    searchQuery: "",
    stockProducts: [],
    stockSearchQuery: "",
    shouldStickToBottom: false,
    pendingSupportReadSignature: "",
    lastMarkedSupportReadSignature: "",
    pendingMedia: [],
    pendingReply: null,
    pendingEdit: null,
    pendingDelete: null,
    activeChatMedia: null,
    activeChatMediaItems: [],
    activeChatMediaIndex: -1,
    activeChatMediaZoom: 100,
    replyJumpStartTimeoutId: 0,
    replyJumpHighlightTimeoutId: 0,
    activeBubbleTimeMessageId: "",
    activeMediaDetailsMessageId: "",
    scrollDownButtonHideTimeoutId: 0,
    scrollDownButtonShowTimeoutId: 0,
    lastMessageListScrollTop: 0,
    seenIndicatorMessageIdsByThread: Object.create(null),
    seenIndicatorReadAtByThread: Object.create(null),
    seenIndicatorInitializedThreadIds: Object.create(null),
    initialThreadTarget: readLiveChatTargetFromUrl(),
    initialThreadTargetApplied: false,
    pinnedProductExpandedByThread: Object.create(null),
    supportTypingClearTimeoutId: 0,
    supportTypingLastSentAt: 0,
    supportTypingThreadId: "",
  };

  function applyLiveChatInventoryPanelState() {
    if (!isLiveChatPage || !liveChatStockShell) {
      return;
    }

    liveChatStockShell.hidden = false;
    document.documentElement.classList.remove("live-chat-inventory-hidden");
    document.body?.classList.remove("live-chat-inventory-hidden");
  }

  function applyAdminReadOnlyChatMode() {
    if (!isAdminLiveChatReadOnly) {
      document.documentElement.classList.remove("admin-live-chat-readonly");
      document.body?.classList.remove("admin-live-chat-readonly");
      board.removeAttribute("data-live-chat-readonly");

      if (form) {
        form.hidden = false;
        form.removeAttribute("aria-hidden");
      }

      [input, mediaInput].forEach((control) => {
        if (control) {
          control.disabled = false;
        }
      });

      [mediaButton, composePlusButton, heartButton, sendButton].forEach((button) => {
        if (button) {
          button.disabled = false;
          button.setAttribute("aria-disabled", "false");
        }
      });
      updateSendButtonState();
      return;
    }

    document.documentElement.classList.add("admin-live-chat-readonly");
    document.body?.classList.add("admin-live-chat-readonly");
    board.setAttribute("data-live-chat-readonly", "true");

    if (form) {
      form.hidden = true;
      form.setAttribute("aria-hidden", "true");
    }

    [input, mediaInput].forEach((control) => {
      if (control) {
        control.disabled = true;
      }
    });

    [mediaButton, composePlusButton, heartButton, sendButton].forEach((button) => {
      if (button) {
        button.disabled = true;
        button.setAttribute("aria-disabled", "true");
      }
    });
  }

  applyLiveChatInventoryPanelState();
  applyAdminReadOnlyChatMode();

  function syncLiveChatAccessFromSession(session = readStoredEmployeeSession()) {
    syncLiveChatAccessState(session, readStoredAdminSession());
    applyLiveChatInventoryPanelState();
    applyAdminReadOnlyChatMode();
  }

  window.addEventListener("gms-employee-session-updated", (event) => {
    syncLiveChatAccessFromSession(event?.detail?.session || readStoredEmployeeSession());
  });

  window.addEventListener("gms-admin-session-updated", (event) => {
    syncLiveChatAccessState(readStoredEmployeeSession(), event?.detail?.session || readStoredAdminSession());
    applyLiveChatInventoryPanelState();
    applyAdminReadOnlyChatMode();
  });

  if (window.gmsEmployeeAccessReady && typeof window.gmsEmployeeAccessReady.then === "function") {
    window.gmsEmployeeAccessReady
      .then((session) => {
        syncLiveChatAccessFromSession(session || readStoredEmployeeSession());
      })
      .catch(() => {
        syncLiveChatAccessFromSession();
      });
  }

  window.addEventListener("focus", () => {
    if (
      !isLiveChatPage ||
      !hasEmployeeWorkspaceSession(storedEmployeeSession) ||
      typeof window.gmsRefreshEmployeeAccessSession !== "function"
    ) {
      return;
    }

    window.gmsRefreshEmployeeAccessSession()
      .then((session) => {
        syncLiveChatAccessFromSession(session || readStoredEmployeeSession());
      })
      .catch(() => {
        syncLiveChatAccessFromSession();
      });
  });

  if (liveChatHeroTools) {
    liveChatHeroTools
      .querySelectorAll("[data-notification-menu]")
      .forEach((menu) => menu.remove());
  }

  function parseValidDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date;
  }

  function closeLiveChatNotificationMenu() {
    if (liveChatNotificationToggle) {
      liveChatNotificationToggle.setAttribute("aria-expanded", "false");
    }
    if (liveChatNotificationDropdown) {
      liveChatNotificationDropdown.hidden = true;
    }
  }

  function closeLiveChatNavMenu() {
    document.body?.classList.remove("live-chat-nav-open");
    if (liveChatMenuToggle) {
      liveChatMenuToggle.setAttribute("aria-expanded", "false");
    }
  }

  function toggleLiveChatNavMenu() {
    const nextIsOpen = !document.body?.classList.contains("live-chat-nav-open");
    document.body?.classList.toggle("live-chat-nav-open", nextIsOpen);
    if (liveChatMenuToggle) {
      liveChatMenuToggle.setAttribute("aria-expanded", nextIsOpen ? "true" : "false");
    }
  }

  function toggleLiveChatNotificationMenu() {
    if (!liveChatNotificationToggle || !liveChatNotificationDropdown) {
      return;
    }

    const nextIsOpen =
      liveChatNotificationToggle.getAttribute("aria-expanded") !== "true";
    if (nextIsOpen) {
      closeConversationMenu();
    }
    liveChatNotificationToggle.setAttribute("aria-expanded", nextIsOpen ? "true" : "false");
    liveChatNotificationDropdown.hidden = !nextIsOpen;
  }

  function closeConversationMenu() {
    if (conversationMenuToggle) {
      conversationMenuToggle.setAttribute("aria-expanded", "false");
    }
    if (conversationMenuDropdown) {
      conversationMenuDropdown.hidden = true;
    }
  }

  function toggleConversationMenu() {
    if (!conversationMenuToggle || !conversationMenuDropdown) {
      return;
    }

    const nextIsOpen = conversationMenuToggle.getAttribute("aria-expanded") !== "true";
    if (nextIsOpen) {
      closeLiveChatNotificationMenu();
    }
    conversationMenuToggle.setAttribute("aria-expanded", nextIsOpen ? "true" : "false");
    conversationMenuDropdown.hidden = !nextIsOpen;
  }

  function closeMessageActionMenus(options = {}) {
    if (!messageList) {
      return;
    }

    const keepMenu = options.keepMenu || null;
    messageList
      .querySelectorAll("[data-employee-chat-action-dropdown]")
      .forEach((menu) => {
        const shouldKeepOpen = Boolean(keepMenu && menu === keepMenu);
        menu.hidden = !shouldKeepOpen;
        const toggle = menu
          .closest("[data-employee-chat-action-menu]")
          ?.querySelector("[data-employee-chat-action-menu-toggle]");
        if (toggle) {
          toggle.setAttribute("aria-expanded", shouldKeepOpen ? "true" : "false");
        }
      });
  }

  function isMessageListNearBottom(threshold = 56) {
    if (!messageList) {
      return true;
    }

    return messageList.scrollHeight - (messageList.scrollTop + messageList.clientHeight) <= threshold;
  }

  function clearScrollDownButtonHideTimeout() {
    if (state.scrollDownButtonHideTimeoutId) {
      window.clearTimeout(state.scrollDownButtonHideTimeoutId);
      state.scrollDownButtonHideTimeoutId = 0;
    }
  }

  function clearScrollDownButtonShowTimeout() {
    if (state.scrollDownButtonShowTimeoutId) {
      window.clearTimeout(state.scrollDownButtonShowTimeoutId);
      state.scrollDownButtonShowTimeoutId = 0;
    }
  }

  function showScrollDownButton(options = {}) {
    if (!scrollDownButton) {
      return;
    }

    const animate = options.animate === true;
    clearScrollDownButtonHideTimeout();
    clearScrollDownButtonShowTimeout();
    scrollDownButton.hidden = false;
    scrollDownButton.setAttribute("aria-hidden", "false");
    scrollDownButton.classList.remove("is-hiding");

    if (!animate) {
      scrollDownButton.classList.remove("is-entering");
      scrollDownButton.classList.add("is-visible");
      return;
    }

    scrollDownButton.classList.remove("is-visible", "is-entering");
    void scrollDownButton.offsetWidth;
    scrollDownButton.classList.add("is-visible", "is-entering");
    state.scrollDownButtonShowTimeoutId = window.setTimeout(() => {
      scrollDownButton.classList.remove("is-entering");
      state.scrollDownButtonShowTimeoutId = 0;
    }, SCROLL_DOWN_BUTTON_SHOW_DURATION_MS);
  }

  function hideScrollDownButton(options = {}) {
    if (!scrollDownButton) {
      return;
    }

    const immediate = options.immediate === true;
    clearScrollDownButtonHideTimeout();
    clearScrollDownButtonShowTimeout();
    scrollDownButton.setAttribute("aria-hidden", "true");

    if (immediate || scrollDownButton.hidden) {
      scrollDownButton.classList.remove("is-visible", "is-hiding", "is-entering");
      scrollDownButton.hidden = true;
      return;
    }

    scrollDownButton.classList.remove("is-entering");
    scrollDownButton.classList.remove("is-visible");
    scrollDownButton.classList.add("is-hiding");
    state.scrollDownButtonHideTimeoutId = window.setTimeout(() => {
      scrollDownButton.classList.remove("is-hiding");
      scrollDownButton.hidden = true;
      state.scrollDownButtonHideTimeoutId = 0;
    }, SCROLL_DOWN_BUTTON_HIDE_DURATION_MS);
  }

  function updateScrollDownButtonVisibility(options = {}) {
    if (!scrollDownButton) {
      return;
    }

    const activeThread = getThreadById(state.activeThreadId);
    const hasScrollableOverflow = Boolean(
      messageList && messageList.scrollHeight > messageList.clientHeight + 24,
    );
    const shouldShow =
      Boolean(activeThread) &&
      state.activeConversationTab === "conversation" &&
      hasScrollableOverflow &&
      !isMessageListNearBottom();

    if (!Boolean(activeThread) || state.activeConversationTab !== "conversation" || !hasScrollableOverflow) {
      hideScrollDownButton({ immediate: options.immediateHide === true });
      return;
    }

    if (shouldShow) {
      const shouldAnimateShow = options.animateShow === true;
      const isAlreadyVisible =
        !scrollDownButton.hidden && scrollDownButton.classList.contains("is-visible");
      if (!isAlreadyVisible) {
        showScrollDownButton({ animate: shouldAnimateShow });
      }
      return;
    }

    hideScrollDownButton({ immediate: options.immediateHide === true });
  }

  function scrollConversationToBottom(options = {}) {
    if (!messageList) {
      return;
    }

    const behavior = options.behavior === "smooth" ? "smooth" : "auto";
    hideScrollDownButton();

    if (typeof messageList.scrollTo === "function") {
      messageList.scrollTo({
        top: messageList.scrollHeight,
        behavior,
      });
    } else {
      messageList.scrollTop = messageList.scrollHeight;
    }
  }

  function toggleMessageActionMenu(toggleButton) {
    if (!(toggleButton instanceof HTMLElement)) {
      return;
    }

    const actionMenu = toggleButton.closest("[data-employee-chat-action-menu]");
    const dropdown = actionMenu?.querySelector("[data-employee-chat-action-dropdown]");
    if (!(dropdown instanceof HTMLElement)) {
      return;
    }

    const shouldOpen = dropdown.hidden;
    closeMessageActionMenus();
    dropdown.hidden = !shouldOpen;
    toggleButton.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
  }

  function syncModalOpenState() {
    const hasOpenModal =
      Boolean(chatMediaModal && !chatMediaModal.hidden) ||
      Boolean(deleteModalOverlay && !deleteModalOverlay.hidden);
    document.body.classList.toggle("modal-open", hasOpenModal);
  }

  function isSameCalendarDay(leftValue, rightValue) {
    const leftDate =
      leftValue instanceof Date ? leftValue : parseValidDate(leftValue);
    const rightDate =
      rightValue instanceof Date ? rightValue : parseValidDate(rightValue);

    if (!leftDate || !rightDate) {
      return false;
    }

    return (
      leftDate.getFullYear() === rightDate.getFullYear() &&
      leftDate.getMonth() === rightDate.getMonth() &&
      leftDate.getDate() === rightDate.getDate()
    );
  }

  function getCalendarDayKey(value) {
    const date = value instanceof Date ? value : parseValidDate(value);
    if (!date) {
      return "";
    }

    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  function hasTimestampGap(currentValue, previousValue, minimumGapMs = 60 * 60 * 1000) {
    const currentDate =
      currentValue instanceof Date ? currentValue : parseValidDate(currentValue);
    const previousDate =
      previousValue instanceof Date ? previousValue : parseValidDate(previousValue);

    if (!currentDate) {
      return false;
    }

    if (!previousDate) {
      return true;
    }

    return currentDate.getTime() - previousDate.getTime() >= minimumGapMs;
  }

  function formatTimestamp(value, options = {}) {
    const date = parseValidDate(value);
    if (!date) {
      return "";
    }

    if (options.includeDate === true) {
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    }

    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatMoney(originalPrice, salesPrice) {
    const displayPrice =
      typeof salesPrice === "number" &&
      salesPrice >= 0 &&
      salesPrice < originalPrice
        ? salesPrice
        : originalPrice;

    if (typeof displayPrice !== "number" || Number.isNaN(displayPrice)) {
      return "";
    }

    return `PHP ${displayPrice.toLocaleString("en-US", {
      minimumFractionDigits: displayPrice % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function formatCurrencyValue(value) {
    if (value === null || value === undefined || value === "") {
      return "";
    }

    const normalizedValue = Number(value);
    if (!Number.isFinite(normalizedValue)) {
      return "";
    }

    return `PHP ${normalizedValue.toLocaleString("en-US", {
      minimumFractionDigits: normalizedValue % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function formatPesoSignValue(value) {
    if (value === null || value === undefined || value === "") {
      return "";
    }

    const normalizedValue = Number(value);
    if (!Number.isFinite(normalizedValue)) {
      return "";
    }

    return `₱${normalizedValue.toLocaleString("en-US", {
      minimumFractionDigits: normalizedValue % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function formatPinnedProductPrice(originalPrice, salesPrice) {
    const displayPrice =
      typeof salesPrice === "number" &&
      salesPrice >= 0 &&
      salesPrice < originalPrice
        ? salesPrice
        : originalPrice;

    return formatPesoSignValue(displayPrice);
  }

  function formatOptionalDate(value, fallback = "Not recorded yet") {
    const normalizedValue = String(value ?? "").trim();
    if (!normalizedValue) {
      return fallback;
    }

    const date = new Date(normalizedValue);
    if (Number.isNaN(date.getTime())) {
      return fallback;
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeAiMessageText(value) {
    let text = String(value ?? "").trim();
    if (!text) {
      return text;
    }

    text = text
      .replace(/^```(?:text|markdown)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    text = text.replace(/\*\*([^*\n]+)\*\*/g, "$1");
    text = text.replace(/__([^_\n]+)__/g, "$1");
    text = text.replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, "$1");
    text = text.replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, "$1");
    text = text.replace(/`([^`\n]+)`/g, "$1");
    text = text.replace(/^\s{0,3}#{1,6}\s+/gm, "");
    text = text.replace(/^\s*[-*+]\s+/gm, "");
    text = text.replace(/^\s*\d+\.\s+/gm, "");
    text = text.replace(/[*_`~]/g, "");
    text = text.replace(/[ \t]{2,}/g, " ");

    return text.trim();
  }

  function displayChatMessageText(message) {
    const raw = String(message?.text || "").trim();
    if (!raw || String(message?.source || "").trim().toLowerCase() !== "ai") {
      return raw;
    }
    return normalizeAiMessageText(raw);
  }

  function openChatMessageTranslate(message) {
    const normalized = displayChatMessageText(message).trim();
    if (!normalized) {
      return;
    }
    const translateUrl = `https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent(normalized)}&op=translate`;
    window.open(translateUrl, "_blank", "noopener,noreferrer");
  }

  function isVideoAttachment(url, name = "") {
    const normalizedUrl = String(url || "").trim().toLowerCase();
    const normalizedName = String(name || "").trim().toLowerCase();
    const videoExtensions = [".mp4", ".mov", ".m4v", ".webm", ".avi", ".mkv", ".3gp"];
    return videoExtensions.some(
      (extension) =>
        normalizedUrl.endsWith(extension) || normalizedName.endsWith(extension),
    );
  }

  function normalizeHeartText(value) {
    return String(value || "")
      .replace(/\uFE0F/g, "")
      .replace(/\u200D/g, "")
      .trim();
  }

  function isQuickHeartMessage(message) {
    if (String(message?.imageUrl || "").trim()) {
      return false;
    }

    return normalizeHeartText(message?.text) === "\u2764";
  }

  function isEmojiOnlyText(value) {
    const normalizedText = String(value || "").trim();
    if (!normalizedText) {
      return false;
    }

    const compactText = normalizedText.replace(/\s+/g, "");
    return (
      /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(compactText) &&
      /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\uFE0F|\u200D|\u{1F3FB}|\u{1F3FC}|\u{1F3FD}|\u{1F3FE}|\u{1F3FF})+$/u.test(compactText)
    );
  }

  function formatOptionalTimestamp(value) {
    const normalizedValue = String(value ?? "").trim();
    return normalizedValue ? formatTimestamp(normalizedValue) : "";
  }

  function getLiveChatStockCount(product) {
    const stock = Number(
      product?.inventoryStock ??
      product?.totalStock ??
      product?.stock ??
      0,
    );
    return Number.isFinite(stock) && stock >= 0 ? Math.trunc(stock) : 0;
  }

  function getLiveChatProductCategory(product) {
    if (Array.isArray(product?.categories) && product.categories.length) {
      return String(product.categories[0] || "").trim() || "General";
    }

    return String(product?.category || "General").trim() || "General";
  }

  function getLiveChatProductPrice(product) {
    const salesPrice = Number(product?.salesPrice);
    if (Number.isFinite(salesPrice) && salesPrice >= 0) {
      return salesPrice;
    }

    const originalPrice = Number(product?.originalPrice ?? product?.price ?? 0);
    return Number.isFinite(originalPrice) && originalPrice >= 0 ? originalPrice : 0;
  }

  function getLiveChatProductImageUrl(product) {
    const directSources = [
      product?.cardImageUrl,
      product?.mainImageUrl,
      product?.imageUrl,
      product?.buyModalImageUrl,
    ];

    for (const source of directSources) {
      const normalizedSource = String(source || "").trim();
      if (normalizedSource) {
        return normalizedSource;
      }
    }

    if (Array.isArray(product?.imageUrls)) {
      const galleryImage = product.imageUrls.find((value) => String(value || "").trim());
      if (galleryImage) {
        return String(galleryImage).trim();
      }
    }

    return "";
  }

  function isLiveChatStockExpired(product) {
    const expiryDate = String(product?.expiryDate || "").trim();
    if (!expiryDate) {
      return false;
    }

    const date = new Date(expiryDate);
    if (Number.isNaN(date.getTime())) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date.getTime() < today.getTime();
  }

  function isLiveChatStockNearExpiry(product) {
    const expiryDate = String(product?.expiryDate || "").trim();
    if (!expiryDate || isLiveChatStockExpired(product)) {
      return false;
    }

    const date = new Date(expiryDate);
    if (Number.isNaN(date.getTime())) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000);
    return diffDays >= 0 && diffDays <= 365;
  }

  function getLiveChatStockState(product) {
    if (isLiveChatStockExpired(product)) {
      return { label: "Expired", className: "is-empty" };
    }

    const stock = getLiveChatStockCount(product);
    if (stock <= 0) {
      return { label: "Out of Stock", className: "is-empty" };
    }

    if (stock <= 10) {
      return { label: "Low Stock", className: "is-low" };
    }

    return { label: "Healthy", className: "is-healthy" };
  }

  function createLiveChatPlaceholder(title, copy) {
    const emptyState = document.createElement("div");
    emptyState.className = "employee-chat-placeholder";

    const heading = document.createElement("strong");
    heading.textContent = title;

    const message = document.createElement("p");
    message.textContent = copy;

    emptyState.append(heading, message);
    return emptyState;
  }

  function createLiveChatStockMetaRow(label, value) {
    const row = document.createElement("div");
    row.className = "dashboard-info-row";

    const labelEl = document.createElement("span");
    labelEl.textContent = label;

    const valueEl = document.createElement("strong");
    valueEl.textContent = value;

    row.append(labelEl, valueEl);
    return row;
  }

  function createLiveChatStockCard(product, options = {}) {
    const { isLinked = false } = options;
    const article = document.createElement("article");
    article.className = "stock-product-card";
    article.classList.toggle("is-linked", isLinked);

    const header = document.createElement("div");
    header.className = "stock-product-card__header";

    const media = document.createElement("div");
    media.className = "stock-product-card__media";
    const imageUrl = getLiveChatProductImageUrl(product);
    if (imageUrl) {
      const image = document.createElement("img");
      image.src = imageUrl;
      image.alt = String(product?.name || "Product image").trim() || "Product image";
      media.appendChild(image);
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "stock-product-card__placeholder";
      placeholder.textContent = "No image";
      media.appendChild(placeholder);
    }

    const titleWrap = document.createElement("div");
    titleWrap.className = "stock-product-card__title";

    const title = document.createElement("h3");
    title.textContent = String(product?.name || "Unnamed Product").trim() || "Unnamed Product";

    const subtitle = document.createElement("p");
    subtitle.textContent = `${getLiveChatProductCategory(product)} - ${formatCurrencyValue(getLiveChatProductPrice(product)) || "Price unavailable"}`;

    titleWrap.append(title, subtitle);
    header.append(media, titleWrap);

    const stateConfig = getLiveChatStockState(product);
    const chipGroup = document.createElement("div");
    chipGroup.className = "stock-chip-group";

    const stateChip = document.createElement("span");
    stateChip.className = `stock-chip ${stateConfig.className}`;
    stateChip.textContent = stateConfig.label;
    chipGroup.appendChild(stateChip);

    if (isLiveChatStockNearExpiry(product)) {
      const expiryChip = document.createElement("span");
      expiryChip.className = "stock-chip is-near-expiry";
      expiryChip.textContent = "Near Expiry";
      chipGroup.appendChild(expiryChip);
    }

    if (isLinked) {
      const linkedChip = document.createElement("span");
      linkedChip.className = "stock-chip is-new";
      linkedChip.textContent = "In Chat";
      chipGroup.appendChild(linkedChip);
    }

    const stock = getLiveChatStockCount(product);
    const meter = document.createElement("div");
    meter.className = "stock-meter";

    const meterFill = document.createElement("span");
    meterFill.className = `stock-meter__fill ${stateConfig.className}`;
    const width = stock <= 0 ? 0 : Math.max(8, Math.round((Math.min(stock, 50) / 50) * 100));
    meterFill.style.width = `${Math.min(width, 100)}%`;
    meter.appendChild(meterFill);

    const meta = document.createElement("div");
    meta.className = "stock-product-card__meta";
    meta.append(
      createLiveChatStockMetaRow("Stock", `${stock} unit${stock === 1 ? "" : "s"}`),
      createLiveChatStockMetaRow("Expiry", formatOptionalDate(product?.expiryDate)),
      createLiveChatStockMetaRow("Updated", formatOptionalTimestamp(product?.updatedAt) || "Not recorded yet"),
    );

    article.append(header, chipGroup, meter, meta);
    return article;
  }

  function renderLiveChatStockProducts() {
    if (!liveChatStockList) {
      return;
    }

    const activeThread = getThreadById(state.activeThreadId);
    const activeProductId = String(activeThread?.productId || "").trim();
    const normalizedQuery = String(state.stockSearchQuery || "").trim().toLowerCase();
    const filteredProducts = state.stockProducts
      .filter((product) => {
        if (!normalizedQuery) {
          return true;
        }

        const haystack = [
          product?.name || "",
          getLiveChatProductCategory(product),
          String(product?.id || ""),
          String(getLiveChatStockCount(product)),
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedQuery);
      })
      .sort((left, right) => {
        const leftIsLinked = String(left?.id || "").trim() === activeProductId;
        const rightIsLinked = String(right?.id || "").trim() === activeProductId;
        if (leftIsLinked !== rightIsLinked) {
          return leftIsLinked ? -1 : 1;
        }

        const leftState = getLiveChatStockState(left).label;
        const rightState = getLiveChatStockState(right).label;
        const order = {
          "Out of Stock": 0,
          "Expired": 1,
          "Low Stock": 2,
          Healthy: 3,
        };
        if ((order[leftState] ?? 99) !== (order[rightState] ?? 99)) {
          return (order[leftState] ?? 99) - (order[rightState] ?? 99);
        }

        return String(left?.name || "").localeCompare(String(right?.name || ""));
      });

    liveChatStockList.replaceChildren();

    if (!filteredProducts.length) {
      liveChatStockList.appendChild(
        createLiveChatPlaceholder(
          "No stock found",
          normalizedQuery
            ? "No products match the current stock search."
            : "No stock products are available right now.",
        ),
      );
      return;
    }

    filteredProducts.forEach((product) => {
      liveChatStockList.appendChild(
        createLiveChatStockCard(product, {
          isLinked: String(product?.id || "").trim() === activeProductId,
        }),
      );
    });
  }

  async function loadLiveChatStockProducts() {
    if (!liveChatStockList) {
      return;
    }

    try {
      const response = await fetch("/api/products", {
        headers: withEmployeeDashboardAdminHeaders({
          Accept: "application/json",
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Unable to load stock.");
      }

      state.stockProducts = Array.isArray(data?.products) ? data.products : [];
      renderLiveChatStockProducts();
    } catch (error) {
      if (!state.stockProducts.length) {
        liveChatStockList.replaceChildren(
          createLiveChatPlaceholder(
            "Unable to load stock",
            "Check the backend connection, then refresh this page.",
          ),
        );
      }
    }
  }

  function normalizeConversationTab(value) {
    const normalizedValue = String(value || "").trim().toLowerCase();
    return ["conversation", "media", "profile", "history"].includes(normalizedValue)
      ? normalizedValue
      : "conversation";
  }

  function setActiveConversationTab(tab) {
    state.activeConversationTab = normalizeConversationTab(tab);

    conversationTabButtons.forEach((button) => {
      const isActive =
        normalizeConversationTab(button.dataset.employeeChatTab) ===
        state.activeConversationTab;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
      button.tabIndex = isActive ? 0 : -1;
    });

    conversationTabPanels.forEach((panel) => {
      panel.hidden =
        normalizeConversationTab(panel.dataset.employeeChatTabPanel) !==
        state.activeConversationTab;
    });

    if (state.activeConversationTab === "conversation" && messageList) {
      window.requestAnimationFrame(() => {
        scrollConversationToBottom();
        state.lastMessageListScrollTop = messageList.scrollTop;
        updateScrollDownButtonVisibility({ immediateHide: true });
      });
      return;
    }

    hideScrollDownButton({ immediate: true });
  }

  function createInfoFieldMarkup(label, value) {
    return `
      <div class="live-chat-info-list__item">
        <dt>${escapeHtml(label)}</dt>
        <dd>${escapeHtml(value)}</dd>
      </div>
    `;
  }

  function isDeletedMessage(message) {
    return Boolean(String(message?.deletedAt || "").trim());
  }

  function getMessageHistoryTitle(message, thread) {
    const actor = message?.isFromSupport === true
      ? "You"
      : getThreadCustomerDisplayName(thread);

    if (isDeletedMessage(message)) {
      return `${actor} deleted a message`;
    }

    if (isQuickHeartMessage(message)) {
      return `${actor} sent a heart`;
    }

    if (String(message?.imageUrl || "").trim()) {
      return `${actor} sent ${isVideoAttachment(message.imageUrl, message.imageName) ? "a video" : "a photo"}`;
    }

    return `${actor} sent a message`;
  }

  function getMessageHistoryPreview(message) {
    if (isDeletedMessage(message)) {
      return message?.isFromSupport === true
        ? "You deleted a message"
        : "Message deleted";
    }

    const messageText = String(message?.text || "").trim();
    if (messageText) {
      return messageText;
    }

    const imageUrl = String(message?.imageUrl || "").trim();
    if (imageUrl) {
      const imageName = String(message?.imageName || "").trim();
      if (imageName) {
        return imageName;
      }

      return isVideoAttachment(imageUrl, message?.imageName)
        ? "Video attachment"
        : "Photo attachment";
    }

    return "No preview available.";
  }

  function getReplyPreviewText(message) {
    if (isDeletedMessage(message)) {
      return message?.isFromSupport === true
        ? "You deleted a message"
        : "Message deleted";
    }

    if (isQuickHeartMessage(message)) {
      return "Heart";
    }

    const messageText = String(message?.text || "").trim();
    if (messageText) {
      return messageText;
    }

    const imageUrl = String(message?.imageUrl || "").trim();
    if (imageUrl) {
      return isVideoAttachment(imageUrl, message?.imageName)
        ? "Video attachment"
        : "Photo attachment";
    }

    return "Message";
  }

  function getDeleteMessageCopy(message) {
    const previewText = String(getReplyPreviewText(message) || "").trim();
    if (!previewText) {
      return "This message will be marked as deleted in the conversation.";
    }

    const compactPreview =
      previewText.length > 72 ? `${previewText.slice(0, 69).trimEnd()}...` : previewText;
    return `This will mark "${compactPreview}" as deleted in the conversation.`;
  }

  function getMessageReplyMeta(message) {
    const messageId = String(message?.replyTo?.messageId || "").trim();
    const senderLabel = String(message?.replyTo?.senderLabel || "").trim();
    const previewText = String(message?.replyTo?.previewText || "").trim();
    if (!messageId || !senderLabel || !previewText) {
      return null;
    }

    return {
      messageId,
      senderLabel,
      previewText,
    };
  }

  function getReplyLineLabel(replyMeta, isSupportMessage) {
    const senderLabel = String(replyMeta?.senderLabel || "").trim();
    if (!senderLabel) {
      return "";
    }

    if (isSupportMessage) {
      if (senderLabel.toLowerCase() === "you") {
        return "You replied to yourself";
      }

      return `You replied to ${senderLabel}`;
    }

    return senderLabel.toLowerCase() === "you"
      ? "Replied to you"
      : `Replied to ${senderLabel}`;
  }

  function getReplyComposerLabel(senderLabel) {
    const normalizedSenderLabel = String(senderLabel || "").trim();
    if (!normalizedSenderLabel) {
      return "";
    }

    return normalizedSenderLabel.toLowerCase() === "you"
      ? "Replying to yourself"
      : `Replying to ${normalizedSenderLabel}`;
  }

  function getInitialsFromText(value, fallback = "S") {
    const words = String(value || "")
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const initials = words
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("");
    return initials || fallback;
  }

  function getSupportMessageSenderName(message) {
    if (message?.isFromSupport !== true) {
      return "";
    }

    const messageSource = String(message?.source || "").trim().toLowerCase();
    if (messageSource === "ai") {
      return "AI Assistant";
    }

    return [
      message?.senderName,
      message?.senderDisplayName,
      message?.supportSenderName,
      message?.employeeName,
      message?.adminName,
      message?.sender?.displayName,
      message?.sender?.name,
      message?.sender?.fullName,
    ]
      .map(normalizeEmployeeDashboardDisplayText)
      .find(Boolean) || "Support";
  }

  function getSupportMessageSenderAvatarUrl(message) {
    return [
      message?.senderAvatarUrl,
      message?.sender?.avatarUrl,
      message?.sender?.profileImageUrl,
      message?.sender?.photoUrl,
    ]
      .map((value) => String(value ?? "").trim())
      .find(Boolean) || "";
  }

  function buildSupportMessageAvatarMarkup(message) {
    const senderName = getSupportMessageSenderName(message);
    const avatarUrl = getSupportMessageSenderAvatarUrl(message);
    const initials = getInitialsFromText(
      senderName,
      String(message?.source || "").trim().toLowerCase() === "ai" ? "AI" : "S",
    );
    const content = avatarUrl
      ? `<img src="${escapeHtml(avatarUrl)}" alt="" loading="lazy" />`
      : escapeHtml(initials);
    return `<div class="employee-chat-message__avatar-badge is-support" title="${escapeHtml(senderName)}" aria-label="${escapeHtml(senderName)}">${content}</div>`;
  }

  function buildSupportMessageSenderLabelMarkup(message) {
    const senderName = getSupportMessageSenderName(message);
    if (!senderName) {
      return "";
    }

    return `<div class="employee-chat-message__sender-label" title="${escapeHtml(senderName)}">${escapeHtml(senderName)}</div>`;
  }

  function normalizeOrderMatchValue(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function hasUsefulOrderCustomerToken(token) {
    const normalizedToken = normalizeOrderMatchValue(token);
    return Boolean(
      normalizedToken &&
      !["app user", "appuser", "customer", "customer local", "customerlocal"].includes(
        normalizedToken,
      ),
    );
  }

  function normalizeOrderStageToken(value) {
    return String(value || "")
      .trim()
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function getOrderStageLabel(value) {
    const token = normalizeOrderStageToken(value);
    const labelMap = {
      pending: "Pending",
      preparing: "Preparing",
      processing: "Processing",
      "to-pay": "To pay",
      "to-prepare": "To prepare",
      packed: "Packed",
      ready: "Ready",
      "ready-to-ship": "Ready to ship",
      "to-ship": "To ship",
      "in-transit": "In transit",
      shipped: "Shipped",
      "out-for-delivery": "Out for delivery",
      "to-receive": "To receive",
      delivered: "Delivered",
      completed: "Completed",
      "to-review": "To review",
      received: "Received",
      "customer-received": "Customer received",
      cancel: "Cancelled",
      cancelled: "Cancelled",
      canceled: "Cancelled",
      return: "Return",
      returned: "Returned",
      returns: "Returns",
      "return-request": "Return request",
    };

    if (labelMap[token]) {
      return labelMap[token];
    }

    return String(value || "Pending")
      .trim()
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/\s+/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase()) || "Pending";
  }

  function isArchivedOrderStage(value) {
    return [
      "delivered",
      "completed",
      "to-review",
      "received",
      "customer-received",
      "cancel",
      "cancelled",
      "canceled",
      "return",
      "returned",
      "returns",
      "return-request",
    ].includes(normalizeOrderStageToken(value));
  }

  function formatOrderPanelTimestamp(value, createdAtEpochMs = 0) {
    const normalizedValue = String(value || "").trim();
    let date = null;
    if (Number.isFinite(Number(createdAtEpochMs)) && Number(createdAtEpochMs) > 0) {
      date = new Date(Number(createdAtEpochMs));
    } else if (/^\d{10,13}$/.test(normalizedValue)) {
      date = new Date(Number(normalizedValue));
    } else if (normalizedValue) {
      date = new Date(normalizedValue);
    }

    if (!date || Number.isNaN(date.getTime())) {
      return "Unknown time";
    }

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function normalizeLiveChatOrderEntry(entry) {
    return {
      id: String(entry?.id || entry?.orderId || "").trim(),
      productId: String(entry?.productId || "").trim(),
      productName: String(entry?.productName || "Ordered item").trim() || "Ordered item",
      productImageUrl: String(entry?.productImageUrl || "").trim(),
      quantity: Math.max(1, Number(entry?.quantity || entry?.items || 0) || 1),
      createdAtEpochMs: Math.trunc(Number(entry?.createdAtEpochMs || 0) || 0),
      createdAt: String(entry?.createdAt || entry?.receivedAt || "").trim(),
      amount:
        Number(
          entry?.grandTotalAmount ??
          entry?.amount ??
          entry?.total ??
          entry?.price ??
          0,
        ) || 0,
      customerName: String(
        entry?.clientName || entry?.customerName || entry?.customer || "",
      ).trim(),
      contactNumber: String(
        entry?.clientContactNumber || entry?.contactNumber || "",
      ).trim(),
      address: String(entry?.clientAddress || entry?.address || "").trim(),
      courier: String(
        entry?.deliveryPartnerName || entry?.courier || entry?.deliveryProvider || "",
      ).trim(),
      paymentOptionLabel: String(
        entry?.paymentOptionLabel || entry?.payment || entry?.paymentMethod || "",
      ).trim(),
      status: String(entry?.stage || entry?.status || "Pending").trim() || "Pending",
    };
  }

  function groupLiveChatOrders(entries) {
    const groupsByKey = new Map();

    (Array.isArray(entries) ? entries : [])
      .map(normalizeLiveChatOrderEntry)
      .forEach((entry) => {
        if (!entry.id) {
          return;
        }

        const groupKey = entry.createdAtEpochMs > 0
          ? String(entry.createdAtEpochMs)
          : entry.id;

        if (!groupsByKey.has(groupKey)) {
          groupsByKey.set(groupKey, {
            groupKey,
            orderId: entry.id,
            createdAtEpochMs: entry.createdAtEpochMs,
            createdAt: entry.createdAt,
            customerName: entry.customerName,
            contactNumber: entry.contactNumber,
            address: entry.address,
            courier: entry.courier,
            paymentOptionLabel: entry.paymentOptionLabel,
            status: entry.status,
            amount: entry.amount,
            productImageUrl: entry.productImageUrl,
            entries: [],
          });
        }

        const group = groupsByKey.get(groupKey);
        group.entries.push(entry);
        if (!group.productImageUrl && entry.productImageUrl) {
          group.productImageUrl = entry.productImageUrl;
        }
        if (!group.customerName && entry.customerName) {
          group.customerName = entry.customerName;
        }
        if (!group.contactNumber && entry.contactNumber) {
          group.contactNumber = entry.contactNumber;
        }
        if (!group.address && entry.address) {
          group.address = entry.address;
        }
        if (!group.courier && entry.courier) {
          group.courier = entry.courier;
        }
        if (!group.paymentOptionLabel && entry.paymentOptionLabel) {
          group.paymentOptionLabel = entry.paymentOptionLabel;
        }
        if (!group.amount && entry.amount) {
          group.amount = entry.amount;
        }
      });

    return [...groupsByKey.values()].sort(
      (left, right) => right.createdAtEpochMs - left.createdAtEpochMs,
    );
  }

  function getLiveChatOrderGroupsForThread(thread) {
    if (!thread) {
      return [];
    }

    const customerToken = normalizeOrderMatchValue(getThreadCustomerDisplayName(thread));
    const productIdToken = normalizeOrderMatchValue(thread?.productId);
    const productNameToken = normalizeOrderMatchValue(getThreadProductDisplayName(thread));
    const shouldMatchCustomer = hasUsefulOrderCustomerToken(customerToken);

    return groupLiveChatOrders(state.orders).filter((group) => {
      const groupCustomerToken = normalizeOrderMatchValue(group.customerName);
      const hasCustomerMatch = Boolean(
        shouldMatchCustomer &&
        groupCustomerToken &&
        (
          groupCustomerToken === customerToken ||
          groupCustomerToken.includes(customerToken) ||
          customerToken.includes(groupCustomerToken)
        ),
      );

      const hasProductMatch = group.entries.some((entry) => {
        const entryProductIdToken = normalizeOrderMatchValue(entry.productId);
        const entryProductNameToken = normalizeOrderMatchValue(entry.productName);
        return Boolean(
          (productIdToken && entryProductIdToken === productIdToken) ||
          (productNameToken &&
            entryProductNameToken &&
            (
              entryProductNameToken === productNameToken ||
              entryProductNameToken.includes(productNameToken) ||
              productNameToken.includes(entryProductNameToken)
            )),
        );
      });

      return shouldMatchCustomer ? hasCustomerMatch : hasProductMatch;
    });
  }

  function getLiveChatOrderSummary(group) {
    const entries = Array.isArray(group?.entries) ? group.entries : [];
    const totalQuantity = entries.reduce(
      (sum, entry) => sum + Math.max(Number(entry.quantity || 0), 0),
      0,
    );
    const quantityLabel =
      totalQuantity === 1 ? "1 item" : `${totalQuantity.toLocaleString("en-US")} items`;
    const firstProductName = String(
      entries[0]?.productName || "Ordered item",
    ).trim() || "Ordered item";
    const productLabel = entries.length > 1
      ? `${firstProductName} +${entries.length - 1} more`
      : firstProductName;
    const paymentLabel = String(group?.paymentOptionLabel || "").trim();
    return [productLabel, quantityLabel, paymentLabel].filter(Boolean).join(" - ");
  }

  function getLiveChatOrderMediaMarkup(group) {
    const imageUrl = String(group?.productImageUrl || "").trim();
    const fallbackInitial =
      (String(group?.entries?.[0]?.productName || "O").trim().charAt(0).toUpperCase() || "O");
    return imageUrl
      ? `
        <div class="product-insight-rank-card__media insight-order-card__media">
          <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(group?.entries?.[0]?.productName || "Ordered item")}" loading="lazy" />
        </div>
      `
      : `
        <div class="product-insight-rank-card__media insight-order-card__media">
          <span class="insight-order-card__media-fallback">${escapeHtml(fallbackInitial)}</span>
        </div>
      `;
  }

  function createLiveChatOrderMetricMarkup(metricKey, label, value, iconClass) {
    const normalizedValue = String(value || "").trim();
    if (!normalizedValue) {
      return "";
    }

    return `
      <div class="product-insight-rank-card__metric" data-metric="${escapeHtml(metricKey)}">
        <span class="product-insight-metric-icon" aria-hidden="true">
          <i class="fa-solid ${escapeHtml(iconClass)}"></i>
        </span>
        <div class="product-insight-rank-card__metric-copy">
          <span class="product-insight-rank-card__metric-label">${escapeHtml(label)}</span>
          <span class="product-insight-rank-card__metric-value">${escapeHtml(normalizedValue)}</span>
        </div>
      </div>
    `;
  }

  function createLiveChatOrderCardMarkup(group) {
    const statusToken = normalizeOrderStageToken(group?.status);
    const statusLabel = getOrderStageLabel(group?.status);
    const customerName = String(group?.customerName || "Unknown customer").trim() || "Unknown customer";
    const route = getLiveChatOrderSummary(group);
    const orderTime = formatOrderPanelTimestamp(group?.createdAt, group?.createdAtEpochMs);
    const amountLabel = formatCurrencyValue(group?.amount) || "PHP 0";

    return `
      <article class="insight-order-card product-insight-rank-card">
        <div class="insight-order-card__header product-insight-rank-card__header">
          <div class="product-insight-rank-card__leading">
            ${getLiveChatOrderMediaMarkup(group)}
            <div class="insight-order-card__title product-insight-rank-card__title">
              <div class="insight-order-card__eyebrow">
                <p class="section-label">${escapeHtml(group?.orderId || "Order")}</p>
              </div>
              <h3>${escapeHtml(customerName)}</h3>
              <p class="insight-order-card__route">${escapeHtml(route || "Recent order")}</p>
            </div>
          </div>
          <span class="insight-order-chip is-${escapeHtml(statusToken)}">${escapeHtml(statusLabel)}</span>
        </div>

        <div class="insight-order-card__meta product-insight-rank-card__metrics">
          ${createLiveChatOrderMetricMarkup("courier", "Courier", group?.courier || "Unspecified", "fa-truck-fast")}
          ${createLiveChatOrderMetricMarkup("amount", "Amount", amountLabel, "fa-wallet")}
          ${createLiveChatOrderMetricMarkup("place-order-time", "Place order time", orderTime, "fa-clock")}
        </div>
      </article>
    `;
  }

  function renderOrderPanel(panel, groups, options = {}) {
    if (!panel) {
      return;
    }

    if (!state.hasLoadedOrders && state.isLoadingOrders) {
      panel.innerHTML = `
        <div class="employee-chat-empty-state">
          <strong>Loading orders</strong>
          <p>Recent customer orders will appear here in a moment.</p>
        </div>
      `;
      return;
    }

    if (state.ordersLoadError && !state.orders.length) {
      panel.innerHTML = `
        <div class="employee-chat-empty-state">
          <strong>Unable to load orders</strong>
          <p>Check the backend connection, then refresh this page.</p>
        </div>
      `;
      return;
    }

    if (!groups.length) {
      panel.innerHTML = `
        <div class="employee-chat-empty-state">
          <strong>${escapeHtml(options.emptyTitle || "No orders yet")}</strong>
          <p>${escapeHtml(options.emptyCopy || "Order details will appear here once available.")}</p>
        </div>
      `;
      return;
    }

    panel.innerHTML = `
      <div class="insight-order-list">
        ${groups.map((group) => createLiveChatOrderCardMarkup(group)).join("")}
      </div>
    `;
  }

  function renderProfilePanel(thread) {
    if (!profilePanel) {
      return;
    }

    if (!thread) {
      profilePanel.innerHTML = "";
      return;
    }

    const activeOrders = getLiveChatOrderGroupsForThread(thread)
      .filter((group) => !isArchivedOrderStage(group?.status))
      .slice(0, 6);

    renderOrderPanel(profilePanel, activeOrders, {
      emptyTitle: "No pending orders",
      emptyCopy: "Recent orders that are still not delivered will appear here.",
    });
  }

  function renderHistoryPanel(thread) {
    if (!historyPanel) {
      return;
    }

    if (!thread) {
      historyPanel.innerHTML = "";
      return;
    }

    const archivedOrders = getLiveChatOrderGroupsForThread(thread)
      .filter((group) => isArchivedOrderStage(group?.status))
      .slice(0, 8);

    renderOrderPanel(historyPanel, archivedOrders, {
      emptyTitle: "No order history yet",
      emptyCopy: "Completed, cancelled, and returned orders will appear here.",
    });
  }

  function renderMediaPanel(thread) {
    if (!mediaPanel) {
      return;
    }

    if (!thread) {
      mediaPanel.innerHTML = "";
      return;
    }

    const mediaItems = getConversationMediaItems(thread);
    mediaPanel.innerHTML = `
      ${
        mediaItems.length
          ? `
            <div class="live-chat-media-grid">
              ${mediaItems
                .map((item, mediaIndex) => `
                  <button
                    type="button"
                    class="live-chat-media-card"
                    data-chat-media-index="${mediaIndex}"
                    aria-label="Open ${escapeHtml(item.type === "video" ? "video" : "photo")} ${escapeHtml(item.name || "attachment")}"
                  >
                    <span class="live-chat-media-card__preview">
                      ${
                        item.type === "video"
                          ? `
                            <video
                              class="live-chat-media-card__asset"
                              src="${escapeHtml(item.src)}"
                              muted
                              playsinline
                              preload="metadata"
                            ></video>
                          `
                          : `
                            <img
                              class="live-chat-media-card__asset"
                              src="${escapeHtml(item.src)}"
                              alt="${escapeHtml(item.name || "Chat attachment")}"
                              loading="lazy"
                            />
                          `
                      }
                    </span>
                  </button>
                `)
                .join("")}
            </div>
          `
          : `
            <div class="employee-chat-empty-state">
              <strong>No photos or videos yet</strong>
              <p>This conversation has not shared any media yet.</p>
            </div>
          `
      }
    `;
  }

  function renderLiveChatSideAvatar(thread, fallbackInitial) {
    if (!liveChatSideAvatar) {
      return;
    }

    setThreadCustomerAvatarElement(liveChatSideAvatar, thread, "live-chat-profile-card__avatar", {
      initial: fallbackInitial,
      fallbackInitial: "U",
    });
  }

  function getLiveChatAttachmentLabel(item) {
    const candidate = String(item?.name || item?.src || "").trim();
    const extensionMatch = candidate.match(/\.([a-z0-9]{2,5})(?:[?#].*)?$/i);
    if (extensionMatch) {
      return extensionMatch[1].toUpperCase();
    }

    return item?.type === "video" ? "VIDEO" : "IMAGE";
  }

  function renderLiveChatConversationSidePanel(thread) {
    if (!liveChatProfilePanel) {
      return;
    }

    const hasThread = Boolean(thread);
    liveChatProfilePanel.classList.toggle("is-empty", !hasThread);

    if (!thread) {
      renderLiveChatSideAvatar(null, "U");
      if (liveChatSideName) {
        liveChatSideName.textContent = "Select a conversation";
      }
      if (liveChatSideStatus) {
        liveChatSideStatus.textContent = "Offline";
        liveChatSideStatus.classList.remove("is-online");
        liveChatSideStatus.classList.add("is-offline");
      }
      if (liveChatSideStatusDot) {
        liveChatSideStatusDot.classList.remove("is-online");
        liveChatSideStatusDot.classList.add("is-offline");
      }
      if (liveChatSideAbout) {
        liveChatSideAbout.textContent =
          "Select a customer thread to view product and order context.";
      }
      if (liveChatSideMedia) {
        liveChatSideMedia.innerHTML = '<div class="live-chat-side-empty">No media yet</div>';
      }
      if (liveChatSideFiles) {
        liveChatSideFiles.innerHTML = '<div class="live-chat-side-empty">No files yet</div>';
      }
      return;
    }

    const customerName = getThreadCustomerDisplayName(thread);
    const initial =
      (customerName || "U")
        .trim()
        .charAt(0)
        .toUpperCase() || "U";
    const presenceState = getThreadPresenceState(thread);
    const productName = getThreadProductDisplayName(thread);
    const latestPreview = getThreadPreview(thread);
    const mediaItems = getConversationMediaItems(thread);
    const latestMediaItems = mediaItems
      .map((item, mediaIndex) => ({ ...item, mediaIndex }))
      .slice(-3)
      .reverse();

    renderLiveChatSideAvatar(thread, initial);

    if (liveChatSideName) {
      liveChatSideName.textContent = customerName;
    }
    if (liveChatSideStatus) {
      liveChatSideStatus.textContent = presenceState.label;
      liveChatSideStatus.classList.remove("is-online", "is-offline");
      liveChatSideStatus.classList.add(presenceState.className);
    }
    if (liveChatSideStatusDot) {
      liveChatSideStatusDot.classList.remove("is-online", "is-offline", "has-label");
      liveChatSideStatusDot.classList.add(presenceState.className);
      if (presenceState.className === "is-online") {
        liveChatSideStatusDot.textContent = "";
      } else {
        const lastActiveLabel = formatPresenceBadgeLabel(getCustomerLastActiveAt(thread));
        liveChatSideStatusDot.classList.toggle("has-label", Boolean(lastActiveLabel));
        liveChatSideStatusDot.innerHTML = lastActiveLabel
          ? `<span class="employee-chat-conversation-status__dot-label">${escapeHtml(lastActiveLabel)}</span>`
          : "";
      }
    }
    if (liveChatSideAbout) {
      const aboutParts = [];
      if (productName && productName !== "Unnamed Product") {
        aboutParts.push(`Inquiry about ${productName}.`);
      }
      if (latestPreview) {
        aboutParts.push(`Latest message: ${latestPreview}`);
      }
      liveChatSideAbout.textContent =
        aboutParts.join(" ") || "Customer conversation details will appear here.";
    }
    if (liveChatSideMedia) {
      liveChatSideMedia.innerHTML = latestMediaItems.length
        ? latestMediaItems
            .map((item) => `
              <button
                type="button"
                class="live-chat-side-media-item"
                data-live-chat-side-media-index="${item.mediaIndex}"
                aria-label="Open ${escapeHtml(item.name || "attachment")}"
              >
                ${
                  item.type === "video"
                    ? `<video src="${escapeHtml(item.src)}" muted playsinline preload="metadata"></video>`
                    : `<img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.name || "Chat attachment")}" loading="lazy" />`
                }
              </button>
            `)
            .join("")
        : '<div class="live-chat-side-empty">No media yet</div>';
    }
    if (liveChatSideFiles) {
      liveChatSideFiles.innerHTML = latestMediaItems.length
        ? latestMediaItems
            .map((item) => `
              <button
                type="button"
                class="live-chat-side-file"
                data-live-chat-side-media-index="${item.mediaIndex}"
              >
                <span class="live-chat-side-file__icon is-${escapeHtml(item.type)}">
                  <i class="fa-solid ${item.type === "video" ? "fa-video" : "fa-image"}" aria-hidden="true"></i>
                </span>
                <span class="live-chat-side-file__copy">
                  <strong>${escapeHtml(item.name || (item.type === "video" ? "Video attachment" : "Photo attachment"))}</strong>
                  <small>${escapeHtml(getLiveChatAttachmentLabel(item))}</small>
                </span>
                <time>${escapeHtml(formatTimestamp(item.timestamp) || "Now")}</time>
              </button>
            `)
            .join("")
        : '<div class="live-chat-side-empty">No files yet</div>';
    }
  }

  function getThreadPreview(thread) {
    if (isCustomerTyping(thread)) {
      return `${getThreadCustomerDisplayName(thread)} is typing...`;
    }

    const messages = Array.isArray(thread.messages) ? thread.messages : [];
    const latestMessage = messages[messages.length - 1];
    if (isPinProductMessage(latestMessage)) {
      return `Pinned ${String(latestMessage?.text || getThreadProductDisplayName(thread)).trim() || "product"}`;
    }
    if (isDeletedMessage(latestMessage)) {
      return latestMessage?.isFromSupport
        ? "You deleted a message"
        : "Customer deleted a message";
    }
    if (isQuickHeartMessage(latestMessage)) {
      return latestMessage?.isFromSupport
        ? "Heart sent"
        : "Customer sent a heart";
    }
    if (latestMessage?.text) {
      return latestMessage.text;
    }
    if (latestMessage?.imageUrl) {
      const mediaLabel = isVideoAttachment(
        latestMessage.imageUrl,
        latestMessage.imageName,
      )
        ? "video"
        : "photo";
      return latestMessage?.isFromSupport
        ? `${mediaLabel.charAt(0).toUpperCase()}${mediaLabel.slice(1)} sent`
        : `Customer sent a ${mediaLabel}`;
    }
    return "No messages yet.";
  }

  function isPinProductMessage(message) {
    return String(message?.source || "").trim().toLowerCase() === "pin-product";
  }

  function getLatestPinnedProductMessage(thread) {
    const messages = Array.isArray(thread?.messages) ? thread.messages : [];
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (isPinProductMessage(message) && !isDeletedMessage(message)) {
        return message;
      }
    }

    return null;
  }

  function hasPinnedProductContext(thread) {
    return Boolean(
      getLatestPinnedProductMessage(thread) ||
        String(thread?.productId || "").trim() ||
        String(thread?.productName || "").trim(),
    );
  }

  function getThreadTypingActor(thread, actor) {
    const normalizedActor = String(actor || "").trim().toLowerCase();
    const typing = thread?.typing && typeof thread.typing === "object" ? thread.typing : {};
    const entry = typing[normalizedActor];
    if (!entry || entry.isTyping !== true) {
      return null;
    }

    const updatedAt = new Date(entry.updatedAt);
    if (Number.isNaN(updatedAt.getTime())) {
      return null;
    }

    if (Date.now() - updatedAt.getTime() > CHAT_TYPING_ACTIVE_WINDOW_MS) {
      return null;
    }

    return entry;
  }

  function getThreadPresenceActor(thread, actor) {
    const normalizedActor = String(actor || "").trim().toLowerCase();
    const typing = thread?.typing && typeof thread.typing === "object" ? thread.typing : {};
    const entry = typing[normalizedActor];
    if (!entry || entry.isOnline !== true) {
      return null;
    }

    const updatedAt = new Date(entry.updatedAt);
    if (Number.isNaN(updatedAt.getTime())) {
      return null;
    }

    if (Date.now() - updatedAt.getTime() > CHAT_ONLINE_ACTIVE_WINDOW_MS) {
      return null;
    }

    return entry;
  }

  function isCustomerTyping(thread) {
    return Boolean(getThreadTypingActor(thread, "user"));
  }

  function getThreadTypingSignature(thread, actor) {
    const entry = getThreadTypingActor(thread, actor);
    if (!entry) {
      return "";
    }

    return [
      entry.actor,
      entry.displayName,
      entry.avatarUrl,
      formatOptionalTimestamp(entry.updatedAt),
    ].join("|");
  }

  function buildCustomerTypingIndicatorMarkup(thread, fallbackInitial) {
    const typingEntry = getThreadTypingActor(thread, "user");
    if (!typingEntry) {
      return "";
    }

    const customerName =
      String(typingEntry.displayName || "").trim() ||
      getThreadCustomerDisplayName(thread);
    const avatarUrl =
      String(typingEntry.avatarUrl || "").trim() ||
      getThreadCustomerAvatarUrl(thread);
    const typingAvatarThread = {
      ...thread,
      customerName,
      customerAvatarUrl: avatarUrl,
    };
    const initial =
      (customerName || fallbackInitial || "U")
        .trim()
        .charAt(0)
        .toUpperCase() || "U";

    return `
      <article class="employee-chat-message is-user is-typing" aria-live="polite" aria-label="${escapeHtml(customerName)} is typing">
        ${buildThreadCustomerAvatarMarkup(typingAvatarThread, "employee-chat-message__avatar-badge is-user", {
          tagName: "div",
          initial,
        })}
        <div class="employee-chat-message__stack">
          <div class="employee-chat-message__content-row">
            <div class="employee-chat-message__typing-bubble" title="${escapeHtml(customerName)} is typing">
              <span class="employee-chat-message__typing-dot"></span>
              <span class="employee-chat-message__typing-dot"></span>
              <span class="employee-chat-message__typing-dot"></span>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function getActivePendingEdit() {
    if (
      !state.pendingEdit ||
      !state.pendingEdit.threadId ||
      state.pendingEdit.threadId !== state.activeThreadId
    ) {
      return null;
    }

    return state.pendingEdit;
  }

  function getComposerSubmitLabel() {
    return getActivePendingEdit() ? "Save edit" : "Send message";
  }

  function updateSendButtonState(buttonLabel = getComposerSubmitLabel()) {
    if (!sendButton) {
      return;
    }

    if (isAdminLiveChatReadOnly) {
      sendButton.disabled = true;
      sendButton.setAttribute("aria-disabled", "true");
      sendButton.setAttribute("aria-label", "Read-only chat");
      sendButton.title = "Read-only chat";
      if (sendButtonLabel) {
        sendButtonLabel.textContent = "Read-only chat";
      }
      return;
    }

    const replyText = String(input?.value || "").replace(/\s+/g, " ").trim();
    const hasPendingMedia = state.pendingMedia.length > 0;
    const canSend =
      Boolean(state.activeThreadId) &&
      Boolean(replyText || hasPendingMedia) &&
      !state.isSending;

    sendButton.disabled = !canSend;
    sendButton.setAttribute("aria-disabled", canSend ? "false" : "true");
    sendButton.setAttribute("aria-label", buttonLabel);
    sendButton.title = buttonLabel;
    if (sendButtonLabel) {
      sendButtonLabel.textContent = buttonLabel;
    }
  }

  function setComposerBusy(isBusy, buttonLabel = getComposerSubmitLabel()) {
    if (isAdminLiveChatReadOnly) {
      state.isSending = false;
      updateSendButtonState("Read-only chat");
      return;
    }

    state.isSending = isBusy;

    updateSendButtonState(buttonLabel);
    setDeleteModalBusy(isBusy);

    if (mediaButton) {
      mediaButton.disabled = isBusy;
    }

    if (composePlusButton) {
      composePlusButton.disabled = isBusy;
    }

    if (heartButton) {
      heartButton.disabled = isBusy;
    }

    if (input) {
      input.disabled = isBusy;
    }
  }

  function getConversationMediaItems(thread) {
    const messages = Array.isArray(thread?.messages) ? thread.messages : [];
    return messages.reduce((items, message, messageIndex) => {
      const mediaSource = String(message?.imageUrl || "").trim();
      if (!mediaSource) {
        return items;
      }

      const mediaType = isVideoAttachment(mediaSource, message?.imageName)
        ? "video"
        : "image";
      const mediaName = String(message?.imageName || "").trim();
      items.push({
        src: mediaSource,
        type: mediaType,
        name:
          mediaName ||
          (mediaType === "video" ? "Video attachment" : "Photo attachment"),
        messageIndex,
        timestamp: message?.timestamp || "",
      });
      return items;
    }, []);
  }

  function syncChatMediaZoomUi() {
    if (!chatMediaZoomRange || !chatMediaZoomLabel) {
      return;
    }

    const zoomValue = Math.max(100, Math.min(300, Number(state.activeChatMediaZoom) || 100));
    chatMediaZoomRange.value = String(zoomValue);
    chatMediaZoomRange.style.setProperty(
      "--zoom-range-progress",
      `${((zoomValue - 100) / 200) * 100}%`,
    );
    chatMediaZoomLabel.textContent = `${zoomValue}%`;
    if (chatMediaZoomOut) {
      chatMediaZoomOut.disabled = zoomValue <= 100;
    }
    if (chatMediaZoomIn) {
      chatMediaZoomIn.disabled = zoomValue >= 300;
    }
  }

  function setChatMediaZoom(nextZoom) {
    state.activeChatMediaZoom = Math.max(100, Math.min(300, Number(nextZoom) || 100));
    if (chatMediaModalImage && !chatMediaModalImage.hidden) {
      chatMediaModalImage.style.transform = `scale(${state.activeChatMediaZoom / 100})`;
    }
    syncChatMediaZoomUi();
  }

  function renderChatMediaThumbs() {
    if (!chatMediaModalThumbs) {
      return;
    }

    if (!state.activeChatMediaItems.length) {
      chatMediaModalThumbs.innerHTML = "";
      return;
    }

    chatMediaModalThumbs.innerHTML = state.activeChatMediaItems
      .map(
        (item, index) => `
          <button
            type="button"
            class="live-chat-media-modal__thumb${
              index === state.activeChatMediaIndex ? " is-active" : ""
            }"
            data-chat-media-thumb-index="${index}"
            aria-label="Open attachment ${index + 1}"
            title="${escapeHtml(item.name)}"
          >
            ${
              item.type === "video"
                ? `<video
                    class="live-chat-media-modal__thumb-media"
                    src="${escapeHtml(item.src)}"
                    muted
                    playsinline
                    preload="metadata"
                    aria-hidden="true"
                  ></video>
                  <span class="live-chat-media-modal__thumb-badge" aria-hidden="true">
                    <i class="fa-solid fa-play"></i>
                  </span>`
                : `<img
                    class="live-chat-media-modal__thumb-media"
                    src="${escapeHtml(item.src)}"
                    alt=""
                    aria-hidden="true"
                  />`
            }
          </button>
        `,
      )
      .join("");

    const activeThumb = chatMediaModalThumbs.querySelector(".live-chat-media-modal__thumb.is-active");
    activeThumb?.scrollIntoView({
      behavior: "auto",
      block: "nearest",
      inline: "nearest",
    });
  }

  function renderActiveChatMedia() {
    const activeItem = state.activeChatMediaItems[state.activeChatMediaIndex] || null;
    state.activeChatMedia = activeItem;

    if (
      !chatMediaModal ||
      !chatMediaModalImage ||
      !chatMediaModalVideo
    ) {
      return;
    }

    if (!activeItem) {
      closeChatMediaModal();
      return;
    }

    if (chatMediaModalPrev) {
      chatMediaModalPrev.disabled = state.activeChatMediaIndex <= 0;
    }
    if (chatMediaModalNext) {
      chatMediaModalNext.disabled =
        state.activeChatMediaIndex >= state.activeChatMediaItems.length - 1;
    }

    if (activeItem.type === "video") {
      if (chatMediaModalImage) {
        chatMediaModalImage.hidden = true;
        chatMediaModalImage.src = "";
        chatMediaModalImage.alt = "";
        chatMediaModalImage.style.transform = "scale(1)";
      }
      if (chatMediaModalVideo) {
        chatMediaModalVideo.hidden = false;
        if (chatMediaModalVideo.getAttribute("src") !== activeItem.src) {
          chatMediaModalVideo.src = activeItem.src;
          chatMediaModalVideo.load();
        }
      }
      if (chatMediaModalZoom) {
        chatMediaModalZoom.hidden = true;
      }
    } else {
      if (chatMediaModalVideo) {
        chatMediaModalVideo.pause();
        chatMediaModalVideo.hidden = true;
        chatMediaModalVideo.removeAttribute("src");
        chatMediaModalVideo.load();
      }
      if (chatMediaModalImage) {
        chatMediaModalImage.hidden = false;
        chatMediaModalImage.src = activeItem.src;
        chatMediaModalImage.alt = activeItem.name || "Chat attachment";
      }
      if (chatMediaModalZoom) {
        chatMediaModalZoom.hidden = false;
      }
      setChatMediaZoom(100);
    }

    renderChatMediaThumbs();
    syncChatMediaZoomUi();
  }

  function setActiveChatMediaIndex(nextIndex) {
    const totalItems = state.activeChatMediaItems.length;
    if (!totalItems) {
      closeChatMediaModal();
      return;
    }

    const normalizedIndex = Math.max(0, Math.min(totalItems - 1, Number(nextIndex) || 0));
    state.activeChatMediaIndex = normalizedIndex;
    state.activeChatMediaZoom = 100;
    renderActiveChatMedia();
  }

  function closeChatMediaModal() {
    if (!chatMediaModal) {
      return;
    }

    chatMediaModal.hidden = true;
    syncModalOpenState();
    state.activeChatMedia = null;
    state.activeChatMediaItems = [];
    state.activeChatMediaIndex = -1;
    state.activeChatMediaZoom = 100;

    if (chatMediaModalImage) {
      chatMediaModalImage.hidden = true;
      chatMediaModalImage.src = "";
      chatMediaModalImage.alt = "";
      chatMediaModalImage.style.transform = "scale(1)";
    }

    if (chatMediaModalVideo) {
      chatMediaModalVideo.pause();
      chatMediaModalVideo.hidden = true;
      chatMediaModalVideo.removeAttribute("src");
      chatMediaModalVideo.load();
    }

    if (chatMediaModalThumbs) {
      chatMediaModalThumbs.innerHTML = "";
    }

    if (chatMediaModalZoom) {
      chatMediaModalZoom.hidden = true;
    }
  }

  function openChatMediaModal(options = {}) {
    if (
      !chatMediaModal ||
      !chatMediaModalImage ||
      !chatMediaModalVideo
    ) {
      return;
    }

    const activeThread = getThreadById(state.activeThreadId);
    const mediaItems = getConversationMediaItems(activeThread);
    if (!mediaItems.length) {
      return;
    }

    state.activeChatMediaItems = mediaItems;
    chatMediaModal.hidden = false;
    syncModalOpenState();
    setActiveChatMediaIndex(options.startIndex || 0);
    window.requestAnimationFrame(() => {
      if (state.activeChatMedia?.type === "video") {
        chatMediaModalVideo.focus?.();
      } else {
        chatMediaModalStage?.focus();
      }
    });
  }

  function syncComposerContextState() {
    if (!form) {
      return;
    }

    const hasEditContext = Boolean(getActivePendingEdit());
    const hasReplyContext =
      state.pendingReply &&
      state.pendingReply.threadId &&
      state.pendingReply.threadId === state.activeThreadId;
    const hasMediaContext = state.pendingMedia.length > 0;
    form.classList.toggle(
      "has-context-preview",
      Boolean(hasEditContext || hasReplyContext || hasMediaContext),
    );
  }

  function renderReplyState() {
    if (!replyState) {
      return;
    }

    const pendingEdit = getActivePendingEdit();
    const pendingReply = state.pendingReply;
    const hasReplyContext =
      pendingReply &&
      pendingReply.threadId &&
      pendingReply.threadId === state.activeThreadId;
    const isVisible = Boolean(pendingEdit || hasReplyContext);

    syncComposerContextState();
    updateSendButtonState();
    replyState.hidden = !isVisible;
    if (!isVisible) {
      replyState.innerHTML = "";
      return;
    }

    if (pendingEdit) {
      replyState.innerHTML = `
        <div class="employee-chat-reply-state__copy">
          <p class="employee-chat-reply-state__label">Editing your message</p>
          <p class="employee-chat-reply-state__preview">
            ${escapeHtml(pendingEdit.previewText)}
          </p>
        </div>
        <button
          type="button"
          class="employee-chat-reply-state__clear"
          data-clear-employee-chat-edit
          aria-label="Cancel edit"
          title="Cancel edit"
        >
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      `;
      return;
    }

    replyState.innerHTML = `
      <div class="employee-chat-reply-state__copy">
        <p class="employee-chat-reply-state__label">
          ${escapeHtml(getReplyComposerLabel(pendingReply.senderLabel))}
        </p>
        <p class="employee-chat-reply-state__preview">
          ${escapeHtml(pendingReply.previewText)}
        </p>
      </div>
      <button
        type="button"
        class="employee-chat-reply-state__clear"
        data-clear-employee-chat-reply
        aria-label="Cancel reply"
        title="Cancel reply"
      >
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
    `;
  }

  function clearPendingReply(options = {}) {
    state.pendingReply = null;
    if (options.render !== false) {
      renderReplyState();
    }
  }

  function clearPendingEdit(options = {}) {
    state.pendingEdit = null;
    if (options.render !== false) {
      renderReplyState();
    }
  }

  function setPendingReply(thread, message) {
    if (isAdminLiveChatReadOnly) {
      return;
    }

    if (!thread?.threadId || !message) {
      return;
    }

    const messageId = String(message?.id || "").trim();
    if (!messageId) {
      return;
    }

    clearPendingEdit({ render: false });
    closeMessageActionMenus();
    state.pendingReply = {
      threadId: thread.threadId,
      messageId,
      senderLabel:
        message?.isFromSupport === true
          ? "You"
          : getThreadCustomerDisplayName(thread),
      previewText: getReplyPreviewText(message),
    };
    renderReplyState();
    if (input) {
      input.focus();
      input.setSelectionRange?.(input.value.length, input.value.length);
    }
  }

  function setPendingEdit(thread, message) {
    if (isAdminLiveChatReadOnly) {
      return;
    }

    if (!thread?.threadId || !message || message?.isFromSupport !== true) {
      return;
    }

    const messageId = String(message?.id || "").trim();
    const messageText = String(message?.text || "").replace(/\s+/g, " ").trim();
    if (!messageId || !messageText || isQuickHeartMessage(message)) {
      return;
    }

    clearPendingReply({ render: false });
    clearPendingMedia();
    closeMessageActionMenus();
    state.pendingEdit = {
      threadId: thread.threadId,
      messageId,
      previewText: messageText,
    };
    if (input) {
      input.value = messageText;
      resizeComposerInput();
      input.focus();
      input.setSelectionRange?.(input.value.length, input.value.length);
    }
    renderReplyState();
  }

  function setDeleteModalBusy(isBusy) {
    if (deleteModalClose) {
      deleteModalClose.disabled = isBusy;
    }
    if (deleteModalCancel) {
      deleteModalCancel.disabled = isBusy;
    }
    if (deleteModalConfirm) {
      deleteModalConfirm.disabled = isBusy;
      deleteModalConfirm.textContent = isBusy ? "Deleting..." : "Delete";
    }
  }

  function closeDeleteModal(options = {}) {
    if (!deleteModalOverlay) {
      return;
    }

    const pendingDelete = state.pendingDelete;
    deleteModalOverlay.hidden = true;
    state.pendingDelete = null;
    setDeleteModalBusy(false);
    syncModalOpenState();

    if (
      options.restoreFocus !== false &&
      pendingDelete?.triggerElement instanceof HTMLElement
    ) {
      pendingDelete.triggerElement.focus();
    }
  }

  function openDeleteModal(thread, message, triggerElement = null) {
    const threadId = String(thread?.threadId || "").trim();
    const messageId = String(message?.id || "").trim();
    if (!deleteModalOverlay || !threadId || !messageId) {
      return;
    }

    state.pendingDelete = {
      threadId,
      messageId,
      triggerElement: triggerElement instanceof HTMLElement ? triggerElement : null,
    };
    if (deleteModalCopy) {
      deleteModalCopy.textContent = getDeleteMessageCopy(message);
    }
    deleteModalOverlay.hidden = false;
    closeMessageActionMenus();
    setDeleteModalBusy(false);
    syncModalOpenState();
    window.requestAnimationFrame(() => {
      deleteModalConfirm?.focus();
    });
  }

  function toggleMediaMessageDetails(message) {
    const messageId = String(message?.id || "").trim();
    const imageUrl = String(message?.imageUrl || "").trim();
    if (!messageId || !imageUrl) {
      return;
    }

    state.activeMediaDetailsMessageId =
      state.activeMediaDetailsMessageId === messageId ? "" : messageId;
    state.lastConversationSignature = "";
    closeMessageActionMenus();
    renderConversation();
  }

  async function confirmDeleteModalAction() {
    if (isAdminLiveChatReadOnly) {
      return;
    }

    const pendingDelete = state.pendingDelete;
    const threadId = String(pendingDelete?.threadId || "").trim();
    const messageId = String(pendingDelete?.messageId || "").trim();
    if (!threadId || !messageId || state.isSending) {
      return;
    }

    const activeThread = getThreadById(threadId) || { threadId };
    closeMessageActionMenus();
    setComposerBusy(true, "Deleting...");
    try {
      const data = await deleteChatMessage(threadId, messageId);
      closeDeleteModal({ restoreFocus: false });
      await finalizeSuccessfulMessageRemoval(activeThread, data, messageId);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Unable to delete message.",
      );
    } finally {
      setComposerBusy(false);
    }
  }

  function clearReplyJumpHighlight() {
    if (state.replyJumpStartTimeoutId) {
      window.clearTimeout(state.replyJumpStartTimeoutId);
      state.replyJumpStartTimeoutId = 0;
    }

    if (state.replyJumpHighlightTimeoutId) {
      window.clearTimeout(state.replyJumpHighlightTimeoutId);
      state.replyJumpHighlightTimeoutId = 0;
    }

    messageList
      ?.querySelector(".employee-chat-message.is-reply-jump-target")
      ?.classList.remove("is-reply-jump-target");
  }

  function getRenderedMessageElementById(messageId) {
    const normalizedMessageId = String(messageId || "").trim();
    if (!messageList || !normalizedMessageId) {
      return null;
    }

    return (
      [...messageList.querySelectorAll("[data-chat-message-id]")]
        .find(
          (messageElement) =>
            messageElement.getAttribute("data-chat-message-id") === normalizedMessageId,
        ) || null
    );
  }

  function jumpToRepliedMessage(messageId) {
    const targetMessageElement = getRenderedMessageElementById(messageId);
    if (!targetMessageElement || !messageList) {
      return;
    }

    const currentScrollTop = messageList.scrollTop;
    const targetScrollTop = targetMessageElement.offsetTop;
    const scrollDistance = Math.abs(targetScrollTop - currentScrollTop);
    const animationDelayMs =
      scrollDistance <= 24
        ? 40
        : Math.min(520, Math.max(220, Math.round(scrollDistance * 0.35)));

    clearReplyJumpHighlight();
    targetMessageElement.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });

    state.replyJumpStartTimeoutId = window.setTimeout(() => {
      state.replyJumpStartTimeoutId = 0;
      void targetMessageElement.offsetWidth;
      targetMessageElement.classList.add("is-reply-jump-target");

      state.replyJumpHighlightTimeoutId = window.setTimeout(() => {
        targetMessageElement.classList.remove("is-reply-jump-target");
        state.replyJumpHighlightTimeoutId = 0;
      }, 1300);
    }, animationDelayMs);
  }

  function toggleMessageBubbleTime(messageId) {
    const normalizedMessageId = String(messageId || "").trim();
    if (!normalizedMessageId) {
      return;
    }

    state.activeBubbleTimeMessageId =
      state.activeBubbleTimeMessageId === normalizedMessageId ? "" : normalizedMessageId;
    state.lastConversationSignature = "";
    renderConversation();
  }

  function createPendingMediaId() {
    return `media-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function revokePendingMediaItem(item) {
    if (!item?.previewUrl) {
      return;
    }

    try {
      window.URL?.revokeObjectURL(item.previewUrl);
    } catch (_error) {
      // Ignore preview URL cleanup failures.
    }
  }

  function renderPendingMediaPreview() {
    if (!mediaPreview) {
      return;
    }

    const hasPendingMedia = state.pendingMedia.length > 0;
    updateSendButtonState();
    syncComposerContextState();
    mediaPreview.hidden = !hasPendingMedia;
    if (!hasPendingMedia) {
      mediaPreview.innerHTML = "";
      return;
    }

    mediaPreview.innerHTML = `
      <button
        type="button"
        class="employee-chat-pending-media__add"
        data-employee-chat-add-media
        aria-label="Add more photos or videos"
        title="Add more photos or videos"
      >
        <span aria-hidden="true">+</span>
      </button>
      ${state.pendingMedia
        .map(
          (item) => `
            <div
              class="employee-chat-pending-media__item"
              data-pending-media-id="${escapeHtml(item.id)}"
              title="${escapeHtml(item.imageName)}"
            >
              ${
                item.isVideo
                  ? `<video
                      class="employee-chat-pending-media__preview employee-chat-pending-media__preview--video"
                      src="${escapeHtml(item.previewUrl)}"
                      muted
                      playsinline
                      preload="metadata"
                    ></video>
                    <span class="employee-chat-pending-media__kind" aria-hidden="true">
                      <i class="fa-solid fa-video"></i>
                    </span>`
                  : `<img
                      class="employee-chat-pending-media__preview employee-chat-pending-media__preview--image"
                      src="${escapeHtml(item.previewUrl)}"
                      alt="Selected attachment"
                    />`
              }
              <button
                type="button"
                class="employee-chat-pending-media__remove"
                data-remove-pending-media="${escapeHtml(item.id)}"
                aria-label="Remove ${escapeHtml(item.imageName)}"
              >
                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
              </button>
            </div>
          `,
        )
        .join("")}
    `;
  }

  function clearPendingMedia() {
    state.pendingMedia.forEach(revokePendingMediaItem);
    state.pendingMedia = [];
    if (mediaInput) {
      mediaInput.value = "";
    }
    renderPendingMediaPreview();
  }

  function removePendingMediaById(mediaId, options = {}) {
    if (!mediaId) {
      return;
    }

    const nextPendingMedia = [];
    let didRemove = false;

    state.pendingMedia.forEach((item) => {
      if (item.id === mediaId) {
        revokePendingMediaItem(item);
        didRemove = true;
        return;
      }
      nextPendingMedia.push(item);
    });

    if (!didRemove) {
      return;
    }

    state.pendingMedia = nextPendingMedia;
    if (options.render !== false) {
      renderPendingMediaPreview();
    }
  }

  function buildReplyPayload() {
    if (
      !state.pendingReply ||
      !state.pendingReply.threadId ||
      state.pendingReply.threadId !== state.activeThreadId
    ) {
      return null;
    }

    const messageId = String(state.pendingReply.messageId || "").trim();
    const senderLabel = String(state.pendingReply.senderLabel || "").trim();
    const previewText = String(state.pendingReply.previewText || "").trim();
    if (!messageId || !senderLabel || !previewText) {
      return null;
    }

    return {
      messageId,
      senderLabel,
      previewText,
    };
  }

  function appendPendingMedia(files) {
    const normalizedFiles = Array.from(files || []).filter(Boolean);
    if (!normalizedFiles.length) {
      return;
    }

    state.pendingMedia = state.pendingMedia.concat(
      normalizedFiles.map((file) => ({
        id: createPendingMediaId(),
        file,
        imageName: String(file?.name || "").trim() || "chat-media",
        previewUrl: window.URL?.createObjectURL(file) || "",
        isVideo:
          String(file?.type || "").toLowerCase().startsWith("video/") ||
          isVideoAttachment(file?.name, file?.name),
      })),
    );

    renderPendingMediaPreview();
  }

  function appendSelectedMediaFiles(files) {
    if (isAdminLiveChatReadOnly) {
      return false;
    }

    const activeThread = getThreadById(state.activeThreadId);
    const mediaFiles = Array.from(files || []).filter(Boolean);

    if (getActivePendingEdit()) {
      window.alert("Finish editing or cancel the edit before adding media.");
      return false;
    }

    if (!activeThread || !mediaFiles.length || state.isSending) {
      return false;
    }

    appendPendingMedia(mediaFiles);
    return true;
  }

  function openMediaPickerFallback() {
    const fallbackInput = document.createElement("input");
    fallbackInput.type = "file";
    fallbackInput.accept = "image/*,video/*";
    fallbackInput.multiple = true;
    fallbackInput.dataset.employeeChatDynamicMediaInput = "true";
    fallbackInput.style.position = "fixed";
    fallbackInput.style.left = "-9999px";
    fallbackInput.style.top = "0";
    fallbackInput.setAttribute("aria-hidden", "true");
    document.body.append(fallbackInput);

    const cleanup = () => {
      window.setTimeout(() => {
        if (fallbackInput.isConnected) {
          fallbackInput.remove();
        }
      }, 0);
    };

    fallbackInput.addEventListener(
      "change",
      () => {
        appendSelectedMediaFiles(fallbackInput.files);
        cleanup();
      },
      { once: true },
    );

    try {
      if (typeof fallbackInput.showPicker === "function") {
        fallbackInput.showPicker();
      } else {
        fallbackInput.click();
      }
    } catch (_error) {
      fallbackInput.click();
    }
    window.setTimeout(cleanup, 60000);
  }

  function resizeComposerInput() {
    if (!input) {
      return;
    }

    const computedStyle = window.getComputedStyle(input);
    const lineHeight = Number.parseFloat(computedStyle.lineHeight) || 24;
    const paddingTop = Number.parseFloat(computedStyle.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(computedStyle.paddingBottom) || 0;
    const borderTop = Number.parseFloat(computedStyle.borderTopWidth) || 0;
    const borderBottom = Number.parseFloat(computedStyle.borderBottomWidth) || 0;
    const borderHeight = borderTop + borderBottom;
    const singleLineHeight = Math.ceil(
      lineHeight + paddingTop + paddingBottom + borderHeight,
    );
    const maxHeight = Math.ceil(
      lineHeight * 10 + paddingTop + paddingBottom + borderHeight,
    );

    input.style.height = "auto";
    const scrollHeight = input.scrollHeight + borderHeight;
    const nextHeight = Math.min(
      Math.max(scrollHeight, singleLineHeight),
      maxHeight,
    );

    input.style.height = `${nextHeight}px`;
    input.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden";
    updateSendButtonState();
  }

  async function postSupportReply(threadId, payload) {
    const sender = getLiveChatSupportSender();
    const response = await fetch(
      `/api/chat-support/${encodeURIComponent(threadId)}/reply`,
      {
        method: "POST",
        headers: withEmployeeDashboardAdminHeaders({
          Accept: "application/json",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          ...payload,
          sender,
          senderName: sender.displayName,
          senderRole: sender.role,
          senderId: sender.id,
          senderAvatarUrl: sender.avatarUrl,
        }),
      },
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to send reply.");
    }

    return data;
  }

  async function updateSupportMessage(threadId, messageId, payload) {
    const response = await fetch(
      `/api/chat-support/${encodeURIComponent(threadId)}/edit-message`,
      {
        method: "POST",
        headers: withEmployeeDashboardAdminHeaders({
          Accept: "application/json",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          messageId,
          ...payload,
        }),
      },
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to update message.");
    }

    return data;
  }

  async function deleteChatMessage(threadId, messageId) {
    const response = await fetch(
      `/api/chat-support/${encodeURIComponent(threadId)}/delete-message`,
      {
        method: "POST",
        headers: withEmployeeDashboardAdminHeaders({
          Accept: "application/json",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ messageId }),
      },
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to delete message.");
    }

    return data;
  }

  async function uploadMediaFile(file) {
    const fileName = String(file?.name || "").trim() || "chat-media";
    const response = await fetch("/api/chat-uploads", {
      method: "POST",
      headers: withEmployeeDashboardAdminHeaders({
        Accept: "application/json",
        "Content-Type": String(file?.type || "application/octet-stream"),
        "x-file-name": fileName,
      }),
      body: file,
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to upload media.");
    }

    return {
      imageUrl: String(data.imageUrl || "").trim(),
      imageName: fileName,
    };
  }

  function clearSupportTypingTimer() {
    if (state.supportTypingClearTimeoutId) {
      window.clearTimeout(state.supportTypingClearTimeoutId);
      state.supportTypingClearTimeoutId = 0;
    }
  }

  async function sendSupportTypingState(threadId, isTyping, options = {}) {
    if (isAdminLiveChatReadOnly) {
      return;
    }

    const normalizedThreadId = String(threadId || "").trim();
    if (!normalizedThreadId) {
      return;
    }

    const now = Date.now();
    if (isTyping) {
      if (
        !options.force &&
        state.supportTypingThreadId === normalizedThreadId &&
        now - state.supportTypingLastSentAt < CHAT_TYPING_REFRESH_MS
      ) {
        return;
      }
      state.supportTypingThreadId = normalizedThreadId;
      state.supportTypingLastSentAt = now;
    } else if (
      !options.force &&
      state.supportTypingThreadId !== normalizedThreadId &&
      !state.supportTypingLastSentAt
    ) {
      return;
    }

    if (!isTyping && state.supportTypingThreadId === normalizedThreadId) {
      state.supportTypingThreadId = "";
      state.supportTypingLastSentAt = 0;
    }

    try {
      const sender = getLiveChatSupportSender();
      const response = await fetch(
        `/api/chat-support/${encodeURIComponent(normalizedThreadId)}/typing`,
        {
          method: "POST",
          headers: withEmployeeDashboardAdminHeaders({
            Accept: "application/json",
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            actor: "employee",
            isTyping: Boolean(isTyping),
            displayName: sender.displayName,
            avatarUrl: sender.avatarUrl,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return;
      }

      const updatedThread = data.thread;
      if (updatedThread && typeof updatedThread === "object") {
        state.threads = state.threads.map((candidate) =>
          candidate.threadId === updatedThread.threadId ? updatedThread : candidate,
        );
        render();
      }
    } catch (_) {}
  }

  function stopSupportTyping(options = {}) {
    if (isAdminLiveChatReadOnly) {
      return;
    }

    clearSupportTypingTimer();
    const threadId =
      String(options.threadId || "").trim() ||
      String(state.supportTypingThreadId || state.activeThreadId || "").trim();
    if (!threadId) {
      return;
    }

    void sendSupportTypingState(threadId, false, { force: true });
  }

  function syncSupportTypingFromComposer() {
    if (isAdminLiveChatReadOnly) {
      return;
    }

    const activeThread = getThreadById(state.activeThreadId);
    if (!activeThread || state.isSending) {
      return;
    }

    const hasText = String(input?.value || "").trim().length > 0;
    if (!hasText) {
      stopSupportTyping({ threadId: activeThread.threadId });
      return;
    }

    void sendSupportTypingState(activeThread.threadId, true);
    clearSupportTypingTimer();
    state.supportTypingClearTimeoutId = window.setTimeout(() => {
      stopSupportTyping({ threadId: activeThread.threadId });
    }, CHAT_TYPING_IDLE_MS);
  }

  function handleComposerInput() {
    resizeComposerInput();
    syncSupportTypingFromComposer();
  }

  async function finalizeSuccessfulReply(activeThread, data, options = {}) {
    if (options.clearInput && input) {
      input.value = "";
      resizeComposerInput();
    }

    if (options.clearPendingMedia) {
      clearPendingMedia();
    } else if (mediaInput) {
      mediaInput.value = "";
    }

    if (options.clearPendingReply) {
      clearPendingReply();
    }

    if (options.clearPendingEdit) {
      clearPendingEdit();
    }

    state.shouldStickToBottom = options.stickToBottom !== false;
    await loadThreads();
    state.activeThreadId = data.thread?.threadId || activeThread.threadId;
    render();
  }

  async function finalizeSuccessfulMessageRemoval(activeThread, data, removedMessageId) {
    const normalizedRemovedMessageId = String(removedMessageId || "").trim();
    const hasPendingReplyTarget =
      state.pendingReply &&
      state.pendingReply.threadId === state.activeThreadId &&
      String(state.pendingReply.messageId || "").trim() === normalizedRemovedMessageId;
    const activePendingEdit = getActivePendingEdit();
    const isRemovingEditedMessage =
      activePendingEdit &&
      String(activePendingEdit.messageId || "").trim() === normalizedRemovedMessageId;

    if (hasPendingReplyTarget) {
      clearPendingReply({ render: false });
    }

    if (isRemovingEditedMessage) {
      clearPendingEdit({ render: false });
      if (input) {
        input.value = "";
        resizeComposerInput();
      }
    }

    if (hasPendingReplyTarget || isRemovingEditedMessage) {
      renderReplyState();
    }

    closeMessageActionMenus();
    state.shouldStickToBottom = false;
    await loadThreads();
    state.activeThreadId = data.thread?.threadId || activeThread.threadId;
    render();
  }

  async function handleMessageRemoveAction(thread, message, triggerElement = null) {
    if (isAdminLiveChatReadOnly) {
      return;
    }

    const threadId = String(thread?.threadId || "").trim();
    const messageId = String(message?.id || "").trim();
    if (!threadId || !messageId || state.isSending) {
      return;
    }

    openDeleteModal(thread, message, triggerElement);
  }

  function getThreadById(threadId) {
    return state.threads.find((thread) => thread.threadId === threadId) || null;
  }

  function getLiveChatThreadTargetScore(thread, target) {
    if (!thread || !target) {
      return 0;
    }

    const threadId = String(thread?.threadId || "").trim();
    if (target.threadId && threadId === target.threadId) {
      return 1000;
    }

    let score = 0;
    const targetCustomerToken = normalizeOrderMatchValue(target.customer);
    const threadCustomerToken = normalizeOrderMatchValue(getThreadCustomerDisplayName(thread));
    if (targetCustomerToken && threadCustomerToken) {
      if (threadCustomerToken === targetCustomerToken) {
        score += 90;
      } else if (
        threadCustomerToken.includes(targetCustomerToken) ||
        targetCustomerToken.includes(threadCustomerToken)
      ) {
        score += 60;
      }
    }

    const targetProductIdToken = normalizeOrderMatchValue(target.productId);
    const threadProductIdToken = normalizeOrderMatchValue(thread?.productId);
    if (targetProductIdToken && threadProductIdToken && targetProductIdToken === threadProductIdToken) {
      score += 70;
    }

    const targetProductToken = normalizeOrderMatchValue(target.product);
    const threadProductToken = normalizeOrderMatchValue(getThreadProductDisplayName(thread));
    if (targetProductToken && threadProductToken) {
      if (targetProductToken === threadProductToken) {
        score += 50;
      } else if (
        threadProductToken.includes(targetProductToken) ||
        targetProductToken.includes(threadProductToken)
      ) {
        score += 30;
      }
    }

    const targetOrderToken = normalizeOrderMatchValue(target.orderId);
    if (targetOrderToken && state.orders.length) {
      const hasOrderMatch = getLiveChatOrderGroupsForThread(thread)
        .some((group) => normalizeOrderMatchValue(group.orderId) === targetOrderToken);
      if (hasOrderMatch) {
        score += 80;
      }
    }

    return score;
  }

  function applyInitialLiveChatTarget() {
    if (state.initialThreadTargetApplied || !state.initialThreadTarget || !state.threads.length) {
      return false;
    }

    const bestMatch = state.threads.reduce(
      (best, thread) => {
        const score = getLiveChatThreadTargetScore(thread, state.initialThreadTarget);
        const updatedAt = new Date(thread?.updatedAt || 0).getTime() || 0;
        if (!best.thread || score > best.score || (score === best.score && updatedAt > best.updatedAt)) {
          return { thread, score, updatedAt };
        }
        return best;
      },
      { thread: null, score: 0, updatedAt: 0 },
    );

    state.initialThreadTargetApplied = true;
    if (bestMatch.thread && bestMatch.score > 0) {
      state.activeThreadId = bestMatch.thread.threadId;
      state.activeConversationTab = "conversation";
      if (searchInput) {
        searchInput.value = "";
      }
      state.searchQuery = "";
      return true;
    }

    const fallbackSearch = String(
      state.initialThreadTarget.customer ||
      state.initialThreadTarget.product ||
      "",
    ).trim();
    if (fallbackSearch) {
      state.searchQuery = fallbackSearch;
      if (searchInput) {
        searchInput.value = fallbackSearch;
      }
      const fallbackThread = getVisibleThreads()[0] || null;
      if (fallbackThread?.threadId) {
        state.activeThreadId = fallbackThread.threadId;
      }
    }
    return false;
  }

  function getLatestUserMessageTimestamp(thread) {
    const messages = Array.isArray(thread?.messages) ? thread.messages : [];
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message?.isFromSupport === true) {
        continue;
      }
      const timestamp = String(message?.timestamp || "").trim();
      if (timestamp) {
        return timestamp;
      }
    }

    return "";
  }

  function getLatestThreadMessageTimestamp(thread) {
    const messages = Array.isArray(thread?.messages) ? thread.messages : [];
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const timestamp = String(messages[index]?.timestamp || "").trim();
      if (timestamp) {
        return timestamp;
      }
    }

    return String(thread?.updatedAt || "").trim();
  }

  function formatRelativeThreadTime(value) {
    const normalizedValue = String(value || "").trim();
    if (!normalizedValue) {
      return "";
    }

    const date = new Date(normalizedValue);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const diffMs = Math.max(0, Date.now() - date.getTime());
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 1) {
      return "Just now";
    }
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }

    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 5) {
      return `${diffWeeks}w ago`;
    }

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) {
      return `${Math.max(1, diffMonths)}mo ago`;
    }

    const diffYears = Math.floor(diffDays / 365);
    return `${Math.max(1, diffYears)}y ago`;
  }

  const employeeChatThreadReceiptCheckIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="employee-chat-thread-item__receipt-icon" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  function getSupportMessageReadStatus(thread, message) {
    if (message?.isFromSupport !== true) {
      return null;
    }

    const messageDate = parseValidDate(message?.timestamp);
    if (!messageDate) {
      return "sent";
    }

    const lastReadAt = parseValidDate(thread?.lastReadAt);
    if (!lastReadAt) {
      return "sent";
    }

    if (messageDate.getTime() <= lastReadAt.getTime()) {
      return "seen";
    }

    return "delivered";
  }

  function buildEmployeeChatThreadReceiptMarkup(status) {
    if (!status) {
      return "";
    }

    const check = `<span class="employee-chat-thread-item__receipt-check" aria-hidden="true">${employeeChatThreadReceiptCheckIcon}</span>`;
    if (status === "sent") {
      return `<span class="employee-chat-thread-item__receipt employee-chat-thread-item__receipt--sent" aria-label="Sent">${check}</span>`;
    }

    const receiptClass = status === "seen"
      ? "employee-chat-thread-item__receipt--seen"
      : "employee-chat-thread-item__receipt--delivered";
    const receiptLabel = status === "seen" ? "Seen" : "Delivered";
    return `<span class="employee-chat-thread-item__receipt ${receiptClass}" aria-label="${receiptLabel}">${check}<span class="employee-chat-thread-item__receipt-check employee-chat-thread-item__receipt-check--second" aria-hidden="true">${employeeChatThreadReceiptCheckIcon}</span></span>`;
  }

  function buildEmployeeChatThreadMetaMarkup(thread) {
    if (hasUnreadCustomerMessage(thread)) {
      return "";
    }

    const relativeTime = formatRelativeThreadTime(getLatestThreadMessageTimestamp(thread));
    if (!relativeTime) {
      return "";
    }

    const messages = Array.isArray(thread?.messages) ? thread.messages : [];
    const latestMessage = messages[messages.length - 1] || null;
    const receipt = latestMessage?.isFromSupport === true
      ? buildEmployeeChatThreadReceiptMarkup(getSupportMessageReadStatus(thread, latestMessage))
      : "";

    return `<span class="employee-chat-thread-item__meta"><span class="employee-chat-thread-item__status">${receipt}<time>${escapeHtml(relativeTime)}</time></span></span>`;
  }

  function getEmployeeChatThreadReceiptSignature(thread) {
    if (hasUnreadCustomerMessage(thread)) {
      return "";
    }

    const messages = Array.isArray(thread?.messages) ? thread.messages : [];
    const latestMessage = messages[messages.length - 1] || null;
    if (latestMessage?.isFromSupport !== true) {
      return "";
    }

    return String(getSupportMessageReadStatus(thread, latestMessage) || "");
  }

  function formatSentStatusLabel(value) {
    const normalizedValue = String(value || "").trim();
    if (!normalizedValue) {
      return "Sent";
    }

    const date = parseValidDate(normalizedValue);
    if (!date) {
      return "Sent";
    }

    const diffMs = Math.max(0, Date.now() - date.getTime());
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 1) {
      return "Sent";
    }

    if (diffMinutes < 60) {
      return `Sent ${diffMinutes}m ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `Sent ${diffHours}h ago`;
    }

    return "Sent";
  }

  function getThreadPresenceState(thread) {
    return getThreadPresenceActor(thread, "user")
      ? { label: "Online", className: "is-online" }
      : { label: "Offline", className: "is-offline" };
  }

  function getCustomerLastActiveAt(thread) {
    const candidates = [
      thread?.customerLastActiveAt,
      thread?.customerLastOnlineAt,
      thread?.lastOnlineAt,
      thread?.typing?.user?.updatedAt,
      getLatestUserMessageTimestamp(thread),
      thread?.updatedAt,
    ];

    for (const value of candidates) {
      const normalizedValue = String(value || "").trim();
      if (!normalizedValue) {
        continue;
      }
      const date = new Date(normalizedValue);
      if (!Number.isNaN(date.getTime())) {
        return normalizedValue;
      }
    }

    return "";
  }

  function formatPresenceBadgeLabel(value) {
    const date = new Date(value || 0);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
    if (diffMinutes < 1) {
      return "now";
    }
    if (diffMinutes < 60) {
      return `${diffMinutes}m`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours}h`;
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
      return `${diffDays}d`;
    }

    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 5) {
      return `${diffWeeks}w`;
    }

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) {
      return `${Math.max(1, diffMonths)}mo`;
    }

    const diffYears = Math.floor(diffDays / 365);
    return `${Math.max(1, diffYears)}y`;
  }

  function buildCustomerPresenceBadgeMarkup(thread) {
    if (getThreadPresenceActor(thread, "user")) {
      return '<span class="lcx-avatar__status" aria-label="Online"></span>';
    }

    const lastActiveLabel = formatPresenceBadgeLabel(getCustomerLastActiveAt(thread));
    if (!lastActiveLabel) {
      return '<span class="lcx-avatar__status is-offline" aria-label="Offline"></span>';
    }

    return `<span class="lcx-avatar__status is-offline" aria-label="Last active ${escapeHtml(lastActiveLabel)}"><span class="lcx-avatar__status-label">${escapeHtml(lastActiveLabel)}</span></span>`;
  }

  function buildConversationPresenceDotMarkup(thread, presenceState) {
    if (presenceState.className === "is-online") {
      return '<span class="employee-chat-conversation-status__dot is-online" aria-hidden="true"></span>';
    }

    const lastActiveLabel = formatPresenceBadgeLabel(getCustomerLastActiveAt(thread));
    if (!lastActiveLabel) {
      return '<span class="employee-chat-conversation-status__dot is-offline" aria-hidden="true"></span>';
    }

    return `<span class="employee-chat-conversation-status__dot is-offline has-label" aria-hidden="true"><span class="employee-chat-conversation-status__dot-label">${escapeHtml(lastActiveLabel)}</span></span>`;
  }

  function hasUnreadCustomerMessage(thread) {
    const latestUserTimestamp = getLatestUserMessageTimestamp(thread);
    if (!latestUserTimestamp) {
      return false;
    }

    const latestUserDate = new Date(latestUserTimestamp);
    if (Number.isNaN(latestUserDate.getTime())) {
      return false;
    }

    const supportReadAt = String(thread?.supportReadAt || "").trim();
    if (!supportReadAt) {
      return true;
    }

    const supportReadDate = new Date(supportReadAt);
    if (Number.isNaN(supportReadDate.getTime())) {
      return true;
    }

    return latestUserDate.getTime() > supportReadDate.getTime();
  }

  function getUnreadCustomerThreadCount() {
    return state.threads.filter(hasUnreadCustomerMessage).length;
  }

  function renderLiveChatNavBadge() {
    const unreadCount = getUnreadCustomerThreadCount();
    if (typeof window.gmsUpdateLiveChatNavUnreadCount === "function") {
      window.gmsUpdateLiveChatNavUnreadCount(unreadCount);
    }

    const liveChatNavBadges = document.querySelectorAll("[data-live-chat-nav-badge]");
    if (!liveChatNavBadges.length) {
      return;
    }

    const hasUnreadChat = unreadCount > 0;
    const unreadLabel = hasUnreadChat
      ? `${unreadCount} unread chat ${unreadCount === 1 ? "message" : "messages"}`
      : "No unread chat messages";

    liveChatNavBadges.forEach((badge) => {
      badge.hidden = !hasUnreadChat;
      badge.textContent = hasUnreadChat ? String(unreadCount) : "0";
      badge.setAttribute("aria-label", unreadLabel);
    });

    if (unreadCount <= 0) {
      return;
    }
  }

  function getLatestSeenSupportMessageId(thread) {
    const messages = Array.isArray(thread?.messages) ? thread.messages : [];
    const lastReadAt = parseValidDate(thread?.lastReadAt);
    if (!lastReadAt) {
      return "";
    }

    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message?.isFromSupport !== true) {
        continue;
      }

      const messageSource = String(message?.source || "").trim().toLowerCase();
      if (messageSource === "ai") {
        continue;
      }

      const messageId = String(message?.id || "").trim();
      const messageText = String(message?.text || "").trim();
      const imageUrl = String(message?.imageUrl || "").trim();
      const isDeleted = isDeletedMessage(message);
      const timestamp = parseValidDate(message?.timestamp);
      if (!messageId || !timestamp || (!messageText && !imageUrl && !isDeleted)) {
        continue;
      }

      if (timestamp.getTime() <= lastReadAt.getTime()) {
        return messageId;
      }
    }

    return "";
  }

  function getConversationMetaLabel(thread) {
    const priceLabel = formatMoney(
      Number(thread?.productOriginalPrice || 0),
      typeof thread?.productSalesPrice === "number"
        ? Number(thread.productSalesPrice)
        : null,
    );
    const metaParts = [thread?.productCategory || "No category", priceLabel].filter(Boolean);
    return metaParts.join(" - ") || "Product conversation";
  }

  function getPinnedProductStateKey(thread) {
    return String(thread?.threadId || thread?.customerId || thread?.productId || "").trim();
  }

  function isPinnedProductExpanded(thread) {
    const stateKey = getPinnedProductStateKey(thread);
    if (!stateKey) {
      return true;
    }

    return state.pinnedProductExpandedByThread[stateKey] !== false;
  }

  function togglePinnedProductDropdown() {
    const activeThread = getThreadById(state.activeThreadId);
    if (!activeThread || !hasPinnedProductContext(activeThread)) {
      return;
    }

    const previousScrollTop = messageList ? messageList.scrollTop : 0;
    const stateKey = getPinnedProductStateKey(activeThread);
    const nextExpanded = !isPinnedProductExpanded(activeThread);
    if (stateKey) {
      state.pinnedProductExpandedByThread[stateKey] = nextExpanded;
    }

    if (pinnedProductSlot?.querySelector("[data-employee-chat-pinned-product-toggle]")) {
      syncPinnedProductDropdownState(activeThread, nextExpanded);
    } else {
      renderPinnedProductSlot(activeThread);
    }

    if (messageList) {
      messageList.scrollTop = previousScrollTop;
      state.lastMessageListScrollTop = previousScrollTop;
    }
    updateScrollDownButtonVisibility({ immediateHide: false });
  }

  function buildPinnedProductCardMarkup(thread) {
    const productTitle = getThreadProductDisplayName(thread);
    const isExpanded = isPinnedProductExpanded(thread);
    const categoryLabel = String(thread?.productCategory || "").trim() || "No category";
    const originalPrice = Number(thread?.productOriginalPrice || 0);
    const salesPrice =
      typeof thread?.productSalesPrice === "number"
        ? Number(thread.productSalesPrice)
        : null;
    const priceLabel =
      formatPinnedProductPrice(originalPrice, salesPrice) || "Price unavailable";
    const hasOriginalPriceLabel =
      typeof salesPrice === "number" &&
      salesPrice >= 0 &&
      originalPrice > 0 &&
      salesPrice < originalPrice;
    const originalPriceLabel = originalPrice > 0 ? formatPesoSignValue(originalPrice) : "";
    const ratingValue = Number(thread?.productRating || 0);
    const ratingLabel =
      Number.isFinite(ratingValue) && ratingValue > 0
        ? `${ratingValue % 1 === 0 ? ratingValue.toFixed(0) : ratingValue.toFixed(1)} rating`
        : "No rating yet";
    const imageUrl = String(thread?.productImageUrl || "").trim();
    const fallbackInitial =
      productTitle
        .trim()
        .charAt(0)
        .toUpperCase() || "P";

    return `
      <div class="employee-chat-pinned-product-dropdown${isExpanded ? " is-expanded" : " is-collapsed"}">
        <article
          class="employee-chat-pinned-product"
          aria-label="Pinned product"
          aria-hidden="${isExpanded ? "false" : "true"}"
          role="button"
          tabindex="${isExpanded ? "0" : "-1"}"
          data-employee-chat-pinned-product-card
        >
          <div class="employee-chat-pinned-product__media">
            ${
              imageUrl
                ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(productTitle)}" loading="lazy" />`
                : `<span>${escapeHtml(fallbackInitial)}</span>`
            }
          </div>
          <div class="employee-chat-pinned-product__body">
            <span class="employee-chat-pinned-product__category">${escapeHtml(categoryLabel)}</span>
            <div class="employee-chat-pinned-product__title-row">
              <i class="fa-solid fa-thumbtack employee-chat-pinned-product__icon" aria-hidden="true"></i>
              <strong class="employee-chat-pinned-product__name">${escapeHtml(productTitle)}</strong>
            </div>
            <div class="employee-chat-pinned-product__meta">
              <span class="employee-chat-pinned-product__price">${escapeHtml(priceLabel)}</span>
              ${
                hasOriginalPriceLabel && originalPriceLabel
                  ? `<span class="employee-chat-pinned-product__original-price">${escapeHtml(originalPriceLabel)}</span>`
                  : ""
              }
              <span class="employee-chat-pinned-product__rating">
                <i class="fa-solid fa-star" aria-hidden="true"></i>
                ${escapeHtml(ratingLabel)}
              </span>
            </div>
          </div>
        </article>
        <button
          type="button"
          class="employee-chat-pinned-product-toggle"
          data-employee-chat-pinned-product-toggle
          aria-expanded="${isExpanded ? "true" : "false"}"
          aria-label="${isExpanded ? "Hide pinned product" : "Show pinned product"}"
          title="${isExpanded ? "Hide pinned product" : "Show pinned product"}"
        >
          <i class="fa-solid fa-chevron-${isExpanded ? "up" : "down"}" aria-hidden="true"></i>
        </button>
      </div>
    `;
  }

  function syncPinnedProductDropdownState(thread, isExpanded) {
    if (!pinnedProductSlot) {
      return;
    }

    const dropdown = pinnedProductSlot.querySelector(".employee-chat-pinned-product-dropdown");
    const card = pinnedProductSlot.querySelector("[data-employee-chat-pinned-product-card]");
    const toggle = pinnedProductSlot.querySelector("[data-employee-chat-pinned-product-toggle]");
    const icon = toggle?.querySelector("i");

    pinnedProductSlot.classList.toggle("is-expanded", isExpanded);
    pinnedProductSlot.classList.toggle("is-collapsed", !isExpanded);
    dropdown?.classList.toggle("is-expanded", isExpanded);
    dropdown?.classList.toggle("is-collapsed", !isExpanded);

    if (card instanceof HTMLElement) {
      card.hidden = false;
      card.tabIndex = isExpanded ? 0 : -1;
      card.setAttribute("aria-hidden", isExpanded ? "false" : "true");
    }

    if (toggle instanceof HTMLButtonElement) {
      toggle.setAttribute("aria-expanded", isExpanded ? "true" : "false");
      toggle.setAttribute("aria-label", isExpanded ? "Hide pinned product" : "Show pinned product");
      toggle.title = isExpanded ? "Hide pinned product" : "Show pinned product";
    }

    if (icon instanceof HTMLElement) {
      icon.className = `fa-solid fa-chevron-${isExpanded ? "up" : "down"}`;
      icon.setAttribute("aria-hidden", "true");
    }
  }

  function renderPinnedProductSlot(thread) {
    if (!pinnedProductSlot) {
      return;
    }

    if (!thread || !hasPinnedProductContext(thread)) {
      pinnedProductSlot.innerHTML = "";
      pinnedProductSlot.hidden = true;
      pinnedProductSlot.classList.remove("is-expanded", "is-collapsed");
      return;
    }

    const isExpanded = isPinnedProductExpanded(thread);
    pinnedProductSlot.classList.toggle("is-expanded", isExpanded);
    pinnedProductSlot.classList.toggle("is-collapsed", !isExpanded);
    pinnedProductSlot.innerHTML = buildPinnedProductCardMarkup(thread);
    pinnedProductSlot.hidden = false;
  }

  function getThreadCustomerDisplayName(thread) {
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

  function getThreadCustomerAvatarUrl(thread) {
    const candidates = [
      thread?.customerAvatarUrl,
      thread?.customerImageUrl,
      thread?.profileImageUrl,
      thread?.avatarUrl,
      thread?.photoUrl,
    ];

    for (const candidate of candidates) {
      const normalizedCandidate = String(candidate || "").trim();
      if (normalizedCandidate) {
        return normalizedCandidate;
      }
    }

    return "";
  }

  function getThreadCustomerInitials(thread, fallback = "U") {
    const initials = getThreadCustomerDisplayName(thread)
      .split(/\s+/)
      .map((part) => part.charAt(0))
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
    return initials || fallback;
  }

  function getThreadCustomerToneIndex(thread) {
    const buyerId = String(
      thread?.customerAccountId
      || thread?.accountId
      || thread?.customerId
      || thread?.userId
      || thread?.customerEmail
      || "",
    ).trim();
    const buyerName = String(getThreadCustomerDisplayName(thread) || "Buyer").trim();
    const source = `${buyerId}${buyerName}`;
    let hash = 0;
    for (const char of source) {
      hash = (hash + char.charCodeAt(0)) % 6;
    }
    return hash + 1;
  }

  function getThreadCustomerAvatarClassName(baseClass, thread) {
    const avatarUrl = getThreadCustomerAvatarUrl(thread);
    return [
      baseClass,
      "buyer-data-avatar",
      "buyer-data-list-avatar",
      "super-admin-company-card__logo",
      `super-admin-company-card__logo--tone-${getThreadCustomerToneIndex(thread)}`,
      avatarUrl ? "has-image" : "",
    ].filter(Boolean).join(" ");
  }

  function buildThreadCustomerAvatarMarkup(thread, baseClass, options = {}) {
    const tagName = options.tagName || "span";
    const avatarUrl = getThreadCustomerAvatarUrl(thread);
    const initial = options.initial || getThreadCustomerInitials(thread, options.fallbackInitial || "U");
    const className = getThreadCustomerAvatarClassName(baseClass, thread);
    const content = avatarUrl
      ? `<img src="${escapeHtml(avatarUrl)}" alt="" loading="lazy" />`
      : escapeHtml(initial);
    const presence = options.showStatus === false
      ? ""
      : buildCustomerPresenceBadgeMarkup(thread);

    return `<${tagName} class="${escapeHtml(className)}">${content}${presence}</${tagName}>`;
  }

  function setThreadCustomerAvatarElement(element, thread, baseClass, options = {}) {
    if (!(element instanceof HTMLElement)) {
      return;
    }

    const avatarUrl = getThreadCustomerAvatarUrl(thread);
    const initial = options.initial || getThreadCustomerInitials(thread, options.fallbackInitial || "U");
    element.className = getThreadCustomerAvatarClassName(baseClass, thread);
    element.replaceChildren();

    if (avatarUrl) {
      const image = document.createElement("img");
      image.src = avatarUrl;
      image.alt = "";
      image.loading = "lazy";
      element.appendChild(image);
    } else {
      element.textContent = initial;
    }

    if (options.showStatus !== false && thread) {
      element.insertAdjacentHTML("beforeend", buildCustomerPresenceBadgeMarkup(thread));
    }
  }

  function buildSeenIndicatorMarkup(thread, fallbackInitial, options = {}) {
    const avatarUrl = getThreadCustomerAvatarUrl(thread);
    const animateClass = options.animate ? " is-animated" : "";
    const className = getThreadCustomerAvatarClassName(
      `employee-chat-message__seen-indicator${animateClass}`,
      thread,
    );

    return `<div class="${escapeHtml(className)}" title="Seen" aria-label="Seen by customer">
      ${
        avatarUrl
          ? `<img src="${escapeHtml(avatarUrl)}" alt="" loading="lazy" />`
          : `<span class="employee-chat-message__seen-indicator-initial">${escapeHtml(fallbackInitial)}</span>`
      }
    </div>`;
  }

  function getThreadProductDisplayName(thread) {
    return String(thread?.productName || "Unnamed Product").trim() || "Unnamed Product";
  }

  function getThreadListSignature(threads) {
    return JSON.stringify(
      threads.map((thread) => {
        const customer = getThreadCustomerDisplayName(thread);
        const productName = getThreadProductDisplayName(thread);
        const preview = getThreadPreview(thread);
        const relativeTime = hasUnreadCustomerMessage(thread)
          ? ""
          : formatRelativeThreadTime(getLatestThreadMessageTimestamp(thread));
        const receiptStatus = getEmployeeChatThreadReceiptSignature(thread);
        const isUnread = hasUnreadCustomerMessage(thread);
        const presenceLabel = getThreadPresenceActor(thread, "user")
          ? "online"
          : formatPresenceBadgeLabel(getCustomerLastActiveAt(thread));
        const initial =
          (customer || "?")
            .trim()
            .charAt(0)
            .toUpperCase() || "?";

        return {
          id: String(thread.threadId || ""),
          active: thread.threadId === state.activeThreadId,
          productName: String(productName),
          customer: String(customer),
          preview: String(preview),
          relativeTime: String(relativeTime),
          receiptStatus: String(receiptStatus),
          presenceLabel: String(presenceLabel),
          isUnread,
          initial: String(initial),
        };
      }),
    );
  }

  function getConversationSignature(thread) {
    if (!thread) {
      return "empty";
    }

    const messages = Array.isArray(thread.messages) ? thread.messages : [];
    return JSON.stringify({
      threadId: String(thread.threadId || ""),
      customerId: String(thread.customerId || ""),
      customerLabel: String(thread.customerLabel || "App User"),
      updatedAt: formatOptionalTimestamp(thread.updatedAt),
      lastReadAt: formatOptionalTimestamp(thread.lastReadAt),
      supportReadAt: formatOptionalTimestamp(thread.supportReadAt),
      userTyping: getThreadTypingSignature(thread, "user"),
      productId: String(thread.productId || ""),
      productName: String(thread.productName || "Unnamed Product"),
      productCategory: String(thread.productCategory || ""),
      productDescription: String(thread.productDescription || ""),
      productImageUrl: String(thread.productImageUrl || ""),
      productOriginalPrice: Number(thread.productOriginalPrice || 0),
      productSalesPrice:
        typeof thread.productSalesPrice === "number"
          ? Number(thread.productSalesPrice)
          : null,
      productStock: Number.isFinite(Number(thread.productStock))
        ? Number(thread.productStock)
        : null,
      productRating: Number.isFinite(Number(thread.productRating))
        ? Number(thread.productRating)
        : 0,
      productMeta: getConversationMetaLabel(thread),
      latestPinnedProductMessage: (() => {
        const pinnedMessage = getLatestPinnedProductMessage(thread);
        return pinnedMessage
          ? {
              id: String(pinnedMessage.id || ""),
              text: String(pinnedMessage.text || "").trim(),
              timestamp: formatTimestamp(pinnedMessage.timestamp),
            }
          : null;
      })(),
      messages: messages.map((message) => ({
        isFromSupport: message?.isFromSupport === true,
        source: String(message?.source || "").trim().toLowerCase(),
        text: String(message?.text || "").trim(),
        imageUrl: String(message?.imageUrl || "").trim(),
        imageName: String(message?.imageName || "").trim(),
        deletedAt: formatOptionalTimestamp(message?.deletedAt),
        timestamp: formatTimestamp(message?.timestamp),
      })),
    });
  }

  function getVisibleThreads() {
    const query = String(state.searchQuery || "").trim().toLowerCase();
    if (!query) {
      return state.threads;
    }

    return state.threads.filter((thread) => {
      const haystack = [
        getThreadProductDisplayName(thread),
        getThreadCustomerDisplayName(thread),
        getThreadPreview(thread),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }

  async function markThreadSeenBySupport(thread) {
    if (isAdminLiveChatReadOnly) {
      return;
    }

    if (!thread?.threadId || !hasUnreadCustomerMessage(thread)) {
      return;
    }

    const latestUserTimestamp = getLatestUserMessageTimestamp(thread);
    const signature = `${thread.threadId}::${latestUserTimestamp}`;
    if (
      state.pendingSupportReadSignature === signature ||
      state.lastMarkedSupportReadSignature === signature
    ) {
      return;
    }

    state.pendingSupportReadSignature = signature;

    try {
      const response = await fetch(
        `/api/chat-support/${encodeURIComponent(thread.threadId)}/read-support`,
        {
          method: "POST",
          headers: withEmployeeDashboardAdminHeaders({
            Accept: "application/json",
          }),
        },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to mark chat as seen.");
      }

      const updatedThread = data.thread;
      if (updatedThread && typeof updatedThread === "object") {
        state.threads = state.threads.map((candidate) =>
          candidate.threadId === updatedThread.threadId ? updatedThread : candidate,
        );
        state.lastMarkedSupportReadSignature = signature;
        render();
      }
    } catch (_) {
      state.lastMarkedSupportReadSignature = "";
    } finally {
      if (state.pendingSupportReadSignature === signature) {
        state.pendingSupportReadSignature = "";
      }
    }
  }

  function setActiveThread(threadId) {
    const wasEditingActiveMessage = Boolean(getActivePendingEdit());
    if (state.activeThreadId && state.activeThreadId !== threadId) {
      stopSupportTyping({ threadId: state.activeThreadId });
      clearPendingMedia();
      clearPendingReply();
      clearPendingEdit();
      closeDeleteModal({ restoreFocus: false });
      closeMessageActionMenus();
      if (wasEditingActiveMessage && input) {
        input.value = "";
        resizeComposerInput();
      }
      closeChatMediaModal();
    }
    closeConversationMenu();
    state.activeBubbleTimeMessageId = "";
    state.activeMediaDetailsMessageId = "";
    state.activeThreadId = threadId;
    state.shouldStickToBottom = true;
    render();
  }

  function handleConversationMenuAction(action) {
    const normalizedAction = String(action || "").trim().toLowerCase();
    if (!normalizedAction) {
      return;
    }

    if (["conversation", "media", "profile", "history"].includes(normalizedAction)) {
      setActiveConversationTab(normalizedAction);
    }
  }

  function renderThreadList() {
    if (!threadList) {
      return;
    }

    const visibleThreads = getVisibleThreads();

    if (!state.threads.length) {
      if (state.lastThreadListSignature === "empty") {
        return;
      }
      threadList.innerHTML = `
        <div class="employee-chat-placeholder">
          <strong>No conversations yet</strong>
          <p>Messages from the app will appear here automatically.</p>
        </div>
      `;
      state.lastThreadListSignature = "empty";
      return;
    }

    if (!visibleThreads.length) {
      const nextSignature = `search-empty:${String(state.searchQuery || "").trim().toLowerCase()}`;
      if (state.lastThreadListSignature === nextSignature) {
        return;
      }
      threadList.innerHTML = `
        <div class="employee-chat-placeholder">
          <strong>No matching conversations</strong>
          <p>Try a different name, product, or message keyword.</p>
        </div>
      `;
      state.lastThreadListSignature = nextSignature;
      return;
    }

    const nextSignature = getThreadListSignature(visibleThreads);
    if (state.lastThreadListSignature === nextSignature) {
      return;
    }

    threadList.innerHTML = visibleThreads
      .map((thread) => {
        const isActive = thread.threadId === state.activeThreadId;
        const customer = getThreadCustomerDisplayName(thread);
        const preview = getThreadPreview(thread);
        const isUnread = hasUnreadCustomerMessage(thread);
        const threadMeta = buildEmployeeChatThreadMetaMarkup(thread);
        const initial = getThreadCustomerInitials(thread, "?");

        return `
          <button
            type="button"
            class="employee-chat-thread-item${isActive ? " is-active" : ""}${isUnread ? " is-unread" : ""}"
            data-thread-id="${escapeHtml(thread.threadId)}"
          >
            ${buildThreadCustomerAvatarMarkup(thread, "employee-chat-thread-item__avatar", {
              initial,
              fallbackInitial: "?",
            })}
            <span class="employee-chat-thread-item__content">
              <span class="employee-chat-thread-item__title-row">
                <strong>${escapeHtml(customer)}</strong>
                ${isUnread
                  ? '<span class="employee-chat-thread-item__unread-dot" aria-hidden="true"></span>'
                  : threadMeta}
              </span>
              <span class="employee-chat-thread-item__preview-row">
                <span class="employee-chat-thread-item__preview">${escapeHtml(preview)}</span>
              </span>
            </span>
          </button>
        `;
      })
      .join("");
    state.lastThreadListSignature = nextSignature;
  }

  function renderConversation() {
    const activeThread = getThreadById(state.activeThreadId);

    if (conversationCount) {
      const label = state.threads.length === 1 ? "conversation" : "conversations";
      conversationCount.textContent = `${state.threads.length} ${label}`;
    }

    if (!activeThread) {
      state.lastRenderedThreadId = "";
      state.lastConversationSignature = "empty";
      state.shouldStickToBottom = false;
      if (emptyState) {
        emptyState.hidden = false;
      }
      if (conversationShell) {
        conversationShell.hidden = true;
      }
      renderPinnedProductSlot(null);
      renderMediaPanel(null);
      renderProfilePanel(null);
      renderHistoryPanel(null);
      renderLiveChatConversationSidePanel(null);
      hideScrollDownButton({ immediate: true });
      return;
    }

    if (emptyState) {
      emptyState.hidden = true;
    }
    if (conversationShell) {
      conversationShell.hidden = false;
    }

    renderLiveChatConversationSidePanel(activeThread);

    const nextConversationSignature = getConversationSignature(activeThread);
    if (state.lastConversationSignature === nextConversationSignature) {
      void markThreadSeenBySupport(activeThread);
      state.lastMessageListScrollTop = messageList ? messageList.scrollTop : 0;
      updateScrollDownButtonVisibility({ immediateHide: false });
      return;
    }
    renderPinnedProductSlot(activeThread);

    const initial = getThreadCustomerInitials(activeThread, "?");
    const presenceState = getThreadPresenceState(activeThread);

    if (avatar) {
      setThreadCustomerAvatarElement(avatar, activeThread, "employee-chat-conversation-avatar", {
        initial,
        fallbackInitial: "?",
      });
    }

    if (customerLabel) {
      customerLabel.textContent = getThreadCustomerDisplayName(activeThread);
    }
    if (productName) {
      productName.textContent = getThreadCustomerDisplayName(activeThread);
    }
    if (productMeta) {
      productMeta.classList.remove("is-online", "is-offline");
      productMeta.classList.add(presenceState.className);
      productMeta.innerHTML = `
        ${buildConversationPresenceDotMarkup(activeThread, presenceState)}
        <span>${escapeHtml(presenceState.label)}</span>
      `;
    }

    renderMediaPanel(activeThread);
    renderProfilePanel(activeThread);
    renderHistoryPanel(activeThread);

    const messages = Array.isArray(activeThread.messages) ? activeThread.messages : [];
    let mediaItemCursor = 0;
    const customerInitial = getThreadCustomerInitials(activeThread, "U");
    const wasViewingSameThread = state.lastRenderedThreadId === activeThread.threadId;
    const isConversationVisible = state.activeConversationTab === "conversation";
    const previousScrollTop =
      isConversationVisible && messageList ? messageList.scrollTop : 0;
    const previousScrollHeight =
      isConversationVisible && messageList ? messageList.scrollHeight : 0;
    const previousClientHeight =
      isConversationVisible && messageList ? messageList.clientHeight : 0;
    const wasNearBottom =
      !wasViewingSameThread ||
      !isConversationVisible ||
      previousScrollHeight - (previousScrollTop + previousClientHeight) <= 32;

    if (messageList) {
      const latestSentSupportMessageId = [...messages]
        .reverse()
        .find((message) => {
          const isSupportMessage = message?.isFromSupport === true;
          const messageSource = String(message?.source || "").trim().toLowerCase();
          return isSupportMessage && messageSource !== "ai";
        })?.id;
      const latestSeenSupportMessageId = getLatestSeenSupportMessageId(activeThread);
      const normalizedLatestSeenSupportMessageId = String(latestSeenSupportMessageId || "").trim();
      const normalizedThreadLastReadAt = String(activeThread?.lastReadAt || "").trim();
      const previousSeenIndicatorMessageId = String(
        state.seenIndicatorMessageIdsByThread[activeThread.threadId] || "",
      ).trim();
      const previousSeenIndicatorReadAt = String(
        state.seenIndicatorReadAtByThread[activeThread.threadId] || "",
      ).trim();
      const shouldAnimateLatestSeenIndicator =
        state.seenIndicatorInitializedThreadIds[activeThread.threadId] === true &&
        Boolean(normalizedLatestSeenSupportMessageId) &&
        normalizedLatestSeenSupportMessageId !== previousSeenIndicatorMessageId &&
        normalizedThreadLastReadAt !== previousSeenIndicatorReadAt;
      const customerTypingMarkup = buildCustomerTypingIndicatorMarkup(
        activeThread,
        customerInitial,
      );

      const messageMarkup = messages
        .map((message, index) => {
          const messageId = String(message.id || "").trim();
          const isSupport = message.isFromSupport === true;
          const messageSource = String(message.source || "").trim().toLowerCase();
          const messageText = displayChatMessageText(message);
          const imageUrl = String(message.imageUrl || "").trim();
          const imageName = String(message.imageName || "").trim();
          const isDeleted = isDeletedMessage(message);
          const hasMedia = Boolean(imageUrl);
          if (isPinProductMessage(message) && !isDeleted) {
            const pinnedProductName = messageText || getThreadProductDisplayName(activeThread);
            return `
              <article class="employee-chat-pin-event"${messageId ? ` data-chat-message-id="${escapeHtml(messageId)}"` : ""}>
                <span class="employee-chat-pin-event__icon" aria-hidden="true">
                  <i class="fa-solid fa-thumbtack"></i>
                </span>
                <span class="employee-chat-pin-event__text">
                  <strong>${escapeHtml(pinnedProductName)}</strong>
                </span>
              </article>
            `;
          }
          const isMediaOnlyBubble = !isDeleted && hasMedia && !messageText;
          const mediaItemIndex = hasMedia ? mediaItemCursor++ : -1;
          const isVideo = isVideoAttachment(imageUrl, imageName);
          const isHeartOnly = isQuickHeartMessage(message);
          const isEmojiOnly = !isDeleted && !hasMedia && !isHeartOnly && isEmojiOnlyText(messageText);
          const isLongCopyBubble = messageText.length >= 56;
          const canRemoveMessage =
            isSupport &&
            messageSource !== "ai" &&
            Boolean(messageId) &&
            !isDeleted;
          const canEditMessage =
            isSupport &&
            messageSource !== "ai" &&
            Boolean(messageText) &&
            !isHeartOnly &&
            !isDeleted;
          const replyMeta = isDeleted ? null : getMessageReplyMeta(message);
          const isEdited = !isDeleted && Boolean(String(message.editedAt || "").trim());
          const shouldShowEditedInBubble = isEdited && !replyMeta;
          const shouldShowSentStatus =
            isSupport &&
            !isDeleted &&
            messageSource !== "ai" &&
            messageId &&
            messageId === String(latestSentSupportMessageId || "").trim() &&
            messageId !== normalizedLatestSeenSupportMessageId;
          const sentStatusLabel = shouldShowSentStatus
            ? formatSentStatusLabel(message.timestamp)
            : "";
          const shouldShowSeenIndicator =
            isSupport &&
            !isDeleted &&
            messageSource !== "ai" &&
            messageId &&
            messageId === normalizedLatestSeenSupportMessageId;
          const seenIndicatorMarkup = shouldShowSeenIndicator
            ? buildSeenIndicatorMarkup(activeThread, customerInitial, {
                animate:
                  shouldAnimateLatestSeenIndicator &&
                  messageId === normalizedLatestSeenSupportMessageId,
              })
            : "";
          const isLongReplyPreview = Boolean(replyMeta && replyMeta.previewText.length >= 40);
          const replyLineLabel = getReplyLineLabel(replyMeta, isSupport);
          const bubbleTimeLabel = formatTimestamp(message.timestamp) || "Now";
          const shouldShowBubbleTime =
            Boolean(messageId) && state.activeBubbleTimeMessageId === messageId;
          const mediaDetailsLabel = bubbleTimeLabel;
          const shouldShowMediaDetails =
            !isDeleted &&
            hasMedia &&
            Boolean(messageId) &&
            state.activeMediaDetailsMessageId === messageId;
          const actionMenuId = `employee-chat-message-menu-${index}`;
          const messageActionsMarkup = isAdminLiveChatReadOnly
            ? ""
            : `
                        <div class="employee-chat-message__actions">
                          <span class="employee-chat-message__action" title="Quick react">
                            <i class="fa-regular fa-face-smile" aria-hidden="true"></i>
                          </span>
                          <button
                            type="button"
                            class="employee-chat-message__action employee-chat-message__action-button"
                            title="Reply"
                            aria-label="Reply to this message"
                            data-employee-chat-reply-index="${index}"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-corner-up-left" aria-hidden="true"><path d="m9 14 6-6"/><path d="m4 10 5-5 5 5"/><path d="M20 20v-7a2 2 0 0 0-2-2H4"/></svg>
                          </button>
                          ${
                            messageText && !isDeleted
                              ? `<button
                            type="button"
                            class="employee-chat-message__action employee-chat-message__action-button"
                            title="Translate"
                            aria-label="Translate this message"
                            data-employee-chat-translate-index="${index}"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-languages" aria-hidden="true"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>
                          </button>`
                              : ""
                          }
                          ${
                            canRemoveMessage
                              ? `<div
                            class="employee-chat-message__action-menu"
                            data-employee-chat-action-menu
                          >
                            <button
                            type="button"
                            class="employee-chat-message__action employee-chat-message__action-button"
                            title="More actions"
                            aria-label="Open message actions"
                            aria-haspopup="true"
                            aria-expanded="false"
                            aria-controls="${actionMenuId}"
                            data-employee-chat-action-menu-toggle
                          >
                            <i class="fa-solid fa-ellipsis-vertical" aria-hidden="true"></i>
                          </button>
                          <div
                            id="${actionMenuId}"
                            class="employee-chat-message__action-dropdown"
                            data-employee-chat-action-dropdown
                            hidden
                          >
                            ${
                              canEditMessage
                                ? `<button
                              type="button"
                              class="employee-chat-message__action-dropdown-item"
                              data-employee-chat-edit-index="${index}"
                              title="Edit"
                              aria-label="Edit this message"
                            >
                              <span>Edit</span>
                            </button>`
                                : ""
                            }
                            ${
                              hasMedia
                                ? `<button
                              type="button"
                              class="employee-chat-message__action-dropdown-item"
                              data-employee-chat-details-index="${index}"
                              title="Details"
                              aria-label="View message details"
                            >
                              <span>Details</span>
                            </button>`
                                : ""
                            }
                            <button
                              type="button"
                              class="employee-chat-message__action-dropdown-item is-danger"
                              data-employee-chat-delete-index="${index}"
                              title="Delete"
                              aria-label="Remove this chat message"
                            >
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>`
                              : ""
                          }
                        </div>`;
          const previousTimestamp = messages[index - 1]?.timestamp;
          const nextMessage = messages[index + 1] || null;
          const currentDayKey = getCalendarDayKey(message.timestamp);
          const previousDayKey = getCalendarDayKey(previousTimestamp);
          const isFirstMessage = index === 0;
          const isNewDay = Boolean(currentDayKey && currentDayKey !== previousDayKey);
          const shouldShowTimestamp =
            isFirstMessage ||
            isNewDay ||
            hasTimestampGap(message.timestamp, previousTimestamp);
          const shouldShowFullDate =
            isNewDay &&
            !isSameCalendarDay(message.timestamp, new Date());
          const timestampLabel = formatTimestamp(message.timestamp, {
            includeDate: shouldShowFullDate,
          });
          const nextIsUser = nextMessage?.isFromSupport === false;
          const nextMessageImageUrl = String(nextMessage?.imageUrl || "").trim();
          const nextHasMedia = Boolean(nextMessageImageUrl);
          const nextIsEdited = Boolean(String(nextMessage?.editedAt || "").trim());
          const nextDayKey = getCalendarDayKey(nextMessage?.timestamp);
          const nextStartsNewTimedGroup =
            Boolean(nextDayKey && currentDayKey && nextDayKey !== currentDayKey) ||
            hasTimestampGap(nextMessage?.timestamp, message.timestamp);
          const currentStartsOwnAvatarGroup =
            shouldShowTimestamp || isEdited || hasMedia;
          const nextStartsOwnAvatarGroup =
            nextIsUser && (nextHasMedia || nextIsEdited || nextStartsNewTimedGroup);
          const shouldShowUserAvatar =
            !isSupport &&
            (!nextIsUser || currentStartsOwnAvatarGroup || nextStartsOwnAvatarGroup);
          const avatarBadgeMarkup = isSupport
            ? buildSupportMessageAvatarMarkup(message)
            : buildThreadCustomerAvatarMarkup(
                activeThread,
                `employee-chat-message__avatar-badge is-user${!shouldShowUserAvatar ? " is-hidden" : ""}`,
                { tagName: "div", initial: customerInitial },
              );
          const supportSenderLabelMarkup = isSupport
            ? buildSupportMessageSenderLabelMarkup(message)
            : "";
          const deletedBubbleLabel = isSupport
            ? "You deleted a message"
            : "Message deleted";
          const deletedBubbleMarkup = `<div class="employee-chat-message__deleted-content">
            <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2-icon lucide-trash-2" aria-hidden="true"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            <span>${escapeHtml(deletedBubbleLabel)}</span>
          </div>`;
          return `
            <article class="employee-chat-message${isSupport ? " is-support" : " is-user"}${isHeartOnly ? " is-heart" : ""}${isEmojiOnly ? " is-emoji" : ""}${shouldShowTimestamp ? " has-meta" : ""}"${messageId ? ` data-chat-message-id="${escapeHtml(messageId)}"` : ""}>
              ${
                shouldShowTimestamp
                  ? `<div class="employee-chat-message__meta">
                  <span>${escapeHtml(timestampLabel)}</span>
                </div>`
                  : ""
              }
              ${avatarBadgeMarkup}
              <div class="employee-chat-message__stack">
                ${supportSenderLabelMarkup}
                <div class="employee-chat-message__content-row">
                  <div class="employee-chat-message__bubble-thread${replyMeta ? " has-reply" : ""}${shouldShowEditedInBubble ? " has-edited-indicator" : ""}${isLongCopyBubble ? " has-long-copy" : ""}${isLongReplyPreview ? " has-long-reply" : ""}${isMediaOnlyBubble ? " has-media-only" : ""}">
                    ${
                      replyMeta
                        ? `<div class="employee-chat-message__reply-line">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-corner-up-left employee-chat-message__reply-icon" aria-hidden="true"><path d="m9 14 6-6"/><path d="m4 10 5-5 5 5"/><path d="M20 20v-7a2 2 0 0 0-2-2H4"/></svg>
                            <span class="employee-chat-message__reply-name">${escapeHtml(replyLineLabel)}</span>
                            ${
                              isEdited
                                ? '<span class="employee-chat-message__reply-separator" aria-hidden="true">&bull;</span><span class="employee-chat-message__edited-indicator">Edited</span>'
                                : ""
                            }
                          </div>`
                        : ""
                    }
                    <div class="employee-chat-message__main-row${replyMeta ? " has-reply" : ""}${isLongCopyBubble ? " has-long-copy" : ""}${isLongReplyPreview ? " has-long-reply" : ""}${isMediaOnlyBubble ? " has-media-only" : ""}">
                      ${
                        isMediaOnlyBubble && !replyMeta
                          ? `<div class="employee-chat-message__media-stack">
                              <div class="employee-chat-message__bubble${isDeleted ? " is-deleted" : ""}${isLongCopyBubble ? " is-long-copy" : ""}${isHeartOnly ? " is-heart" : ""}${isEmojiOnly ? " is-emoji" : ""}${hasMedia ? " has-media" : ""}${hasMedia && !messageText ? " has-media-only" : ""}"${messageId ? ` data-chat-message-bubble-id="${escapeHtml(messageId)}"` : ""}>
                                ${
                                  isDeleted
                                    ? deletedBubbleMarkup
                                    : imageUrl
                                    ? isVideo
                                      ? `<button
                                      type="button"
                                      class="employee-chat-message__attachment-button employee-chat-message__attachment-button--video"
                                      data-chat-media-index="${mediaItemIndex}"
                                      aria-label="Open video attachment"
                                      title="Open video attachment"
                                    >
                                      <video
                                        class="employee-chat-message__attachment employee-chat-message__attachment--video"
                                        src="${escapeHtml(imageUrl)}"
                                        muted
                                        playsinline
                                        preload="none"
                                        tabindex="-1"
                                        aria-hidden="true"
                                      ></video>
                                      <span class="employee-chat-message__attachment-play" aria-hidden="true">
                                        <i class="fa-solid fa-play"></i>
                                      </span>
                                    </button>`
                                    : `<button
                                      type="button"
                                      class="employee-chat-message__attachment-button employee-chat-message__attachment-button--image"
                                      data-chat-media-index="${mediaItemIndex}"
                                      aria-label="Open image attachment"
                                      title="Open image attachment"
                                    >
                                      <img
                                        class="employee-chat-message__attachment employee-chat-message__attachment--image"
                                        src="${escapeHtml(imageUrl)}"
                                        alt="Chat attachment"
                                      />
                                    </button>`
                                    : ""
                                }
                              </div>
                              ${
                                shouldShowBubbleTime
                                  ? `<div class="employee-chat-message__bubble-time">${escapeHtml(bubbleTimeLabel)}</div>`
                                  : ""
                              }
                              ${
                                shouldShowMediaDetails
                                  ? `<div class="employee-chat-message__media-details">${escapeHtml(mediaDetailsLabel)}</div>`
                                  : ""
                              }
                            </div>`
                          : `<div class="employee-chat-message__bubble-body${replyMeta ? " has-reply" : ""}${isLongCopyBubble ? " is-long-copy" : ""}${isLongReplyPreview ? " is-long-reply" : ""}${isMediaOnlyBubble ? " has-media-only" : ""}">
                              ${shouldShowEditedInBubble ? '<span class="employee-chat-message__edited-indicator is-bubble">Edited</span>' : ""}
                              ${
                                replyMeta
                                  ? `<div class="employee-chat-message__reply-bubble${isLongReplyPreview ? " is-long-preview" : ""}" data-chat-reply-target-message-id="${escapeHtml(replyMeta.messageId)}" role="button" tabindex="0" title="Jump to replied message" aria-label="Jump to replied message">
                                      <span class="employee-chat-message__reply-preview">${escapeHtml(replyMeta.previewText)}</span>
                                    </div>`
                                  : ""
                              }
                              ${
                                replyMeta
                                  ? `<div class="employee-chat-message__bubble-content-row">
                                      <div class="employee-chat-message__bubble${isDeleted ? " is-deleted" : ""}${isLongCopyBubble ? " is-long-copy" : ""}${isHeartOnly ? " is-heart" : ""}${isEmojiOnly ? " is-emoji" : ""}${hasMedia ? " has-media" : ""}${hasMedia && !messageText ? " has-media-only" : ""}"${messageId ? ` data-chat-message-bubble-id="${escapeHtml(messageId)}"` : ""}>
                                        ${
                                          isDeleted
                                            ? deletedBubbleMarkup
                                            : imageUrl
                                            ? isVideo
                                              ? `<button
                                              type="button"
                                              class="employee-chat-message__attachment-button employee-chat-message__attachment-button--video"
                                              data-chat-media-index="${mediaItemIndex}"
                                              aria-label="Open video attachment"
                                              title="Open video attachment"
                                            >
                                              <video
                                                class="employee-chat-message__attachment employee-chat-message__attachment--video"
                                                src="${escapeHtml(imageUrl)}"
                                                muted
                                                playsinline
                                                preload="none"
                                                tabindex="-1"
                                                aria-hidden="true"
                                              ></video>
                                              <span class="employee-chat-message__attachment-play" aria-hidden="true">
                                                <i class="fa-solid fa-play"></i>
                                              </span>
                                            </button>`
                                            : `<button
                                              type="button"
                                              class="employee-chat-message__attachment-button employee-chat-message__attachment-button--image"
                                              data-chat-media-index="${mediaItemIndex}"
                                              aria-label="Open image attachment"
                                              title="Open image attachment"
                                            >
                                              <img
                                                class="employee-chat-message__attachment employee-chat-message__attachment--image"
                                                src="${escapeHtml(imageUrl)}"
                                                alt="Chat attachment"
                                              />
                                            </button>`
                                            : ""
                                        }
                                        ${
                                          isDeleted
                                            ? ""
                                            : isHeartOnly
                                            ? `<div class="employee-chat-message__heart" role="img" aria-label="Heart">&#10084;&#65039;</div>`
                                            : isEmojiOnly
                                            ? `<p class="employee-chat-message__emoji-text">${escapeHtml(messageText)}</p>`
                                            : messageText
                                            ? `<p>${escapeHtml(messageText)}</p>`
                                            : ""
                                        }
                                      </div>
                                      ${messageActionsMarkup}
                                    </div>`
                                  : `<div class="employee-chat-message__bubble${isDeleted ? " is-deleted" : ""}${isLongCopyBubble ? " is-long-copy" : ""}${isHeartOnly ? " is-heart" : ""}${isEmojiOnly ? " is-emoji" : ""}${hasMedia ? " has-media" : ""}${hasMedia && !messageText ? " has-media-only" : ""}"${messageId ? ` data-chat-message-bubble-id="${escapeHtml(messageId)}"` : ""}>
                                      ${
                                        isDeleted
                                          ? deletedBubbleMarkup
                                          : imageUrl
                                          ? isVideo
                                            ? `<button
                                            type="button"
                                            class="employee-chat-message__attachment-button employee-chat-message__attachment-button--video"
                                            data-chat-media-index="${mediaItemIndex}"
                                            aria-label="Open video attachment"
                                            title="Open video attachment"
                                          >
                                            <video
                                              class="employee-chat-message__attachment employee-chat-message__attachment--video"
                                              src="${escapeHtml(imageUrl)}"
                                              muted
                                              playsinline
                                              preload="none"
                                              tabindex="-1"
                                              aria-hidden="true"
                                            ></video>
                                            <span class="employee-chat-message__attachment-play" aria-hidden="true">
                                              <i class="fa-solid fa-play"></i>
                                            </span>
                                          </button>`
                                          : `<button
                                            type="button"
                                            class="employee-chat-message__attachment-button employee-chat-message__attachment-button--image"
                                            data-chat-media-index="${mediaItemIndex}"
                                            aria-label="Open image attachment"
                                            title="Open image attachment"
                                          >
                                            <img
                                              class="employee-chat-message__attachment employee-chat-message__attachment--image"
                                              src="${escapeHtml(imageUrl)}"
                                              alt="Chat attachment"
                                            />
                                          </button>`
                                          : ""
                                      }
                                      ${
                                        isDeleted
                                          ? ""
                                          : isHeartOnly
                                          ? `<div class="employee-chat-message__heart" role="img" aria-label="Heart">&#10084;&#65039;</div>`
                                          : isEmojiOnly
                                          ? `<p class="employee-chat-message__emoji-text">${escapeHtml(messageText)}</p>`
                                          : messageText
                                          ? `<p>${escapeHtml(messageText)}</p>`
                                          : ""
                                      }
                                    </div>`
                              }
                              ${
                                shouldShowBubbleTime
                                  ? `<div class="employee-chat-message__bubble-time">${escapeHtml(bubbleTimeLabel)}</div>`
                                  : ""
                              }
                              ${
                                shouldShowMediaDetails
                                  ? `<div class="employee-chat-message__media-details">${escapeHtml(mediaDetailsLabel)}</div>`
                                  : ""
                              }
                            </div>`
                      }
                      ${replyMeta ? "" : messageActionsMarkup}
                    </div>
                  </div>
                </div>
                ${
                  shouldShowSentStatus
                    ? `<div class="employee-chat-message__delivery-status">${escapeHtml(sentStatusLabel || "Sent")}</div>`
                    : ""
                }
                ${seenIndicatorMarkup}
              </div>
            </article>
          `;
        })
        .join("");
      messageList.innerHTML = `${messageMarkup}${customerTypingMarkup}`;
      syncSupportLandscapeMediaAlignment();
      state.seenIndicatorMessageIdsByThread[activeThread.threadId] =
        normalizedLatestSeenSupportMessageId;
      state.seenIndicatorReadAtByThread[activeThread.threadId] = normalizedThreadLastReadAt;
      state.seenIndicatorInitializedThreadIds[activeThread.threadId] = true;
    }

    if (isConversationVisible && messageList) {
      if (state.shouldStickToBottom || !wasViewingSameThread || wasNearBottom) {
        scrollConversationToBottom();
      } else {
        messageList.scrollTop = previousScrollTop;
      }
    }

    state.lastConversationSignature = nextConversationSignature;
    state.lastRenderedThreadId = activeThread.threadId;
    state.shouldStickToBottom = false;
    state.lastMessageListScrollTop = messageList ? messageList.scrollTop : 0;
    updateScrollDownButtonVisibility({ immediateHide: false });
    void markThreadSeenBySupport(activeThread);
  }

  function syncSupportLandscapeMediaAlignment() {
    if (!messageList) {
      return;
    }

    const attachmentButtons = messageList.querySelectorAll(
      ".employee-chat-message.is-support .employee-chat-message__attachment-button",
    );

    attachmentButtons.forEach((button) => {
      const media = button.querySelector(".employee-chat-message__attachment");
      if (!media) {
        return;
      }

      const bubble = button.closest(".employee-chat-message__bubble");
      const contentRow = button.closest(".employee-chat-message__content-row");
      const bubbleContentRow = button.closest(".employee-chat-message__bubble-content-row");
      const mainRow = button.closest(".employee-chat-message__main-row");
      const messageElement = button.closest(".employee-chat-message");
      const applyLandscapeState = (width, height) => {
        const isLandscape =
          Number.isFinite(width) &&
          Number.isFinite(height) &&
          Number(width) > Number(height);

        button.classList.toggle("is-landscape", isLandscape);
        if (bubble) {
          bubble.classList.toggle("has-landscape-media", isLandscape);
        }
        if (contentRow) {
          contentRow.classList.toggle("has-landscape-media", isLandscape);
        }
        if (bubbleContentRow) {
          bubbleContentRow.classList.toggle("has-landscape-media", isLandscape);
        }
        if (mainRow) {
          mainRow.classList.toggle("has-landscape-media", isLandscape);
        }
        if (messageElement) {
          messageElement.classList.toggle("has-landscape-media", isLandscape);
        }
      };

      if (media instanceof HTMLImageElement) {
        if (media.complete && media.naturalWidth && media.naturalHeight) {
          applyLandscapeState(media.naturalWidth, media.naturalHeight);
          return;
        }

        media.addEventListener(
          "load",
          () => applyLandscapeState(media.naturalWidth, media.naturalHeight),
          { once: true },
        );
        return;
      }

      if (media instanceof HTMLVideoElement) {
        button.classList.add("is-video-stable");
        applyLandscapeState(0, 0);
        return;
      }
    });
  }

  function render() {
    if (!state.activeThreadId && state.threads.length) {
      state.activeThreadId = state.threads[0].threadId;
    }

    renderLiveChatNavBadge();
    renderThreadList();
    renderConversation();
    renderReplyState();
    renderLiveChatStockProducts();
  }

  async function loadThreads() {
    if (state.isLoadingThreads) {
      state.pendingThreadReload = true;
      return;
    }

    state.isLoadingThreads = true;
    try {
      const response = await fetch("/api/chat-support", {
        headers: withEmployeeDashboardAdminHeaders({
          Accept: "application/json",
        }),
      });
      const data = await response.json();
      const nextThreads = Array.isArray(data.threads) ? data.threads : [];
      state.threads = nextThreads;
      applyInitialLiveChatTarget();

      if (
        state.activeThreadId &&
        !nextThreads.some((thread) => thread.threadId === state.activeThreadId)
      ) {
        state.activeThreadId = "";
      }

      render();
    } catch (error) {
      if (!state.threads.length && threadList) {
        threadList.innerHTML = `
          <div class="employee-chat-placeholder">
            <strong>Unable to load conversations</strong>
            <p>Check if the backend is running, then refresh this page.</p>
          </div>
        `;
      }
    } finally {
      state.isLoadingThreads = false;
      if (state.pendingThreadReload) {
        state.pendingThreadReload = false;
        void loadThreads();
      }
    }
  }

  async function loadOrders() {
    if (state.isLoadingOrders) {
      return;
    }

    state.isLoadingOrders = true;
    state.ordersLoadError = false;
    try {
      const response = await fetch("/api/orders", {
        headers: {
          Accept: "application/json",
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Unable to load orders.");
      }

      state.orders = Array.isArray(data?.orders) ? data.orders : [];
      state.hasLoadedOrders = true;
    } catch (error) {
      state.ordersLoadError = true;
      if (!state.hasLoadedOrders) {
        state.orders = [];
      }
    } finally {
      state.isLoadingOrders = false;
      const activeThread = getThreadById(state.activeThreadId);
      renderProfilePanel(activeThread);
      renderHistoryPanel(activeThread);
    }
  }

  async function sendReply(event) {
    event.preventDefault();

    if (isAdminLiveChatReadOnly) {
      return;
    }

    const activeThread = getThreadById(state.activeThreadId);
    const replyText = String(input?.value || "").replace(/\s+/g, " ").trim();
    const pendingMedia = [...state.pendingMedia];
    const pendingEdit = getActivePendingEdit();
    const hasPendingMedia = pendingMedia.length > 0;
    const replyPayload = buildReplyPayload();

    if (!activeThread || (!replyText && !hasPendingMedia) || state.isSending) {
      return;
    }

    stopSupportTyping({ threadId: activeThread.threadId });

    if (pendingEdit) {
      setComposerBusy(true, "Saving...");
      try {
        const data = await updateSupportMessage(activeThread.threadId, pendingEdit.messageId, {
          text: replyText,
        });
        await finalizeSuccessfulReply(activeThread, data, {
          clearInput: true,
          clearPendingEdit: true,
          stickToBottom: false,
        });
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "Unable to update message.");
      } finally {
        setComposerBusy(false);
      }
      return;
    }

    setComposerBusy(true, hasPendingMedia ? "Uploading..." : "Sending...");
    try {
      let lastReplyData = null;

      if (!hasPendingMedia) {
        lastReplyData = await postSupportReply(activeThread.threadId, {
          text: replyText,
          replyTo: replyPayload,
        });
      } else {
        for (let index = 0; index < pendingMedia.length; index += 1) {
          const mediaItem = pendingMedia[index];
          updateSendButtonState(`Uploading ${index + 1}/${pendingMedia.length}`);

          const uploadedMedia = await uploadMediaFile(mediaItem.file);
          if (!uploadedMedia.imageUrl) {
            throw new Error("Uploaded media URL is missing.");
          }

          updateSendButtonState(`Sending ${index + 1}/${pendingMedia.length}`);

          lastReplyData = await postSupportReply(activeThread.threadId, {
            text: index === 0 ? replyText : "",
            imageUrl: uploadedMedia.imageUrl,
            imageName: uploadedMedia.imageName,
            replyTo: index === 0 ? replyPayload : null,
          });
        }
      }

      if (lastReplyData) {
        await finalizeSuccessfulReply(activeThread, lastReplyData, {
          clearInput: true,
          clearPendingMedia: true,
          clearPendingReply: true,
        });
      }
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : hasPendingMedia
            ? "Unable to send media."
            : "Unable to send reply.",
      );
    } finally {
      setComposerBusy(false);
    }
  }

  function handleSendButtonClick(event) {
    event.preventDefault();

    if (state.isSending || isAdminLiveChatReadOnly) {
      return;
    }

    if (typeof form?.requestSubmit === "function") {
      form.requestSubmit();
      return;
    }

    void sendReply({ preventDefault() {} });
  }

  function handleMediaSelection(event) {
    if (isAdminLiveChatReadOnly) {
      if (mediaInput) {
        mediaInput.value = "";
      }
      return;
    }

    appendSelectedMediaFiles(event?.target?.files);
    if (mediaInput) {
      mediaInput.value = "";
    }
  }

  function handleMessageListScroll() {
    if (!messageList) {
      return;
    }

    const currentScrollTop = messageList.scrollTop;
    const previousScrollTop = Number(state.lastMessageListScrollTop) || 0;
    const isScrollingUp = currentScrollTop < previousScrollTop;
    const isScrollingDown = currentScrollTop > previousScrollTop;
    state.lastMessageListScrollTop = currentScrollTop;

    if (isScrollingUp && !isMessageListNearBottom()) {
      updateScrollDownButtonVisibility({ animateShow: true });
      return;
    }

    if (isScrollingDown && isMessageListNearBottom()) {
      hideScrollDownButton({ immediate: false });
      return;
    }

    updateScrollDownButtonVisibility({ immediateHide: false });
  }

  function handleMediaButtonClick() {
    if (isAdminLiveChatReadOnly) {
      return;
    }

    if (state.isSending) {
      return;
    }

    if (!state.activeThreadId) {
      window.alert("Select a conversation before sending a photo or video.");
      return;
    }

    if (getActivePendingEdit()) {
      window.alert("Finish editing or cancel the edit before adding media.");
      return;
    }

    openMediaPickerFallback();
  }

  async function handleHeartButtonClick() {
    if (isAdminLiveChatReadOnly) {
      return;
    }

    const activeThread = getThreadById(state.activeThreadId);
    if (!activeThread || state.isSending) {
      return;
    }

    if (getActivePendingEdit()) {
      window.alert("Finish editing or cancel the edit before sending a heart.");
      return;
    }

    const replyPayload = buildReplyPayload();
    stopSupportTyping({ threadId: activeThread.threadId });
    setComposerBusy(true, "Sending...");
    try {
      const data = await postSupportReply(activeThread.threadId, {
        text: "\u2764\uFE0F",
        replyTo: replyPayload,
      });
      await finalizeSuccessfulReply(activeThread, data, {
        clearPendingReply: true,
      });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to send heart.");
    } finally {
      setComposerBusy(false);
    }
  }

  function handlePendingMediaPreviewClick(event) {
    if (!(event.target instanceof Element) || state.isSending) {
      return;
    }

    const removeButton = event.target.closest("[data-remove-pending-media]");
    if (removeButton) {
      removePendingMediaById(removeButton.getAttribute("data-remove-pending-media") || "");
      return;
    }

    const addButton = event.target.closest("[data-employee-chat-add-media]");
    if (addButton) {
      handleMediaButtonClick();
    }
  }

  function handleReplyStateClick(event) {
    if (!(event.target instanceof Element)) {
      return;
    }

    const clearEditButton = event.target.closest("[data-clear-employee-chat-edit]");
    if (clearEditButton) {
      clearPendingEdit();
      return;
    }

    const clearButton = event.target.closest("[data-clear-employee-chat-reply]");
    if (clearButton) {
      clearPendingReply();
    }
  }

  function handlePinnedProductSlotClick(event) {
    if (!(event.target instanceof Element)) {
      return;
    }

    const toggleTarget = event.target.closest(
      "[data-employee-chat-pinned-product-toggle], [data-employee-chat-pinned-product-card]",
    );
    if (!toggleTarget) {
      return;
    }

    togglePinnedProductDropdown();
  }

  function handlePinnedProductSlotKeydown(event) {
    if (!(event.target instanceof Element)) {
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const toggleTarget = event.target.closest(
      "[data-employee-chat-pinned-product-toggle], [data-employee-chat-pinned-product-card]",
    );
    if (!toggleTarget) {
      return;
    }

    event.preventDefault();
    togglePinnedProductDropdown();
  }

  function handleMessageListClick(event) {
    if (!(event.target instanceof Element)) {
      return;
    }

    const replyPreviewTrigger = event.target.closest("[data-chat-reply-target-message-id]");
    if (replyPreviewTrigger) {
      jumpToRepliedMessage(
        replyPreviewTrigger.getAttribute("data-chat-reply-target-message-id") || "",
      );
      return;
    }

    if (state.isSending) {
      return;
    }

    const menuToggleButton = event.target.closest("[data-employee-chat-action-menu-toggle]");
    if (menuToggleButton) {
      toggleMessageActionMenu(menuToggleButton);
      return;
    }

    const mediaTrigger = event.target.closest("[data-chat-media-index]");
    if (mediaTrigger) {
      openChatMediaModal({
        startIndex: Number.parseInt(
          mediaTrigger.getAttribute("data-chat-media-index") || "",
          10,
        ),
      });
      return;
    }

    const bubbleTrigger = event.target.closest("[data-chat-message-bubble-id]");
    if (bubbleTrigger) {
      toggleMessageBubbleTime(
        bubbleTrigger.getAttribute("data-chat-message-bubble-id") || "",
      );
      return;
    }

    const detailsButton = event.target.closest("[data-employee-chat-details-index]");
    if (detailsButton) {
      const activeThread = getThreadById(state.activeThreadId);
      if (!activeThread) {
        return;
      }

      const detailsIndex = Number.parseInt(
        detailsButton.getAttribute("data-employee-chat-details-index") || "",
        10,
      );
      if (!Number.isInteger(detailsIndex)) {
        return;
      }

      const message = Array.isArray(activeThread.messages)
        ? activeThread.messages[detailsIndex]
        : null;
      if (!message) {
        return;
      }

      toggleMediaMessageDetails(message);
      return;
    }

    const editButton = event.target.closest("[data-employee-chat-edit-index]");
    if (editButton) {
      const activeThread = getThreadById(state.activeThreadId);
      if (!activeThread) {
        return;
      }

      const editIndex = Number.parseInt(
        editButton.getAttribute("data-employee-chat-edit-index") || "",
        10,
      );
      if (!Number.isInteger(editIndex)) {
        return;
      }

      const message = Array.isArray(activeThread.messages)
        ? activeThread.messages[editIndex]
        : null;
      if (!message) {
        return;
      }

      setPendingEdit(activeThread, message);
      return;
    }

    const deleteButton = event.target.closest("[data-employee-chat-delete-index]");
    if (deleteButton) {
      const activeThread = getThreadById(state.activeThreadId);
      if (!activeThread) {
        return;
      }

      const deleteIndex = Number.parseInt(
        deleteButton.getAttribute("data-employee-chat-delete-index") || "",
        10,
      );
      if (!Number.isInteger(deleteIndex)) {
        return;
      }

      const message = Array.isArray(activeThread.messages)
        ? activeThread.messages[deleteIndex]
        : null;
      if (!message) {
        return;
      }

      void handleMessageRemoveAction(activeThread, message, deleteButton);
      return;
    }

    const translateButton = event.target.closest("[data-employee-chat-translate-index]");
    if (translateButton) {
      const activeThread = getThreadById(state.activeThreadId);
      if (!activeThread) {
        return;
      }

      const translateIndex = Number.parseInt(
        translateButton.getAttribute("data-employee-chat-translate-index") || "",
        10,
      );
      if (!Number.isInteger(translateIndex)) {
        return;
      }

      const message = Array.isArray(activeThread.messages)
        ? activeThread.messages[translateIndex]
        : null;
      if (message) {
        openChatMessageTranslate(message);
      }
      return;
    }

    const replyButton = event.target.closest("[data-employee-chat-reply-index]");
    if (!replyButton) {
      return;
    }

    const activeThread = getThreadById(state.activeThreadId);
    if (!activeThread) {
      return;
    }

    const replyIndex = Number.parseInt(
      replyButton.getAttribute("data-employee-chat-reply-index") || "",
      10,
    );
    if (!Number.isInteger(replyIndex)) {
      return;
    }

    const message = Array.isArray(activeThread.messages)
      ? activeThread.messages[replyIndex]
      : null;
    if (!message) {
      return;
    }

    setPendingReply(activeThread, message);
  }

  function handleMessageListKeydown(event) {
    if (!(event.target instanceof Element)) {
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const replyPreviewTrigger = event.target.closest("[data-chat-reply-target-message-id]");
    if (!replyPreviewTrigger) {
      return;
    }

    event.preventDefault();
    jumpToRepliedMessage(
      replyPreviewTrigger.getAttribute("data-chat-reply-target-message-id") || "",
    );
  }

  function handleChatMediaModalClick(event) {
    if (!(event.target instanceof Element) || !chatMediaModal || chatMediaModal.hidden) {
      return;
    }

    const closeTrigger = event.target.closest("[data-chat-media-modal-close]");
    const clickedBackdrop =
      event.target === chatMediaModal || event.target === chatMediaModalAmbient;
    if (closeTrigger || clickedBackdrop) {
      closeChatMediaModal();
    }
  }

  function handleDeleteModalOverlayClick(event) {
    if (
      !(event.target instanceof Element) ||
      !deleteModalOverlay ||
      deleteModalOverlay.hidden ||
      state.isSending
    ) {
      return;
    }

    if (event.target === deleteModalOverlay) {
      closeDeleteModal();
    }
  }

  function handleChatMediaThumbClick(event) {
    if (!(event.target instanceof Element)) {
      return;
    }

    const thumbButton = event.target.closest("[data-chat-media-thumb-index]");
    if (!thumbButton) {
      return;
    }

    setActiveChatMediaIndex(
      Number.parseInt(thumbButton.getAttribute("data-chat-media-thumb-index") || "", 10),
    );
  }

  function handleChatMediaNavClick(event) {
    if (!(event.target instanceof Element)) {
      return;
    }

    const navButton = event.target.closest("[data-chat-media-nav]");
    if (!navButton) {
      return;
    }

    const direction = navButton.getAttribute("data-chat-media-nav");
    const offset = direction === "prev" ? -1 : 1;
    setActiveChatMediaIndex((state.activeChatMediaIndex >= 0 ? state.activeChatMediaIndex : 0) + offset);
  }

  function handleLiveChatSidePanelClick(event) {
    if (!(event.target instanceof Element)) {
      return;
    }

    const mediaButton = event.target.closest("[data-live-chat-side-media-index]");
    if (mediaButton) {
      openChatMediaModal({
        startIndex: Number.parseInt(
          mediaButton.getAttribute("data-live-chat-side-media-index") || "",
          10,
        ),
      });
      return;
    }

    const tabButton = event.target.closest("[data-live-chat-side-tab]");
    if (!tabButton) {
      return;
    }

    const targetTab = String(tabButton.getAttribute("data-live-chat-side-tab") || "").trim();
    if (targetTab === "search") {
      searchInput?.focus();
      return;
    }

    if (["media", "profile", "history"].includes(targetTab)) {
      setActiveConversationTab(targetTab);
    }
  }

  form?.addEventListener("submit", sendReply);
  input?.addEventListener("input", handleComposerInput);
  input?.addEventListener("blur", () => {
    stopSupportTyping();
  });
  searchInput?.addEventListener("input", (event) => {
    window.clearTimeout(chatSearchTimer);
    chatSearchTimer = window.setTimeout(() => {
      state.searchQuery = String(event?.target?.value || "");
      state.lastThreadListSignature = "";
      renderThreadList();
    }, 500);
  });
  liveChatProfilePanel?.addEventListener("click", handleLiveChatSidePanelClick);
  liveChatStockSearchInput?.addEventListener("input", (event) => {
    window.clearTimeout(liveChatStockSearchTimer);
    liveChatStockSearchTimer = window.setTimeout(() => {
      state.stockSearchQuery = String(event?.target?.value || "");
      renderLiveChatStockProducts();
    }, 500);
  });
  threadList?.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const button = event.target.closest("[data-thread-id]");
    if (!button) {
      return;
    }

    setActiveThread(button.getAttribute("data-thread-id") || "");
  });
  conversationTabButtons.forEach((button, index) => {
    button.addEventListener("click", () => {
      setActiveConversationTab(button.dataset.employeeChatTab || "conversation");
    });

    button.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
        return;
      }

      event.preventDefault();
      const offset = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex =
        (index + offset + conversationTabButtons.length) %
        conversationTabButtons.length;
      const nextButton = conversationTabButtons[nextIndex];
      if (!nextButton) {
        return;
      }

      setActiveConversationTab(nextButton.dataset.employeeChatTab || "conversation");
      nextButton.focus();
    });
  });
  mediaButton?.addEventListener("click", handleMediaButtonClick);
  composePlusButton?.addEventListener("click", handleMediaButtonClick);
  mediaInput?.addEventListener("change", handleMediaSelection);
  sendButton?.addEventListener("click", handleSendButtonClick);
  mediaPreview?.addEventListener("click", handlePendingMediaPreviewClick);
  replyState?.addEventListener("click", handleReplyStateClick);
  pinnedProductSlot?.addEventListener("click", handlePinnedProductSlotClick);
  pinnedProductSlot?.addEventListener("keydown", handlePinnedProductSlotKeydown);
  scrollDownButton?.addEventListener("click", () => {
    state.shouldStickToBottom = true;
    scrollConversationToBottom({ behavior: "smooth" });
  });
  messageList?.addEventListener("scroll", handleMessageListScroll, { passive: true });
  messageList?.addEventListener("click", handleMessageListClick);
  messageList?.addEventListener("keydown", handleMessageListKeydown);
  chatMediaModal?.addEventListener("click", handleChatMediaModalClick);
  chatMediaModalThumbs?.addEventListener("click", handleChatMediaThumbClick);
  chatMediaModalPrev?.addEventListener("click", handleChatMediaNavClick);
  chatMediaModalNext?.addEventListener("click", handleChatMediaNavClick);
  chatMediaZoomRange?.addEventListener("input", (event) => {
    setChatMediaZoom(event?.target?.value || 100);
  });
  chatMediaZoomOut?.addEventListener("click", () => {
    setChatMediaZoom((state.activeChatMediaZoom || 100) - 20);
  });
  chatMediaZoomIn?.addEventListener("click", () => {
    setChatMediaZoom((state.activeChatMediaZoom || 100) + 20);
  });
  chatMediaModalClose?.addEventListener("click", closeChatMediaModal);
  deleteModalClose?.addEventListener("click", () => {
    if (!state.isSending) {
      closeDeleteModal();
    }
  });
  deleteModalCancel?.addEventListener("click", () => {
    if (!state.isSending) {
      closeDeleteModal();
    }
  });
  deleteModalConfirm?.addEventListener("click", () => {
    void confirmDeleteModalAction();
  });
  deleteModalOverlay?.addEventListener("click", handleDeleteModalOverlayClick);
  liveChatMenuToggle?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeLiveChatNotificationMenu();
    closeConversationMenu();
    closeMessageActionMenus();
    toggleLiveChatNavMenu();
  });
  liveChatNotificationToggle?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeMessageActionMenus();
    toggleLiveChatNotificationMenu();
  });
  liveChatNotificationDropdown?.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  conversationMenuToggle?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeMessageActionMenus();
    toggleConversationMenu();
  });
  conversationMenuDropdown?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!(event.target instanceof Element)) {
      return;
    }

    const actionTrigger = event.target.closest("[data-employee-chat-menu-action]");
    if (!(actionTrigger instanceof HTMLElement)) {
      return;
    }

    closeConversationMenu();
    handleConversationMenuAction(actionTrigger.dataset.employeeChatMenuAction || "");
  });
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      closeLiveChatNotificationMenu();
      closeConversationMenu();
      closeMessageActionMenus();
      return;
    }

    if (!liveChatNotificationMenu?.contains(event.target)) {
      closeLiveChatNotificationMenu();
    }
    if (
      document.body?.classList.contains("live-chat-nav-open") &&
      !event.target.closest(".dashboard-sidebar") &&
      !event.target.closest("[data-live-chat-menu-toggle]")
    ) {
      closeLiveChatNavMenu();
    }
    if (!conversationMenu?.contains(event.target)) {
      closeConversationMenu();
    }
    if (!event.target.closest("[data-employee-chat-action-menu]")) {
      closeMessageActionMenus();
    }
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (liveChatNotificationToggle?.getAttribute("aria-expanded") === "true") {
        closeLiveChatNotificationMenu();
      }
      if (conversationMenuToggle?.getAttribute("aria-expanded") === "true") {
        closeConversationMenu();
      }
      if (document.body?.classList.contains("live-chat-nav-open")) {
        closeLiveChatNavMenu();
      }
      closeMessageActionMenus();
      if (deleteModalOverlay && !deleteModalOverlay.hidden) {
        if (!state.isSending) {
          closeDeleteModal();
        }
        return;
      }
      if (!chatMediaModal || chatMediaModal.hidden) {
        return;
      }
    }

    if (deleteModalOverlay && !deleteModalOverlay.hidden) {
      return;
    }

    if (!chatMediaModal || chatMediaModal.hidden) {
      return;
    }

    if (event.key === "Escape") {
      closeChatMediaModal();
      return;
    }

    if (event.key === "ArrowLeft") {
      setActiveChatMediaIndex((state.activeChatMediaIndex >= 0 ? state.activeChatMediaIndex : 0) - 1);
      return;
    }

    if (event.key === "ArrowRight") {
      setActiveChatMediaIndex((state.activeChatMediaIndex >= 0 ? state.activeChatMediaIndex : 0) + 1);
    }
  });
  window.addEventListener("beforeunload", () => {
    stopSupportTyping();
  });
  heartButton?.addEventListener("click", handleHeartButtonClick);
  renderPendingMediaPreview();
  renderReplyState();
  resizeComposerInput();
  updateSendButtonState();
  setActiveConversationTab(state.activeConversationTab);
  loadThreads();
  loadOrders();
  if (liveChatStockList) {
    loadLiveChatStockProducts();
    window.setInterval(loadLiveChatStockProducts, STOCK_REFRESH_INTERVAL_MS);
  }
  window.setInterval(loadThreads, CHAT_REFRESH_INTERVAL_MS);
  window.setInterval(loadOrders, ORDERS_REFRESH_INTERVAL_MS);
})();

(function () {
  const CANCEL_REFRESH_INTERVAL_MS = 2500;
  const list = document.querySelector("[data-employee-cancel-list]");
  const count = document.querySelector("[data-employee-cancel-count]");

  if (!list) {
    return;
  }

  const state = {
    groups: [],
    processingIds: new Set(),
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatTimestamp(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function normalizeEntry(entry) {
    return {
      id: String(entry?.id || "").trim(),
      createdAtEpochMs: Number(entry?.createdAtEpochMs || 0) || 0,
      productName: String(entry?.productName || "").trim(),
      quantity: Number(entry?.quantity || 0) || 0,
      stage: String(entry?.stage || entry?.status || "").trim(),
      paymentOptionLabel: String(
        entry?.paymentOptionLabel || entry?.payment || entry?.paymentMethod || "",
      ).trim(),
      clientName: String(
        entry?.clientName || entry?.customerName || entry?.customer || "",
      ).trim(),
      clientContactNumber: String(
        entry?.clientContactNumber || entry?.contactNumber || "",
      ).trim(),
      clientAddress: String(entry?.clientAddress || entry?.address || "").trim(),
      cancelRequestStatus: String(entry?.cancelRequestStatus || "").trim().toLowerCase(),
      cancelRequestReason: String(entry?.cancelRequestReason || "").trim(),
      cancelRequestSubmittedAtEpochMs:
        Number(entry?.cancelRequestSubmittedAtEpochMs || 0) || 0,
    };
  }

  function groupPendingCancelRequests(entries) {
    const groupsByCreatedAt = new Map();

    entries.map(normalizeEntry).forEach((entry) => {
      if (
        !entry.createdAtEpochMs ||
        entry.stage !== "toPrepare" ||
        entry.cancelRequestStatus !== "pending"
      ) {
        return;
      }

      const groupKey = String(entry.createdAtEpochMs);
      if (!groupsByCreatedAt.has(groupKey)) {
        groupsByCreatedAt.set(groupKey, {
          createdAtEpochMs: entry.createdAtEpochMs,
          clientName: entry.clientName,
          clientContactNumber: entry.clientContactNumber,
          clientAddress: entry.clientAddress,
          paymentOptionLabel: entry.paymentOptionLabel,
          cancelRequestReason: entry.cancelRequestReason,
          cancelRequestSubmittedAtEpochMs: entry.cancelRequestSubmittedAtEpochMs,
          entries: [],
        });
      }

      groupsByCreatedAt.get(groupKey).entries.push(entry);
    });

    return [...groupsByCreatedAt.values()].sort(
      (left, right) => right.createdAtEpochMs - left.createdAtEpochMs,
    );
  }

  function formatItemSummary(entries) {
    const totalQuantity = entries.reduce(
      (sum, entry) => sum + Math.max(Number(entry.quantity || 0), 0),
      0,
    );
    const baseLabel =
      totalQuantity === 1 ? "1 item" : `${totalQuantity.toLocaleString("en-US")} items`;
    if (!entries.length) {
      return baseLabel;
    }
    if (entries.length === 1) {
      return `${entries[0].productName || "Unnamed Product"} - ${baseLabel}`;
    }
    return `${entries[0].productName || "Unnamed Product"} +${entries.length - 1} more - ${baseLabel}`;
  }

  function render() {
    if (count) {
      const label = state.groups.length === 1 ? "request" : "requests";
      count.textContent = `${state.groups.length} ${label}`;
    }

    if (!state.groups.length) {
      list.innerHTML = `
        <div class="employee-chat-placeholder">
          <strong>No pending requests</strong>
          <p>Cancellation requests from the app will appear here for review.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = state.groups
      .map((group) => {
        const groupKey = String(group.createdAtEpochMs);
        const isProcessing = state.processingIds.has(groupKey);
        const customerLine = [group.clientName, group.clientContactNumber]
          .filter(Boolean)
          .join(" | ");
        const submittedAt = formatTimestamp(
          group.cancelRequestSubmittedAtEpochMs || group.createdAtEpochMs,
        );
        const initial =
          (group.clientName || group.entries[0]?.productName || "?")
            .trim()
            .charAt(0)
            .toUpperCase() || "?";

        return `
          <article class="employee-cancel-card">
            <div class="employee-cancel-card__header">
              <div class="employee-chat-thread-item__avatar employee-cancel-card__avatar">${escapeHtml(initial)}</div>
              <div class="employee-cancel-card__copy">
                <div class="employee-cancel-card__title-row">
                  <strong>${escapeHtml(customerLine || "App User")}</strong>
                  <span>${escapeHtml(submittedAt || "")}</span>
                </div>
                <p>${escapeHtml(group.clientAddress || "No address provided")}</p>
              </div>
            </div>

            <div class="employee-cancel-card__meta">
              <span class="count-pill">${escapeHtml(group.paymentOptionLabel || "Payment pending")}</span>
              <span class="employee-cancel-card__items">${escapeHtml(formatItemSummary(group.entries))}</span>
            </div>

            <div class="employee-cancel-card__reason">
              <p class="section-label">Cancel Reason</p>
              <strong>${escapeHtml(group.cancelRequestReason || "No reason provided")}</strong>
            </div>

            <div class="employee-cancel-card__actions">
              <button
                type="button"
                class="dashboard-link-button dashboard-link-button--ghost employee-cancel-action"
                data-created-at="${escapeHtml(groupKey)}"
                data-cancel-action="reject"
                ${isProcessing ? "disabled" : ""}
              >
                ${isProcessing ? "Processing..." : "Keep Order"}
              </button>
              <button
                type="button"
                class="dashboard-link-button employee-cancel-action"
                data-created-at="${escapeHtml(groupKey)}"
                data-cancel-action="accept"
                ${isProcessing ? "disabled" : ""}
              >
                ${isProcessing ? "Processing..." : "Accept Cancel"}
              </button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  async function loadCancelRequests() {
    try {
      const response = await fetch("/api/orders", {
        headers: {
          Accept: "application/json",
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to load orders.");
      }

      state.groups = groupPendingCancelRequests(
        Array.isArray(data.orders) ? data.orders : [],
      );
      render();
    } catch (error) {
      if (!state.groups.length) {
        list.innerHTML = `
          <div class="employee-chat-placeholder">
            <strong>Unable to load cancel requests</strong>
            <p>Check if the backend is running, then refresh this page.</p>
          </div>
        `;
      }
    }
  }

  async function handleDecision(createdAtEpochMs, action) {
    const normalizedId = String(createdAtEpochMs || "").trim();
    const normalizedAction = String(action || "").trim().toLowerCase();
    if (
      !normalizedId ||
      (normalizedAction !== "accept" && normalizedAction !== "reject") ||
      state.processingIds.has(normalizedId)
    ) {
      return;
    }

    state.processingIds.add(normalizedId);
    render();

    try {
      const response = await fetch(
        `/api/orders/${encodeURIComponent(normalizedId)}/cancel-request/${encodeURIComponent(normalizedAction)}`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to process cancel request.");
      }

      await loadCancelRequests();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to process cancel request.",
      );
    } finally {
      state.processingIds.delete(normalizedId);
      render();
    }
  }

  list.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const button = event.target.closest("[data-cancel-action]");
    if (!button) {
      return;
    }

    void handleDecision(
      button.getAttribute("data-created-at"),
      button.getAttribute("data-cancel-action"),
    );
  });

  loadCancelRequests();
  window.setInterval(loadCancelRequests, CANCEL_REFRESH_INTERVAL_MS);
})();
