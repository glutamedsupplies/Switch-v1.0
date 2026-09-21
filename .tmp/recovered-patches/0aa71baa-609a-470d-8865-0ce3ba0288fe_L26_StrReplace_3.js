async function persistSuperAdminNotification(notification) {
  if (!notification) {
    return null;
  }
  const notifications = await readSuperAdminNotifications();
  await writeSuperAdminNotifications(appendPersistentNotifications(notifications, notification));
  return notification;
}

async function readPlatformFeedback() {
  await ensureStoragePaths();
  try {
    const raw = await fsPromises.readFile(PLATFORM_FEEDBACK_FILE, "utf8");
    const decoded = JSON.parse(raw);
    return Array.isArray(decoded) ? decoded : [];
  } catch (error) {
    return [];
  }
}

async function writePlatformFeedback(entries) {
  await writeJsonFileAtomically(
    PLATFORM_FEEDBACK_FILE,
    Array.isArray(entries) ? entries.slice(0, MAX_PLATFORM_FEEDBACK_ENTRIES) : [],
  );
}

function normalizePlatformFeedbackType(value) {
  const type = String(value ?? "").trim().toLowerCase();
  if (type === "seller" || type === "seller-feedback") {
    return "seller";
  }
  if (type === "user" || type === "buyer" || type === "user-feedback" || type === "app") {
    return "user";
  }
  return "";
}

function normalizePlatformFeedbackRating(value) {
  const rating = Number(value);
  if (!Number.isFinite(rating)) {
    return 0;
  }
  return Math.min(5, Math.max(1, Math.round(rating)));
}

function normalizePlatformFeedbackMessage(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_PLATFORM_FEEDBACK_MESSAGE_LENGTH);
}

function normalizePlatformFeedbackStatus(value) {
  const status = String(value ?? "").trim().toLowerCase();
  if (status === "resolved" || status === "closed") {
    return "resolved";
  }
  if (status === "in-review" || status === "review") {
    return "in-review";
  }
  return "open";
}

function getPlatformFeedbackSubmitterName(account, fallback = "") {
  return String(
    account?.companyName
      ?? account?.storeName
      ?? account?.businessName
      ?? account?.displayName
      ?? account?.fullName
      ?? [account?.firstName, account?.lastName].filter(Boolean).join(" ")
      ?? account?.name
      ?? account?.email
      ?? fallback,
  ).replace(/\s+/g, " ").trim().slice(0, 160);
}

async function requireSellerFeedbackSession(request, response) {
  const session = verifyAdminApiSessionToken(
    request.headers["x-gms-admin-session"],
  );
  const headerAdminId = normalizeAdminTenantId(
    request.headers["x-gms-admin-id"] ?? request.headers["x-admin-id"],
    "",
  );
  const adminId = normalizeAdminTenantId(session?.adminId || headerAdminId, "");
  if (!session || !adminId || session.adminId !== adminId || session.role !== "admin") {
    sendJson(response, 401, {
      message: "A valid seller admin session is required to send feedback.",
    });
    return null;
  }

  const accounts = await readAccounts();
  const account = findAdminAccountByScopeId(accounts, adminId);
  if (!account) {
    sendJson(response, 401, {
      message: "Your seller account could not be verified. Please sign in again.",
    });
    return null;
  }

  return { session, account, adminId };
}