const http = require("http");
const os = require("os");
const path = require("path");
const fs = require("fs");
const fsPromises = require("fs/promises");
let sharp = null;

try {
  sharp = require("sharp");
} catch (_) {
  sharp = null;
}

function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return;
    }

    const raw = fs.readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmedLine.indexOf("=");
      if (separatorIndex <= 0) {
        continue;
      }

      const key = trimmedLine.slice(0, separatorIndex).trim();
      if (!key || process.env[key] != null) {
        continue;
      }

      let value = trimmedLine.slice(separatorIndex + 1).trim();
      if (
        value.length >= 2 &&
        ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'")))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  } catch (error) {
    console.error(`Unable to load env file: ${filePath}`, error);
  }
}

loadEnvFile(path.join(__dirname, ".env"));
loadEnvFile(path.join(path.dirname(__dirname), ".env"));

const PORT = Number(process.env.PORT) || 8080;
const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const DATA_DIR = path.join(ROOT_DIR, "data");
const UPLOADS_DIR = path.join(PUBLIC_DIR, "uploads");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const ACTIVITY_FILE = path.join(DATA_DIR, "activity_log.json");
const ACCOUNTS_FILE = path.join(DATA_DIR, "accounts.json");
const CATEGORIES_FILE = path.join(DATA_DIR, "categories.json");
const STORE_TYPES_FILE = path.join(DATA_DIR, "store_types.json");
const CHAT_THREADS_FILE = path.join(DATA_DIR, "chat_threads.json");
const DELIVERY_PARTNERS_FILE = path.join(DATA_DIR, "delivery_partners.json");
const PAYMENT_PARTNERS_FILE = path.join(DATA_DIR, "payment_partners.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const FOLLOWERS_FILE = path.join(DATA_DIR, "followers.json");
const FACE_ATTENDANCE_EMPLOYEES_FILE = String(
  process.env.FACE_ATTENDANCE_EMPLOYEES_FILE || "",
).trim() || path.join(
  path.dirname(path.dirname(ROOT_DIR)),
  "face_attendance_lh",
  "data",
  "employees.json",
);
const FACE_ATTENDANCE_FACES_DIR = String(
  process.env.FACE_ATTENDANCE_FACES_DIR || "",
).trim() || path.join(path.dirname(FACE_ATTENDANCE_EMPLOYEES_FILE), "faces");
const FACE_ATTENDANCE_ATTENDANCE_FILE = String(
  process.env.FACE_ATTENDANCE_ATTENDANCE_FILE || "",
).trim() || path.join(path.dirname(FACE_ATTENDANCE_EMPLOYEES_FILE), "attendance.csv");
const MAX_JSON_BODY_BYTES = 1_000_000;
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const MAX_UPLOAD_SIZE_LABEL = `${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB`;
const MAX_REVIEW_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_REVIEW_VIDEO_SIZE_LABEL = `${Math.round(MAX_REVIEW_VIDEO_BYTES / (1024 * 1024))} MB`;
const MAX_ACTIVITY_ENTRIES = 50;
const CHAT_AI_API_KEY = String(
  process.env.CHAT_AI_API_KEY ?? process.env.OPENAI_API_KEY ?? "",
).trim();
const CHAT_AI_MODEL = String(
  process.env.CHAT_AI_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini",
).trim() || "gpt-4o-mini";
const CHAT_AI_API_URL = String(
  process.env.CHAT_AI_API_URL ?? "https://api.openai.com/v1/chat/completions",
).trim();
const CHAT_AI_TIMEOUT_MS = 20_000;
const CHAT_TYPING_ACTIVE_WINDOW_MS = 5_000;
const CHAT_ONLINE_ACTIVE_WINDOW_MS = 45_000;
const UPLOAD_IMAGE_WEBP_QUALITY = 82;
const UPLOAD_IMAGE_WEBP_EFFORT = 4;
const PRODUCT_MODEL_FRAME_ORDER = Object.freeze([
  "front",
  "right",
  "back",
  "left",
  "top",
  "bottom",
]);
const PRODUCT_MODEL_TEXTURE_MAX_SIZE = 1400;
const VISUAL_SEARCH_VECTOR_SIZE = 32;
const VISUAL_SEARCH_MIN_SCORE = 0.82;
const VISUAL_SEARCH_MAX_RESULTS = 1;
const VISUAL_SEARCH_FINGERPRINT_VERSION = `sharp-rgb-${VISUAL_SEARCH_VECTOR_SIZE}-v2`;
const VISUAL_SEARCH_FINGERPRINT_LENGTH =
  VISUAL_SEARCH_VECTOR_SIZE * VISUAL_SEARCH_VECTOR_SIZE * 3;
const VISUAL_SEARCH_QUERY_CROP_RATIOS = Object.freeze([
  { width: 0.9, height: 0.9 },
  { width: 0.88, height: 0.74 },
  { width: 0.74, height: 0.88 },
  { width: 0.74, height: 0.74 },
]);
const VISUAL_SEARCH_QUERY_ROTATION_DEGREES = Object.freeze([90, 270]);
const VISUAL_SEARCH_PRIMARY_IMAGE_ANGLE = "front";
const VISUAL_SEARCH_IMAGE_ANGLE_KEYS = Object.freeze([
  "front",
  "back",
  "left",
  "right",
  "up",
  "down",
]);
const VISUAL_SEARCH_OTHER_IMAGE_PREFIX = "other";
const DEFAULT_CHAT_AI_SYSTEM_PROMPT =
  "You are the GMS Shopping AI assistant inside the product support chat. " +
  "Reply in a warm, concise, and practical way. Use the product context and " +
  "conversation history when possible. If something is uncertain, say that " +
  "a human support agent may need to confirm it. Do not invent stock, price, " +
  "delivery guarantees, or medical claims.";
const CHAT_AI_ENV_HINT =
  "Chat AI is disabled because no OPENAI_API_KEY or CHAT_AI_API_KEY was found. " +
  "Add it to backend/.env or your shell environment.";
const DEFAULT_ADMIN_ID = "admin";
const PRODUCT_APPROVAL_APPROVED = "approved";
const PRODUCT_APPROVAL_PENDING = "pending";
const SUPER_ADMIN_USERNAME = String(
  process.env.SUPER_ADMIN_USERNAME || "root",
).trim() || "root";
const SUPER_ADMIN_PASSWORD = String(
  process.env.SUPER_ADMIN_PASSWORD || "Root@12345",
).trim() || "Root@12345";
const SUPER_ADMIN_SESSION_TOKEN = Buffer.from(
  `${SUPER_ADMIN_USERNAME}:${SUPER_ADMIN_PASSWORD}`,
).toString("base64url");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".gif": "image/gif",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".m4v": "video/x-m4v",
  ".mkv": "video/x-matroska",
  ".mov": "video/quicktime",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
  ".fbx": "application/octet-stream",
  ".obj": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".avi": "video/x-msvideo",
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".3gp": "video/3gpp",
};

function normalizeAdminTenantId(value, fallback = "") {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
}

function getRecordAdminId(record, fallback = DEFAULT_ADMIN_ID) {
  if (!record || typeof record !== "object") {
    return normalizeAdminTenantId(fallback, DEFAULT_ADMIN_ID);
  }

  return normalizeAdminTenantId(
    record.adminId ??
      record.tenantId ??
      record.ownerAdminId ??
      record.workspaceId ??
      record.storeAdminId ??
      record.sellerId ??
      record.seller_id ??
      record.shopId ??
      record.shop_id,
    normalizeAdminTenantId(fallback, DEFAULT_ADMIN_ID),
  );
}

function getRequestAdminId(request, requestUrl = null, fallback = DEFAULT_ADMIN_ID) {
  const url = requestUrl ?? new URL(request.url, `http://127.0.0.1:${PORT}`);
  return normalizeAdminTenantId(
    request.headers["x-gms-admin-id"] ??
      request.headers["x-admin-id"] ??
      url.searchParams.get("adminId") ??
      url.searchParams.get("tenantId") ??
      url.searchParams.get("workspaceId"),
    normalizeAdminTenantId(fallback, DEFAULT_ADMIN_ID),
  );
}

function hasRequestAdminScope(request, requestUrl = null) {
  const url = requestUrl ?? new URL(request.url, `http://127.0.0.1:${PORT}`);
  return Boolean(
    normalizeAdminTenantId(
      request.headers["x-gms-admin-id"] ??
        request.headers["x-admin-id"] ??
        url.searchParams.get("adminId") ??
        url.searchParams.get("tenantId") ??
        url.searchParams.get("workspaceId"),
      "",
    ),
  );
}

function getExplicitRequestAdminId(request, requestUrl = null) {
  if (!hasRequestAdminScope(request, requestUrl)) {
    return "";
  }

  return getRequestAdminId(request, requestUrl, "");
}

function isUsableProductAdminScope(adminId) {
  const normalizedAdminId = normalizeAdminTenantId(adminId, "");
  return Boolean(normalizedAdminId) && normalizedAdminId !== DEFAULT_ADMIN_ID;
}

function sendProductAdminScopeRequired(response) {
  sendJson(response, 403, {
    message: "Logged-in account scope is required to manage products.",
  });
}

function isRecordInAdminScope(record, adminId) {
  return getRecordAdminId(record) === normalizeAdminTenantId(adminId, DEFAULT_ADMIN_ID);
}

function filterRecordsByAdminId(records, adminId) {
  return (Array.isArray(records) ? records : []).filter((record) =>
    isRecordInAdminScope(record, adminId),
  );
}

function applyAdminId(record, adminId) {
  if (!record || typeof record !== "object") {
    return record;
  }

  return {
    ...record,
    adminId: normalizeAdminTenantId(adminId, DEFAULT_ADMIN_ID),
  };
}

function mergeScopedRecordsById(allRecords, scopedRecords, adminId) {
  const scopedById = new Map(
    (Array.isArray(scopedRecords) ? scopedRecords : []).map((record) => [
      String(record?.id ?? "").trim(),
      record,
    ]),
  );

  return (Array.isArray(allRecords) ? allRecords : []).map((record) => {
    const recordId = String(record?.id ?? "").trim();
    if (!recordId || !isRecordInAdminScope(record, adminId)) {
      return record;
    }

    return scopedById.get(recordId) ?? record;
  });
}

function isSuperAdminAuthorized(request) {
  const token = String(request.headers["x-gms-super-admin-token"] ?? "").trim();
  return token === SUPER_ADMIN_SESSION_TOKEN;
}

function requireSuperAdmin(request, response) {
  if (isSuperAdminAuthorized(request)) {
    return true;
  }

  sendJson(response, 401, {
    message: "Root access is required.",
  });
  return false;
}

function getServerUrls() {
  const urls = new Set([`http://127.0.0.1:${PORT}`]);
  const interfaces = os.networkInterfaces();

  for (const interfaceEntries of Object.values(interfaces)) {
    for (const entry of interfaceEntries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) {
        urls.add(`http://${entry.address}:${PORT}`);
      }
    }
  }

  return [...urls];
}

async function ensureStoragePaths() {
  await fsPromises.mkdir(DATA_DIR, { recursive: true });
  await fsPromises.mkdir(UPLOADS_DIR, { recursive: true });

  try {
    await fsPromises.access(PRODUCTS_FILE);
  } catch (error) {
    await fsPromises.writeFile(PRODUCTS_FILE, "[]\n", "utf8");
  }

  try {
    await fsPromises.access(ACTIVITY_FILE);
  } catch (error) {
    await fsPromises.writeFile(ACTIVITY_FILE, "[]\n", "utf8");
  }

  try {
    await fsPromises.access(ACCOUNTS_FILE);
  } catch (error) {
    await fsPromises.writeFile(ACCOUNTS_FILE, "[]\n", "utf8");
  }

  try {
    await fsPromises.access(CATEGORIES_FILE);
  } catch (error) {
    await fsPromises.writeFile(CATEGORIES_FILE, "[]\n", "utf8");
  }

  try {
    await fsPromises.access(STORE_TYPES_FILE);
  } catch (error) {
    await fsPromises.writeFile(STORE_TYPES_FILE, "[]\n", "utf8");
  }

  try {
    await fsPromises.access(CHAT_THREADS_FILE);
  } catch (error) {
    await fsPromises.writeFile(CHAT_THREADS_FILE, "[]\n", "utf8");
  }

  try {
    await fsPromises.access(DELIVERY_PARTNERS_FILE);
  } catch (error) {
    await fsPromises.writeFile(DELIVERY_PARTNERS_FILE, "[]\n", "utf8");
  }

  try {
    await fsPromises.access(PAYMENT_PARTNERS_FILE);
  } catch (error) {
    await fsPromises.writeFile(PAYMENT_PARTNERS_FILE, "[]\n", "utf8");
  }

  try {
    await fsPromises.access(ORDERS_FILE);
  } catch (error) {
    await fsPromises.writeFile(ORDERS_FILE, "[]\n", "utf8");
  }

  try {
    await fsPromises.access(FOLLOWERS_FILE);
  } catch (error) {
    await fsPromises.writeFile(FOLLOWERS_FILE, "{}\n", "utf8");
  }
}

async function readProducts() {
  await ensureStoragePaths();
  const raw = await fsPromises.readFile(PRODUCTS_FILE, "utf8");

  try {
    const decoded = JSON.parse(raw);
    return Array.isArray(decoded) ? decoded : [];
  } catch (error) {
    return [];
  }
}

async function writeProducts(products) {
  await fsPromises.writeFile(
    PRODUCTS_FILE,
    `${JSON.stringify(products, null, 2)}\n`,
    "utf8",
  );
}

async function readActivityLog() {
  await ensureStoragePaths();
  const raw = await fsPromises.readFile(ACTIVITY_FILE, "utf8");

  try {
    const decoded = JSON.parse(raw);
    return Array.isArray(decoded) ? decoded : [];
  } catch (error) {
    return [];
  }
}

async function writeActivityLog(entries) {
  await fsPromises.writeFile(
    ACTIVITY_FILE,
    `${JSON.stringify(entries, null, 2)}\n`,
    "utf8",
  );
}

async function readAccounts() {
  await ensureStoragePaths();
  const raw = await fsPromises.readFile(ACCOUNTS_FILE, "utf8");

  try {
    const decoded = JSON.parse(raw);
    return Array.isArray(decoded) ? decoded : [];
  } catch (error) {
    return [];
  }
}

async function writeAccounts(accounts) {
  await fsPromises.writeFile(
    ACCOUNTS_FILE,
    `${JSON.stringify(accounts, null, 2)}\n`,
    "utf8",
  );
}

function normalizeFollowerAccountId(value) {
  return String(value ?? "").trim();
}

function getFollowerRecordSellerAdminId(record) {
  if (!record || typeof record !== "object") {
    return "";
  }

  return normalizeAdminTenantId(
    record.sellerAdminId ??
      record.adminId ??
      record.tenantId ??
      record.ownerAdminId ??
      record.workspaceId ??
      record.storeAdminId,
    "",
  );
}

function getFollowerRecordAccountId(record) {
  if (!record || typeof record !== "object") {
    return "";
  }

  return normalizeFollowerAccountId(
    record.accountId ??
      record.userId ??
      record.customerId ??
      record.id ??
      record.email,
  );
}

function normalizeFollowerIds(values) {
  const seen = new Set();
  const normalizedIds = [];

  for (const value of Array.isArray(values) ? values : []) {
    const normalizedId =
      value && typeof value === "object"
        ? getFollowerRecordAccountId(value)
        : normalizeFollowerAccountId(value);

    if (!normalizedId || seen.has(normalizedId)) {
      continue;
    }

    seen.add(normalizedId);
    normalizedIds.push(normalizedId);
  }

  return normalizedIds;
}

function normalizeFollowersMap(input) {
  const normalizedFollowers = {};

  if (Array.isArray(input)) {
    for (const record of input) {
      const adminId = getFollowerRecordSellerAdminId(record);
      const accountId = getFollowerRecordAccountId(record);
      if (!adminId || !accountId) {
        continue;
      }

      if (!Array.isArray(normalizedFollowers[adminId])) {
        normalizedFollowers[adminId] = [];
      }
      if (!normalizedFollowers[adminId].includes(accountId)) {
        normalizedFollowers[adminId].push(accountId);
      }
    }

    return normalizedFollowers;
  }

  if (!input || typeof input !== "object") {
    return normalizedFollowers;
  }

  for (const [rawAdminId, rawFollowers] of Object.entries(input)) {
    const adminId = normalizeAdminTenantId(rawAdminId, "");
    if (!adminId) {
      continue;
    }

    normalizedFollowers[adminId] = normalizeFollowerIds(
      Array.isArray(rawFollowers)
        ? rawFollowers
        : Array.isArray(rawFollowers?.followers)
          ? rawFollowers.followers
          : [],
    );
  }

  return normalizedFollowers;
}

function getFollowersListForAdmin(followers, adminId) {
  const normalizedFollowers = normalizeFollowersMap(followers);
  const normalizedAdminId = normalizeAdminTenantId(adminId, "");
  return normalizedAdminId && Array.isArray(normalizedFollowers[normalizedAdminId])
    ? normalizedFollowers[normalizedAdminId]
    : [];
}

async function readFollowers() {
  await ensureStoragePaths();
  try {
    const raw = await fsPromises.readFile(FOLLOWERS_FILE, "utf8");
    const decoded = JSON.parse(raw);
    return normalizeFollowersMap(decoded);
  } catch (error) {
    return {};
  }
}

async function writeFollowers(followers) {
  await fsPromises.writeFile(
    FOLLOWERS_FILE,
    `${JSON.stringify(normalizeFollowersMap(followers), null, 2)}\n`,
    "utf8",
  );
}

function getRequestAccountIdentifier(request, requestUrl) {
  requestUrl = requestUrl || new URL(request.url, `http://${request.headers.host}`);
  const headerId = String(request.headers["x-gms-account-id"] ?? request.headers["x-account-id"] ?? "").trim();
  const headerEmail = String(request.headers["x-gms-account-email"] ?? request.headers["x-account-email"] ?? "").trim();
  const queryId = String(requestUrl.searchParams.get("accountId") ?? requestUrl.searchParams.get("id") ?? "").trim();
  const queryEmail = String(requestUrl.searchParams.get("email") ?? requestUrl.searchParams.get("accountEmail") ?? "").trim();
  const id = headerId || queryId || headerEmail || queryEmail || "";
  return {
    id,
    email: headerEmail || queryEmail || "",
  };
}

async function readFaceAttendanceProfiles() {
  try {
    const raw = await fsPromises.readFile(FACE_ATTENDANCE_EMPLOYEES_FILE, "utf8");
    const decoded = JSON.parse(raw);
    if (!Array.isArray(decoded)) {
      return new Map();
    }

    const profilesByEmployeeId = new Map();
    for (const profile of decoded) {
      if (!profile || typeof profile !== "object") {
        continue;
      }

      const employeeId = String(profile.employee_id ?? profile.employeeId ?? "")
        .trim()
        .toUpperCase();
      if (!employeeId) {
        continue;
      }

      profilesByEmployeeId.set(employeeId, profile);
    }

    return profilesByEmployeeId;
  } catch (error) {
    return new Map();
  }
}

function parseCsvLine(line) {
  const values = [];
  let currentValue = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && insideQuotes && nextCharacter === '"') {
      currentValue += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (character === "," && !insideQuotes) {
      values.push(currentValue);
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  values.push(currentValue);
  return values;
}

async function readFaceAttendanceRecords() {
  try {
    const raw = await fsPromises.readFile(FACE_ATTENDANCE_ATTENDANCE_FILE, "utf8");
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      return new Map();
    }

    const headers = parseCsvLine(lines[0]).map((header) =>
      String(header ?? "").trim(),
    );
    const recordsByEmployeeId = new Map();

    lines.slice(1).forEach((line) => {
      const values = parseCsvLine(line);
      const record = {};
      headers.forEach((header, index) => {
        record[header] = String(values[index] ?? "").trim();
      });

      const employeeId = normalizeFaceAttendanceAccountKey(
        record.employee_id ?? record.employeeId,
      );
      if (!employeeId) {
        return;
      }

      const existingRecords = recordsByEmployeeId.get(employeeId) ?? [];
      existingRecords.push(record);
      recordsByEmployeeId.set(employeeId, existingRecords);
    });

    return recordsByEmployeeId;
  } catch (error) {
    return new Map();
  }
}

async function readFaceAttendanceData() {
  const [profiles, attendanceRecords] = await Promise.all([
    readFaceAttendanceProfiles(),
    readFaceAttendanceRecords(),
  ]);

  return {
    profiles,
    attendanceRecords,
  };
}

function normalizeFaceAttendanceAccountKey(value) {
  return String(value ?? "").trim().toUpperCase();
}

function getFaceAttendanceAccountKeys(account) {
  return new Set(
    [
      account?.id,
      account?.accountId,
      account?.accountCode,
      account?.employeeId,
      account?.employee_id,
    ]
      .map(normalizeFaceAttendanceAccountKey)
      .filter(Boolean),
  );
}

async function removeFaceAttendanceProfileForAccount(account) {
  const accountKeys = getFaceAttendanceAccountKeys(account);
  if (!accountKeys.size) {
    return { removed: false, removedEmployeeIds: [] };
  }

  let profiles;
  try {
    const raw = await fsPromises.readFile(FACE_ATTENDANCE_EMPLOYEES_FILE, "utf8");
    const decoded = JSON.parse(raw);
    profiles = Array.isArray(decoded) ? decoded : [];
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.warn("Unable to read Face Attendance profiles for cleanup.", error);
    }
    return { removed: false, removedEmployeeIds: [] };
  }

  const removedEmployeeIds = [];
  const remainingProfiles = profiles.filter((profile) => {
    if (!profile || typeof profile !== "object") {
      return true;
    }

    const profileKeys = [
      profile.employee_id,
      profile.employeeId,
      profile.gms_account_id,
      profile.gmsAccountId,
      profile.account_id,
      profile.accountId,
    ]
      .map(normalizeFaceAttendanceAccountKey)
      .filter(Boolean);
    const shouldRemove = profileKeys.some((key) => accountKeys.has(key));
    if (shouldRemove) {
      const employeeId = normalizeFaceAttendanceAccountKey(
        profile.employee_id ?? profile.employeeId,
      );
      if (employeeId) {
        removedEmployeeIds.push(employeeId);
      }
    }
    return !shouldRemove;
  });

  if (remainingProfiles.length === profiles.length) {
    return { removed: false, removedEmployeeIds: [] };
  }

  await fsPromises.mkdir(path.dirname(FACE_ATTENDANCE_EMPLOYEES_FILE), { recursive: true });
  await fsPromises.writeFile(
    FACE_ATTENDANCE_EMPLOYEES_FILE,
    `${JSON.stringify(remainingProfiles, null, 2)}\n`,
    "utf8",
  );

  const facesRoot = path.resolve(FACE_ATTENDANCE_FACES_DIR);
  await Promise.all(
    [...new Set(removedEmployeeIds)].map(async (employeeId) => {
      const employeeFaceDir = path.resolve(facesRoot, employeeId);
      if (!employeeFaceDir.startsWith(`${facesRoot}${path.sep}`)) {
        return;
      }

      await fsPromises.rm(employeeFaceDir, { recursive: true, force: true });
    }),
  );

  return { removed: true, removedEmployeeIds: [...new Set(removedEmployeeIds)] };
}

async function readCategories() {
  await ensureStoragePaths();
  const raw = await fsPromises.readFile(CATEGORIES_FILE, "utf8");

  try {
    const decoded = JSON.parse(raw);
    return Array.isArray(decoded) ? decoded : [];
  } catch (error) {
    return [];
  }
}

async function writeCategories(categories) {
  await fsPromises.writeFile(
    CATEGORIES_FILE,
    `${JSON.stringify(categories, null, 2)}\n`,
    "utf8",
  );
}

async function readStoreTypes() {
  await ensureStoragePaths();
  const raw = await fsPromises.readFile(STORE_TYPES_FILE, "utf8");

  try {
    const decoded = JSON.parse(raw);
    return Array.isArray(decoded) ? decoded : [];
  } catch (error) {
    return [];
  }
}

async function writeStoreTypes(storeTypes) {
  await fsPromises.writeFile(
    STORE_TYPES_FILE,
    `${JSON.stringify(storeTypes, null, 2)}\n`,
    "utf8",
  );
}

async function readChatThreads() {
  await ensureStoragePaths();
  const raw = await fsPromises.readFile(CHAT_THREADS_FILE, "utf8");

  try {
    const decoded = JSON.parse(raw);
    return Array.isArray(decoded) ? decoded : [];
  } catch (error) {
    return [];
  }
}

async function writeChatThreads(threads) {
  await fsPromises.writeFile(
    CHAT_THREADS_FILE,
    `${JSON.stringify(threads, null, 2)}\n`,
    "utf8",
  );
}

async function readDeliveryPartners() {
  await ensureStoragePaths();
  const raw = await fsPromises.readFile(DELIVERY_PARTNERS_FILE, "utf8");

  try {
    const decoded = JSON.parse(raw);
    return Array.isArray(decoded) ? decoded : [];
  } catch (error) {
    return [];
  }
}

async function writeDeliveryPartners(partners) {
  await fsPromises.writeFile(
    DELIVERY_PARTNERS_FILE,
    `${JSON.stringify(partners, null, 2)}\n`,
    "utf8",
  );
}

async function readPaymentPartners() {
  await ensureStoragePaths();
  const raw = await fsPromises.readFile(PAYMENT_PARTNERS_FILE, "utf8");

  try {
    const decoded = JSON.parse(raw);
    return Array.isArray(decoded) ? decoded : [];
  } catch (error) {
    return [];
  }
}

async function writePaymentPartners(partners) {
  await fsPromises.writeFile(
    PAYMENT_PARTNERS_FILE,
    `${JSON.stringify(partners, null, 2)}\n`,
    "utf8",
  );
}

async function readOrders() {
  await ensureStoragePaths();
  const raw = await fsPromises.readFile(ORDERS_FILE, "utf8");

  try {
    const decoded = JSON.parse(raw);
    return filterRealAccountOrders(Array.isArray(decoded) ? decoded : []);
  } catch (error) {
    return [];
  }
}

async function writeOrders(orders) {
  const normalizedOrders = filterRealAccountOrders(orders);
  await fsPromises.writeFile(
    ORDERS_FILE,
    `${JSON.stringify(normalizedOrders, null, 2)}\n`,
    "utf8",
  );
}

function isRealOrderAccountId(value) {
  const accountId = String(value ?? "").trim();
  if (!accountId) {
    return false;
  }

  const normalizedAccountId = accountId.toLowerCase();
  return !/^(guest|test|sample|anonymous|unknown)(?:[_:-]|$)/.test(
    normalizedAccountId,
  );
}

function filterRealAccountOrders(orders) {
  return (Array.isArray(orders) ? orders : []).filter((order) =>
    isRealOrderAccountId(order?.accountId),
  );
}

function normalizeCategoryName(value) {
  if (value && typeof value === "object") {
    return normalizeCategoryName(
      value.name ?? value.category ?? value.label ?? value.title ?? "",
    );
  }

  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeStoreTypeName(value) {
  if (value && typeof value === "object") {
    return normalizeStoreTypeName(
      value.name ?? value.storeType ?? value.type ?? value.label ?? value.title ?? "",
    );
  }

  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeCategoryRecord(value, adminId = DEFAULT_ADMIN_ID) {
  const name = normalizeCategoryName(value);
  if (!name) {
    return null;
  }

  return {
    name,
    adminId: getRecordAdminId(
      value && typeof value === "object" ? value : null,
      adminId,
    ),
  };
}

function normalizeStoreTypeRecord(value) {
  const name = normalizeStoreTypeName(value);
  if (!name) {
    return null;
  }

  return { name };
}

function getCategoryRecordName(value) {
  return normalizeCategoryName(value);
}

function getStoreTypeRecordName(value) {
  return normalizeStoreTypeName(value);
}

function isCategoryRecordInAdminScope(value, adminId) {
  if (value && typeof value === "object") {
    return isRecordInAdminScope(value, adminId);
  }

  return normalizeAdminTenantId(adminId, DEFAULT_ADMIN_ID) === DEFAULT_ADMIN_ID;
}

function getStoredCategoryNames(categories) {
  return (Array.isArray(categories) ? categories : [])
    .map(getCategoryRecordName)
    .filter(Boolean);
}

function getStoredStoreTypeNames(storeTypes) {
  return (Array.isArray(storeTypes) ? storeTypes : [])
    .map(getStoreTypeRecordName)
    .filter(Boolean);
}

function getProductCategoryGroups(products) {
  return (Array.isArray(products) ? products : []).map((product) =>
    getProductCategoryList(product)
  );
}

function getGlobalCategoryList(storedCategories, products = []) {
  return getUniqueCategoryList([
    ...getStoredCategoryNames(storedCategories),
    ...getProductCategoryGroups(products),
  ]);
}

function getGlobalStoreTypeList(storedStoreTypes) {
  return getUniqueStoreTypeList(getStoredStoreTypeNames(storedStoreTypes));
}

function getAdminCategoryList(storedCategories, products = [], adminId = DEFAULT_ADMIN_ID) {
  return getUniqueCategoryList([
    ...getStoredCategoryNames(storedCategories),
    ...getProductCategoryGroups(filterRecordsByAdminId(products, adminId)),
  ]);
}

function normalizeProductCategoryValues(values, fallbackValue = "") {
  const rawValues = Array.isArray(values)
    ? values
    : values === null || values === undefined
      ? []
      : [values];
  const seen = new Set();
  const normalizedValues = [];

  for (const value of rawValues) {
    const normalizedCategory = normalizeCategoryName(value);
    if (!normalizedCategory) {
      continue;
    }

    const normalizedKey = normalizedCategory.toLowerCase();
    if (seen.has(normalizedKey)) {
      continue;
    }

    seen.add(normalizedKey);
    normalizedValues.push(normalizedCategory);
  }

  if (!normalizedValues.length && fallbackValue) {
    return normalizeProductCategoryValues([fallbackValue]);
  }

  return normalizedValues;
}

function getProductCategoryList(product) {
  const normalizedCategories = normalizeProductCategoryValues(product?.categories);
  if (normalizedCategories.length) {
    return normalizedCategories;
  }

  return normalizeProductCategoryValues(product?.category);
}

function getPrimaryProductCategory(product, fallbackCategory = "") {
  return (
    getProductCategoryList(product)[0] ||
    normalizeCategoryName(fallbackCategory)
  );
}

function getUniqueCategoryList(categories) {
  const seen = new Map();

  for (const categoryGroup of categories) {
    for (const normalizedCategory of normalizeProductCategoryValues(categoryGroup)) {
      const key = normalizedCategory.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, normalizedCategory);
      }
    }
  }

  return [...seen.values()].sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: "base" }),
  );
}

function getUniqueStoreTypeList(storeTypes) {
  const seen = new Map();
  const rawValues = Array.isArray(storeTypes)
    ? storeTypes
    : storeTypes === null || storeTypes === undefined
      ? []
      : [storeTypes];

  for (const value of rawValues) {
    const normalizedStoreType = normalizeStoreTypeName(value);
    if (!normalizedStoreType) {
      continue;
    }

    const key = normalizedStoreType.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, normalizedStoreType);
    }
  }

  return [...seen.values()].sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: "base" }),
  );
}

function normalizeActivityActor(input) {
  const role = String(input?.role ?? "").trim().toLowerCase() === "employee"
    ? "employee"
    : "admin";
  const accountId = String(
    input?.accountId ??
      input?.employeeId ??
      input?.email ??
      input?.id ??
      "",
  ).trim();
  const displayName = String(
    input?.displayName ??
      input?.name ??
      [input?.firstName, input?.lastName].filter(Boolean).join(" ") ??
      "",
  ).replace(/\s+/g, " ").trim();
  const profileImageUrl = String(
    input?.profileImageUrl ??
      input?.avatarUrl ??
      input?.photoUrl ??
      input?.profilePhotoUrl ??
      input?.employeePhotoUrl ??
      input?.pictureUrl ??
      input?.imageUrl ??
      "",
  ).trim();

  return {
    role,
    accountId,
    displayName: displayName || (role === "employee" ? "Employee" : "Admin"),
    profileImageUrl,
    adminId: normalizeAdminTenantId(input?.adminId ?? input?.ownerAdminId ?? input?.tenantId, ""),
  };
}

function getActivityAccountProfileImageUrl(account) {
  return String(
    account?.profileImageUrl ??
      account?.avatarUrl ??
      account?.photoUrl ??
      account?.profilePhotoUrl ??
      account?.employeePhotoUrl ??
      account?.pictureUrl ??
      account?.imageUrl ??
      "",
  ).trim();
}

function getActivityAccountDisplayName(account) {
  const firstLastName = [account?.firstName, account?.lastName]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return String(
    firstLastName ||
      account?.displayName ||
      account?.fullName ||
      "",
  ).replace(/\s+/g, " ").trim();
}

function normalizeActivityPersonNameKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findActivityAccountByDisplayName(accounts, displayName) {
  const nameKey = normalizeActivityPersonNameKey(displayName);
  if (!nameKey) {
    return null;
  }

  return accounts.find((account) => {
    if (String(account?.role ?? "").trim().toLowerCase() !== "employee") {
      return false;
    }

    return normalizeActivityPersonNameKey(getActivityAccountDisplayName(account)) === nameKey;
  }) || null;
}

function getActivityActorAccountKeys(account) {
  return [
    account?.accountId,
    account?.employeeId,
    account?.accountCode,
    account?.id,
    account?.email,
  ]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .filter(Boolean);
}

function findActivityActorAccount(accounts, actor) {
  if (actor.role !== "employee" || !actor.accountId) {
    return null;
  }

  const actorAccountId = String(actor.accountId).trim().toLowerCase();
  return accounts.find((account) => {
    if (String(account?.role ?? "").trim().toLowerCase() !== "employee") {
      return false;
    }

    if (getActivityActorAccountKeys(account).includes(actorAccountId)) {
      return true;
    }

    return (
      isEmployeeLoginIdentifierMatch(actor.accountId, account?.employeeId) ||
      isEmployeeLoginIdentifierMatch(actor.accountId, account?.accountCode)
    );
  }) || null;
}

function inferLegacyActivityActorFromAccounts(activity, accounts) {
  const title = String(activity?.title ?? "").trim().toLowerCase();
  const description = String(activity?.description ?? "").replace(/\s+/g, " ").trim();
  if (!title.includes("employee account") && !description.toLowerCase().includes("employee account")) {
    return null;
  }

  const nameMatch =
    description.match(/^(.+?)\s+employee account was\s+(?:updated|deleted)\.?$/i) ||
    description.match(/^(.+?)\s+was registered as an employee account\.?$/i);
  const account = nameMatch ? findActivityAccountByDisplayName(accounts, nameMatch[1]) : null;
  return account ? createEmployeeAccountActivityActor(account) : null;
}

function enrichActivityActorFromAccounts(activity, accounts) {
  const hasExplicitActor = Boolean(activity?.actor && typeof activity.actor === "object");
  if (!hasExplicitActor) {
    return { ...activity };
  }

  const actor = normalizeActivityActor(activity.actor);
  const account = findActivityActorAccount(accounts, actor);
  if (!account) {
    return { ...activity, actor };
  }

  const accountDisplayName = getActivityAccountDisplayName(account);
  const accountProfileImageUrl = getActivityAccountProfileImageUrl(account);
  return {
    ...activity,
    actor: {
      ...actor,
      displayName: accountDisplayName || actor.displayName || "Employee",
      profileImageUrl: accountProfileImageUrl || actor.profileImageUrl,
    },
  };
}

function createEmployeeAccountActivityActor(account) {
  return normalizeActivityActor({
    role: "employee",
    accountId: account?.employeeId ?? account?.accountCode ?? account?.id ?? account?.email ?? "",
    displayName: getActivityAccountDisplayName(account) || "Employee",
    profileImageUrl: getActivityAccountProfileImageUrl(account),
  });
}

function createEmployeeRequestActivityActor(payload, account) {
  const actorInput = payload?.__activityActor;
  if (!actorInput || typeof actorInput !== "object") {
    return null;
  }

  const actor = normalizeActivityActor({
    ...actorInput,
    role: "employee",
    accountId: account?.employeeId ?? account?.accountCode ?? account?.id ?? actorInput.accountId ?? "",
    displayName: getActivityAccountDisplayName(account) || actorInput.displayName || "Employee",
    profileImageUrl: getActivityAccountProfileImageUrl(account) || actorInput.profileImageUrl,
  });

  return actor.role === "employee" ? actor : null;
}

function createActivityLogId() {
  return `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function shouldNotifyForViewerActivity(activity, viewer) {
  const actor = normalizeActivityActor(activity?.actor);
  if (!actor.role) {
    return false;
  }

  const notificationAudience = String(
    activity?.notificationAudience ?? activity?.audience ?? "",
  ).trim().toLowerCase();
  const targetPermission = getActivityTargetPermission(activity);
  const isInventoryActivity = isInventoryAccessPermission(targetPermission);
  if (isInventoryActivity) {
    if (viewer.role === "employee") {
      return actor.role === "admin" || (actor.role === "employee" && !isSameActivityActor(actor, viewer));
    }

    return actor.role === "employee";
  }

  if (notificationAudience === "admin") {
    return viewer.role === "admin" && actor.role === "employee";
  }
  if (notificationAudience === "employees") {
    return viewer.role === "employee" && actor.role === "admin";
  }

  if (viewer.role === "employee") {
    return actor.role === "admin" || (actor.role === "employee" && !isSameActivityActor(actor, viewer));
  }

  return actor.role === "employee";
}

function isSameActivityActor(left, right) {
  const leftRole = String(left?.role ?? "").trim().toLowerCase();
  const rightRole = String(right?.role ?? "").trim().toLowerCase();
  const leftAccountId = String(left?.accountId ?? "").trim().toLowerCase();
  const rightAccountId = String(right?.accountId ?? "").trim().toLowerCase();

  return Boolean(leftRole && rightRole && leftRole === rightRole && leftAccountId && rightAccountId && leftAccountId === rightAccountId);
}

function getProductActivityActorLabel(actor) {
  return String(actor?.displayName ?? "").replace(/\s+/g, " ").trim() ||
    (actor?.role === "admin" ? "Admin" : "Employee");
}

function formatProductActivityPrice(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "";
  }

  return amount.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  });
}

function normalizeProductActivityText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function getProductActivityStoredProduct(product) {
  try {
    return normalizeStoredProductRecord(product ?? {});
  } catch (error) {
    return product ?? {};
  }
}

function normalizeProductActivityNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getProductActivitySignature(value) {
  return JSON.stringify(value ?? null);
}

function normalizeProductActivityList(values) {
  return Array.isArray(values)
    ? values.map(normalizeProductActivityText).filter(Boolean)
    : [];
}

function normalizePartnerIdList(values, fallbackValues = []) {
  const normalizedValues = [];
  const seen = new Set();
  const sourceValues = Array.isArray(values)
    ? values
    : Array.isArray(fallbackValues)
      ? fallbackValues
      : [];

  for (const candidate of sourceValues) {
    const value = String(candidate ?? "").trim();
    const normalizedKey = value.toLowerCase();
    if (!value || seen.has(normalizedKey)) {
      continue;
    }

    seen.add(normalizedKey);
    normalizedValues.push(value);
  }

  return normalizedValues;
}

function normalizePartnerEnabledState(partner) {
  const readBoolean = (value, fallback) => {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return value !== 0;
    }
    const normalizedValue = String(value ?? "").trim().toLowerCase();
    if (["true", "active", "enabled", "1"].includes(normalizedValue)) {
      return true;
    }
    if (["false", "inactive", "disabled", "0"].includes(normalizedValue)) {
      return false;
    }
    return fallback;
  };

  if (readBoolean(partner?.disabled, false)) {
    return false;
  }
  if (Object.prototype.hasOwnProperty.call(partner ?? {}, "enabled")) {
    return readBoolean(partner.enabled, true);
  }
  if (Object.prototype.hasOwnProperty.call(partner ?? {}, "isEnabled")) {
    return readBoolean(partner.isEnabled, true);
  }
  if (Object.prototype.hasOwnProperty.call(partner ?? {}, "isActive")) {
    return readBoolean(partner.isActive, true);
  }

  const status = String(partner?.status ?? "").trim().toLowerCase();
  if (["inactive", "disabled", "archived", "deleted"].includes(status)) {
    return false;
  }

  return true;
}

function getActivePartnerIdMap(partners) {
  const activeIds = new Map();
  for (const partner of Array.isArray(partners) ? partners : []) {
    const id = String(partner?.id ?? "").trim();
    if (!id || !normalizePartnerEnabledState(partner)) {
      continue;
    }
    activeIds.set(id.toLowerCase(), id);
  }
  return activeIds;
}

function resolveActiveProductPartnerIds(selectedIds, activePartnerIds) {
  const resolvedIds = [];
  for (const selectedId of normalizePartnerIdList(selectedIds)) {
    const activeId = activePartnerIds.get(selectedId.toLowerCase());
    if (!activeId) {
      continue;
    }
    resolvedIds.push(activeId);
  }
  return normalizePartnerIdList(resolvedIds);
}

async function validateProductPartnerSelections(product) {
  const [deliveryPartners, paymentPartners] = await Promise.all([
    readDeliveryPartners(),
    readPaymentPartners(),
  ]);
  const activeDeliveryPartnerIds = getActivePartnerIdMap(deliveryPartners);
  const activePaymentPartnerIds = getActivePartnerIdMap(paymentPartners);
  const deliveryPartnerIds = resolveActiveProductPartnerIds(
    product?.deliveryPartnerIds,
    activeDeliveryPartnerIds,
  );
  const paymentPartnerIds = resolveActiveProductPartnerIds(
    product?.paymentPartnerIds,
    activePaymentPartnerIds,
  );

  if (!deliveryPartnerIds.length) {
    throw new Error("Select at least one active delivery partner.");
  }
  if (!paymentPartnerIds.length) {
    throw new Error("Select at least one active payment partner.");
  }

  return {
    ...product,
    deliveryPartnerIds,
    paymentPartnerIds,
  };
}

function getProductActivityFieldValue(product, field) {
  return normalizeProductActivityText(product?.[field]);
}

function getProductActivityDisplayValue(value, type = "text") {
  if (type === "price") {
    return formatProductActivityPrice(value);
  }

  if (type === "boolean") {
    return value ? "active" : "inactive";
  }

  if (type === "date") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
  }

  if (Array.isArray(value)) {
    return value.map(normalizeProductActivityText).filter(Boolean).join(", ");
  }

  return normalizeProductActivityText(value);
}

function pushProductActivityFieldChange(changes, previousValue, nextValue, change) {
  const previousSignature = getProductActivitySignature(previousValue);
  const nextSignature = getProductActivitySignature(nextValue);
  if (previousSignature === nextSignature) {
    return;
  }

  changes.push({
    ...change,
    previousValue,
    nextValue,
  });
}

function getProductActivityImageSignature(product) {
  const storedProduct = getProductActivityStoredProduct(product);
  return JSON.stringify({
    imageUrl: normalizeProductActivityText(storedProduct.imageUrl),
    mainImageUrl: normalizeProductActivityText(storedProduct.mainImageUrl),
    imageUrls: Array.isArray(storedProduct.imageUrls)
      ? storedProduct.imageUrls.map(normalizeProductActivityText)
      : [],
    mainImageIndex: Number(storedProduct.mainImageIndex) || 0,
    cardImageUrl: normalizeProductActivityText(storedProduct.cardImageUrl),
    buyModalImageUrl: normalizeProductActivityText(storedProduct.buyModalImageUrl),
  });
}

function getProductActivityVisualSearchSignature(product) {
  const storedProduct = getProductActivityStoredProduct(product);
  return JSON.stringify({
    visualSearchImageUrl: normalizeProductActivityText(storedProduct.visualSearchImageUrl),
    visualSearchImageUrls: Array.isArray(storedProduct.visualSearchImageUrls)
      ? storedProduct.visualSearchImageUrls.map(normalizeProductActivityText)
      : [],
    visualSearchImageAngles: storedProduct.visualSearchImageAngles ?? {},
  });
}

function getProductActivityVideoSignature(product) {
  const storedProduct = getProductActivityStoredProduct(product);
  return JSON.stringify({
    videoUrl: normalizeProductActivityText(storedProduct.videoUrl),
    videoUrls: normalizeProductActivityList(storedProduct.videoUrls),
    videoThumbnailUrl: normalizeProductActivityText(storedProduct.videoThumbnailUrl),
    videoThumbnailUrls: normalizeProductActivityList(storedProduct.videoThumbnailUrls),
    detailsVideoSourceUrl: normalizeProductActivityText(storedProduct.detailsVideoSourceUrl),
  });
}

function getProductActivityModelSignature(product) {
  const storedProduct = getProductActivityStoredProduct(product);
  return JSON.stringify({
    model3dUrl: normalizeProductActivityText(storedProduct.model3dUrl),
    model3dScanImageUrls: normalizeProductActivityList(storedProduct.model3dScanImageUrls),
  });
}

function getProductActivityDisplaySignature(product) {
  const storedProduct = getProductActivityStoredProduct(product);
  return JSON.stringify({
    cardImagePositionX: normalizeProductActivityNumber(storedProduct.cardImagePositionX),
    cardImagePosition: normalizeProductActivityNumber(storedProduct.cardImagePosition),
    buyModalImagePositionX: normalizeProductActivityNumber(storedProduct.buyModalImagePositionX),
    buyModalImagePositionY: normalizeProductActivityNumber(storedProduct.buyModalImagePositionY),
    detailsVideoPositionX: normalizeProductActivityNumber(storedProduct.detailsVideoPositionX),
    detailsVideoPositionY: normalizeProductActivityNumber(storedProduct.detailsVideoPositionY),
    detailsVideoZoomPercent: normalizeProductActivityNumber(storedProduct.detailsVideoZoomPercent),
    detailsVideoVisibleWidthFraction: normalizeProductActivityNumber(storedProduct.detailsVideoVisibleWidthFraction),
    detailsVideoVisibleHeightFraction: normalizeProductActivityNumber(storedProduct.detailsVideoVisibleHeightFraction),
    detailsVideoPreviewTimeMs: normalizeProductActivityNumber(storedProduct.detailsVideoPreviewTimeMs),
    detailsImageCrops: storedProduct.detailsImageCrops ?? [],
  });
}

function getProductActivityVariantPriceValue(variant) {
  const salesPrice = normalizeProductActivityNumber(variant?.salesPrice);
  if (salesPrice !== null) {
    return salesPrice;
  }

  return normalizeProductActivityNumber(variant?.originalPrice);
}

function getProductActivityVariantSignature(variant) {
  return JSON.stringify({
    id: normalizeProductActivityText(variant?.id),
    name: normalizeProductActivityText(variant?.name),
    imageUrl: normalizeProductActivityText(variant?.imageUrl),
    imageSourceUrl: normalizeProductActivityText(variant?.imageSourceUrl),
    imagePositionX: normalizeProductActivityNumber(variant?.imagePositionX),
    imagePositionY: normalizeProductActivityNumber(variant?.imagePositionY),
    originalPrice: normalizeProductActivityNumber(variant?.originalPrice),
    salesPrice: normalizeProductActivityNumber(variant?.salesPrice),
    stock: normalizeProductActivityNumber(variant?.stock),
    addOns: variant?.addOns ?? [],
  });
}

function getProductActivityVariantImageSignature(variant) {
  return JSON.stringify({
    imageUrl: normalizeProductActivityText(variant?.imageUrl),
    imageSourceUrl: normalizeProductActivityText(variant?.imageSourceUrl),
    imagePositionX: normalizeProductActivityNumber(variant?.imagePositionX),
    imagePositionY: normalizeProductActivityNumber(variant?.imagePositionY),
  });
}

function getProductActivityVariantLabel(variant, fallback = "variant") {
  return normalizeProductActivityText(variant?.name) ||
    normalizeProductActivityText(variant?.id) ||
    fallback;
}

function getProductActivityVariantChanges(previousProduct, product) {
  const previousVariants = Array.isArray(previousProduct?.variants) ? previousProduct.variants : [];
  const nextVariants = Array.isArray(product?.variants) ? product.variants : [];
  const changes = [];
  const matchedPreviousIndexes = new Set();

  nextVariants.forEach((nextVariant, index) => {
    const nextId = normalizeProductActivityText(nextVariant?.id);
    let previousIndex = nextId
      ? previousVariants.findIndex((variant) => normalizeProductActivityText(variant?.id) === nextId)
      : -1;
    if (previousIndex < 0 && previousVariants[index] && !matchedPreviousIndexes.has(index)) {
      previousIndex = index;
    }

    if (previousIndex < 0 || matchedPreviousIndexes.has(previousIndex)) {
      changes.push({
        type: "variant-added",
        variantId: normalizeProductActivityText(nextVariant?.id),
        variantName: getProductActivityVariantLabel(nextVariant),
        nextValue: getProductActivityVariantSignature(nextVariant),
      });
      return;
    }

    matchedPreviousIndexes.add(previousIndex);
    const previousVariant = previousVariants[previousIndex];
    const variantName = getProductActivityVariantLabel(nextVariant, getProductActivityVariantLabel(previousVariant));
    const previousName = normalizeProductActivityText(previousVariant?.name);
    const nextName = normalizeProductActivityText(nextVariant?.name);

    if (previousName && nextName && previousName !== nextName) {
      changes.push({
        type: "variant-name",
        variantId: normalizeProductActivityText(nextVariant?.id),
        variantName: nextName,
        previousValue: previousName,
        nextValue: nextName,
      });
    }

    const previousPrice = getProductActivityVariantPriceValue(previousVariant);
    const nextPrice = getProductActivityVariantPriceValue(nextVariant);
    if (previousPrice !== nextPrice) {
      changes.push({
        type: "variant-price",
        variantId: normalizeProductActivityText(nextVariant?.id),
        variantName,
        valueType: "price",
        previousValue: previousPrice,
        nextValue: nextPrice,
      });
    }

    if (getProductActivityVariantImageSignature(previousVariant) !== getProductActivityVariantImageSignature(nextVariant)) {
      changes.push({
        type: "variant-photo",
        variantId: normalizeProductActivityText(nextVariant?.id),
        variantName,
        previousValue: getProductActivityVariantImageSignature(previousVariant),
        nextValue: getProductActivityVariantImageSignature(nextVariant),
      });
    }

    pushProductActivityFieldChange(
      changes,
      normalizeProductActivityNumber(previousVariant?.stock),
      normalizeProductActivityNumber(nextVariant?.stock),
      {
        type: "variant-stock",
        variantId: normalizeProductActivityText(nextVariant?.id),
        variantName,
        valueType: "number",
      },
    );

    pushProductActivityFieldChange(
      changes,
      previousVariant?.addOns ?? [],
      nextVariant?.addOns ?? [],
      {
        type: "variant-addons",
        variantId: normalizeProductActivityText(nextVariant?.id),
        variantName,
      },
    );
  });

  previousVariants.forEach((previousVariant, index) => {
    if (matchedPreviousIndexes.has(index)) {
      return;
    }

    const previousId = normalizeProductActivityText(previousVariant?.id);
    const stillExists = previousId && nextVariants.some(
      (variant) => normalizeProductActivityText(variant?.id) === previousId,
    );
    if (stillExists) {
      return;
    }

    changes.push({
      type: "variant-removed",
      variantId: normalizeProductActivityText(previousVariant?.id),
      variantName: getProductActivityVariantLabel(previousVariant),
      previousValue: getProductActivityVariantSignature(previousVariant),
    });
  });

  return changes;
}

function getProductActivityChanges(previousProduct, product) {
  if (!previousProduct) {
    return [];
  }

  const changes = [];
  const previousStoredProduct = getProductActivityStoredProduct(previousProduct);
  const nextStoredProduct = getProductActivityStoredProduct(product);
  const previousName = normalizeProductActivityText(previousStoredProduct.name);
  const nextName = normalizeProductActivityText(nextStoredProduct.name);
  if (previousName && nextName && previousName !== nextName) {
    changes.push({ type: "name", previousName, nextName });
  }

  pushProductActivityFieldChange(
    changes,
    normalizeProductActivityList(previousStoredProduct.categories),
    normalizeProductActivityList(nextStoredProduct.categories),
    {
      type: "category",
      label: "category",
    },
  );

  pushProductActivityFieldChange(
    changes,
    getProductActivityFieldValue(previousStoredProduct, "description"),
    getProductActivityFieldValue(nextStoredProduct, "description"),
    {
      type: "field",
      label: "description",
    },
  );

  pushProductActivityFieldChange(
    changes,
    normalizeProductActivityNumber(previousStoredProduct.originalPrice),
    normalizeProductActivityNumber(nextStoredProduct.originalPrice),
    {
      type: "price",
      label: "price",
      valueType: "price",
    },
  );

  pushProductActivityFieldChange(
    changes,
    normalizeProductActivityNumber(previousStoredProduct.salesPrice),
    normalizeProductActivityNumber(nextStoredProduct.salesPrice),
    {
      type: "price",
      label: "sale price",
      valueType: "price",
    },
  );

  pushProductActivityFieldChange(
    changes,
    normalizeProductActivityNumber(previousStoredProduct.inventoryStock ?? previousStoredProduct.stock),
    normalizeProductActivityNumber(nextStoredProduct.inventoryStock ?? nextStoredProduct.stock),
    {
      type: "field",
      label: "stock",
      valueType: "number",
    },
  );

  pushProductActivityFieldChange(
    changes,
    getProductActivityFieldValue(previousStoredProduct, "expiryDate"),
    getProductActivityFieldValue(nextStoredProduct, "expiryDate"),
    {
      type: "field",
      label: "expiry date",
      valueType: "date",
    },
  );

  pushProductActivityFieldChange(
    changes,
    getProductActivityFieldValue(previousStoredProduct, "barcode"),
    getProductActivityFieldValue(nextStoredProduct, "barcode"),
    {
      type: "field",
      label: "barcode",
    },
  );

  pushProductActivityFieldChange(
    changes,
    Boolean(previousStoredProduct.isActive),
    Boolean(nextStoredProduct.isActive),
    {
      type: "field",
      label: "visibility",
      valueType: "boolean",
    },
  );

  pushProductActivityFieldChange(
    changes,
    normalizeProductActivityNumber(previousStoredProduct.rating),
    normalizeProductActivityNumber(nextStoredProduct.rating),
    {
      type: "field",
      label: "rating",
      valueType: "number",
    },
  );

  if (getProductActivityImageSignature(previousProduct) !== getProductActivityImageSignature(product)) {
    changes.push({ type: "photo", label: "main product image" });
  }

  if (getProductActivityVisualSearchSignature(previousProduct) !== getProductActivityVisualSearchSignature(product)) {
    changes.push({ type: "image-search", label: "image search" });
  }

  if (getProductActivityVideoSignature(previousProduct) !== getProductActivityVideoSignature(product)) {
    changes.push({ type: "video" });
  }

  if (getProductActivityModelSignature(previousProduct) !== getProductActivityModelSignature(product)) {
    changes.push({ type: "3d-model" });
  }

  if (getProductActivityDisplaySignature(previousProduct) !== getProductActivityDisplaySignature(product)) {
    changes.push({ type: "display" });
  }

  return [
    ...changes,
    ...getProductActivityVariantChanges(previousStoredProduct, nextStoredProduct),
  ];
}

function normalizeProductActivityNotificationChanges(changes) {
  const normalizedChanges = Array.isArray(changes) ? changes.filter(Boolean) : [];
  if (normalizedChanges.length !== 2) {
    return normalizedChanges;
  }

  const displayChange = normalizedChanges.find((change) => change?.type === "display");
  const mediaChange = normalizedChanges.find((change) =>
    ["photo", "video"].includes(String(change?.type ?? "").trim().toLowerCase()),
  );
  if (displayChange && mediaChange) {
    return [mediaChange];
  }

  return normalizedChanges;
}

function formatProductActivityFieldChange(actorLabel, productName, change) {
  const nextValue = getProductActivityDisplayValue(change.nextValue, change.valueType);
  const suffix = nextValue ? ` to ${nextValue}` : "";

  if (change.type === "name") {
    return `${actorLabel} was update the product name ${change.previousName} to ${change.nextName}.`;
  }

  if (change.type === "price") {
    return `${actorLabel} update the ${productName} ${change.label || "price"}${suffix}.`;
  }

  if (change.type === "category") {
    return `${actorLabel} was update the category of ${productName}${suffix}.`;
  }

  if (change.type === "photo") {
    return `${actorLabel} was update the ${change.label || "photo"} of ${productName}.`;
  }

  if (change.type === "image-search") {
    return `${actorLabel} was update the image search photos of ${productName}.`;
  }

  if (change.type === "video") {
    return `${actorLabel} was update the video of ${productName}.`;
  }

  if (change.type === "3d-model") {
    return `${actorLabel} was update the 3D model of ${productName}.`;
  }

  if (change.type === "display") {
    return `${actorLabel} was update the media display of ${productName}.`;
  }

  if (change.type === "variant-added") {
    return `${actorLabel} added the variant ${change.variantName} of ${productName}.`;
  }

  if (change.type === "variant-removed") {
    return `${actorLabel} removed the variant ${change.variantName} of ${productName}.`;
  }

  if (change.type === "variant-name") {
    return `${actorLabel} was update the variant name ${change.previousValue} to ${change.nextValue} of ${productName}.`;
  }

  if (change.type === "variant-price") {
    return `${actorLabel} update the ${change.variantName} variant price of ${productName}${suffix}.`;
  }

  if (change.type === "variant-photo") {
    return `${actorLabel} was update the photo of variant ${change.variantName} of ${productName}.`;
  }

  if (change.type === "variant-stock") {
    return `${actorLabel} was update the stock of variant ${change.variantName} of ${productName}${suffix}.`;
  }

  if (change.type === "variant-addons") {
    return `${actorLabel} was update the add-ons of variant ${change.variantName} of ${productName}.`;
  }

  return `${actorLabel} was update the ${change.label || "details"} of ${productName}${suffix}.`;
}

function getProductActivityChangeFocusTarget(change) {
  const changeType = String(change?.type ?? "").trim().toLowerCase();
  const changeLabel = String(change?.label ?? "").trim().toLowerCase();

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
    if (changeLabel === "expiry date") {
      return "details";
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
  return "details";
}

function getProductActivityChangeLabel(change) {
  const changeType = String(change?.type ?? "").trim().toLowerCase();
  if (changeType.startsWith("variant-")) {
    return change?.variantName
      ? `variant ${change.variantName}`
      : "variant";
  }
  return String(change?.label ?? (changeType || "details")).trim();
}

function createProductActivityTargetUrl(product, changes) {
  const normalizedChanges = normalizeProductActivityNotificationChanges(changes);
  const productId = String(product?.id ?? "").trim();
  if (!productId) {
    return "";
  }
  if (normalizedChanges.length !== 1) {
    return createProductActivityListTargetUrl(product);
  }

  const focusTarget = getProductActivityChangeFocusTarget(normalizedChanges[0]);
  const params = new URLSearchParams({
    edit: productId,
    focus: focusTarget,
    notificationFocus: "1",
  });
  const primaryChange = normalizedChanges[0];
  if (String(primaryChange?.type ?? "").trim().toLowerCase().startsWith("variant-")) {
    const variantId = String(primaryChange?.variantId ?? "").trim();
    const variantName = String(primaryChange?.variantName ?? "").trim();
    if (variantId) {
      params.set("variantId", variantId);
    }
    if (variantName) {
      params.set("variant", variantName);
    }
  }

  return `/edit_products.html?${params.toString()}`;
}

function createProductActivityListTargetUrl(product) {
  const productId = String(product?.id ?? "").trim();
  if (!productId) {
    return "";
  }

  const params = new URLSearchParams({
    product: productId,
    notificationFocus: "1",
  });
  return `/product_panel.html?${params.toString()}`;
}

function normalizeProductActivityContext(input) {
  const context = String(
    input?.__activityContext ??
      input?.activityContext ??
      input?.__activitySource ??
      input?.activitySource ??
      "",
  ).trim().toLowerCase();
  return context === "inventory" || context === "stock" ? "inventory" : "";
}

function isProductVisibilityToggleActivity(activityInput, changes) {
  const context = String(
    activityInput?.__activityContext ??
      activityInput?.activityContext ??
      activityInput?.__activitySource ??
      activityInput?.activitySource ??
      "",
  ).trim().toLowerCase();
  if (["product-visibility", "product-visibility-toggle", "visibility-toggle"].includes(context)) {
    return true;
  }

  const normalizedChanges = normalizeProductActivityNotificationChanges(changes);
  return normalizedChanges.some((change) => {
    const changeType = String(change?.type ?? "").trim().toLowerCase();
    const changeLabel = String(change?.label ?? "").trim().toLowerCase();
    return changeType === "field" && changeLabel === "visibility";
  });
}

function normalizeProductInventoryActivityTarget(value) {
  const target = String(value ?? "").trim().toLowerCase();
  if (["add", "added", "add-stock", "stock-add", "restock", "new-stock"].includes(target)) {
    return "add";
  }
  if (["deduct", "deducted", "deduct-stock", "stock-deduct", "subtract"].includes(target)) {
    return "deduct";
  }
  if (["expiry", "expiry-date", "expire-date", "expiration", "expiration-date"].includes(target)) {
    return "expiry";
  }
  if (["card", "product", "inventory", "details"].includes(target)) {
    return "card";
  }
  return "";
}

function getProductInventoryLogicalChangeCount(input) {
  const rawCount =
    input?.__activityInventoryChangeCount ??
    input?.activityInventoryChangeCount ??
    input?.__activityChangeCount ??
    input?.activityChangeCount;
  const count = Number(rawCount);
  return Number.isFinite(count) && count >= 0 ? Math.trunc(count) : null;
}

function inferProductInventoryActivityTarget(change) {
  const changeType = String(change?.type ?? "").trim().toLowerCase();
  const changeLabel = String(change?.label ?? "").trim().toLowerCase();
  if (changeType === "field" && changeLabel === "expiry date") {
    return "expiry";
  }
  if (changeType === "field" && changeLabel === "stock") {
    const previousValue = Number(change?.previousValue);
    const nextValue = Number(change?.nextValue);
    if (Number.isFinite(previousValue) && Number.isFinite(nextValue)) {
      if (nextValue > previousValue) {
        return "add";
      }
      if (nextValue < previousValue) {
        return "deduct";
      }
    }
  }
  return "card";
}

function createProductInventoryActivityTargetUrl(product, changes, activityInput = null) {
  const productId = String(product?.id ?? "").trim();
  if (!productId) {
    return "";
  }

  const normalizedChanges = normalizeProductActivityNotificationChanges(changes);
  const logicalChangeCount = getProductInventoryLogicalChangeCount(activityInput);
  const isSingleLogicalChange =
    logicalChangeCount === null
      ? normalizedChanges.length === 1
      : logicalChangeCount === 1;
  const explicitTarget = isSingleLogicalChange
    ? normalizeProductInventoryActivityTarget(
        activityInput?.__activityTarget ?? activityInput?.activityTarget,
      )
    : "";
  const focusTarget = isSingleLogicalChange
    ? explicitTarget || inferProductInventoryActivityTarget(normalizedChanges[0])
    : "card";
  const displayStockProductId = String(
    activityInput?.__activityDisplayStockProductId ??
      activityInput?.activityDisplayStockProductId ??
      "",
  ).trim();
  const stockRecordId = String(
    activityInput?.__activityStockRecordId ??
      activityInput?.activityStockRecordId ??
      activityInput?.stockRecordId ??
      "",
  ).trim();
  const stockRecordModifiedAt = String(
    activityInput?.__activityStockRecordModifiedAt ??
      activityInput?.activityStockRecordModifiedAt ??
      activityInput?.stockRecordModifiedAt ??
      "",
  ).trim();
  const params = new URLSearchParams({
    product: productId,
    focus: normalizeProductInventoryActivityTarget(focusTarget) || "card",
    notificationFocus: "1",
  });
  if (displayStockProductId) {
    params.set("stockProduct", displayStockProductId);
  }
  if (stockRecordId) {
    params.set("stockRecord", stockRecordId);
  }
  if (stockRecordModifiedAt) {
    params.set("stockRecordModifiedAt", stockRecordModifiedAt);
  }

  return `/stock.html?${params.toString()}`;
}

function getProductUpdatedActivityDescription(actor, product, previousProduct = null, changes = null) {
  const actorLabel = getProductActivityActorLabel(actor);
  const productName = normalizeProductActivityText(product.name) || "Product";
  const normalizedChanges = normalizeProductActivityNotificationChanges(
    Array.isArray(changes) ? changes : getProductActivityChanges(previousProduct, product),
  );

  if (normalizedChanges.length === 1) {
    return formatProductActivityFieldChange(actorLabel, productName, normalizedChanges[0]);
  }

  return `${actorLabel} was update the product ${productName}.`;
}

function getProductInventoryStockActivityDescription(actor, product, previousProduct = null, changes = null) {
  const actorLabel = getProductActivityActorLabel(actor);
  const productName = normalizeProductActivityText(product?.name) || "Product";
  const normalizedChanges = normalizeProductActivityNotificationChanges(
    Array.isArray(changes) ? changes : getProductActivityChanges(previousProduct, product),
  );
  const stockChange = normalizedChanges.find((change) => {
    const changeType = String(change?.type ?? "").trim().toLowerCase();
    const changeLabel = String(change?.label ?? "").trim().toLowerCase();
    return changeType === "field" && changeLabel === "stock";
  });

  if (!stockChange) {
    return getProductUpdatedActivityDescription(actor, product, previousProduct, normalizedChanges);
  }

  const previousStock = Number(stockChange.previousValue);
  const nextStock = Number(stockChange.nextValue);
  if (!Number.isFinite(previousStock) || !Number.isFinite(nextStock) || previousStock === nextStock) {
    return getProductUpdatedActivityDescription(actor, product, previousProduct, normalizedChanges);
  }

  const action = nextStock > previousStock ? "add" : "deduct";
  const adjustmentAmount = Math.abs(nextStock - previousStock);
  return `${actorLabel} was ${action} ${adjustmentAmount} stock of ${productName} total of ${nextStock}.`;
}

function createProductActivityEntry(action, product, actorInput = null, previousProduct = null, activityInput = null) {
  const category = getProductCategoryList(product).join(", ") || "General";
  const name = String(product.name ?? "").trim() || "Unnamed product";
  const actor = normalizeActivityActor(actorInput);
  if (actor.role !== "employee" && actor.role !== "admin") {
    return null;
  }

  const activityContext = normalizeProductActivityContext(activityInput);
  const createdAt = new Date().toISOString();
  const baseEntry = {
    id: createActivityLogId(),
    type: "product",
    targetPermission: activityContext === "inventory" ? "admin-inventory" : "products",
    adminId: getRecordAdminId(product),
    action,
    productId: String(product.id ?? "").trim(),
    productName: name,
    category,
    actor,
    title: "Product update",
    createdAt,
  };

  if (action === "created") {
    return {
      ...baseEntry,
      description: `${getProductActivityActorLabel(actor)} was add product ${name}.`,
      targetUrl: createProductActivityListTargetUrl(product),
    };
  }

  if (action === "updated") {
    const changes = normalizeProductActivityNotificationChanges(
      getProductActivityChanges(previousProduct, product),
    );
    const primaryChange = changes[0] || null;
    const isVisibilityToggleActivity = isProductVisibilityToggleActivity(activityInput, changes);
    const notificationAudience =
      isVisibilityToggleActivity
        ? (actor.role === "employee" ? "admin" : "employees")
        : "";
    const targetUrl = activityContext === "inventory"
      ? createProductInventoryActivityTargetUrl(product, changes, activityInput)
      : isVisibilityToggleActivity
        ? createProductActivityListTargetUrl(product)
        : createProductActivityTargetUrl(product, changes);

    return {
      ...baseEntry,
      description: activityContext === "inventory"
        ? getProductInventoryStockActivityDescription(actor, product, previousProduct, changes)
        : getProductUpdatedActivityDescription(actor, product, previousProduct, changes),
      changeCount: changes.length,
      changeType: String(primaryChange?.type ?? "").trim(),
      changeLabel: primaryChange ? getProductActivityChangeLabel(primaryChange) : "",
      changeTarget: primaryChange ? getProductActivityChangeFocusTarget(primaryChange) : "",
      changeVariantId: String(primaryChange?.variantId ?? "").trim(),
      changeVariantName: String(primaryChange?.variantName ?? "").trim(),
      targetUrl,
      ...(notificationAudience
        ? { notificationAudience }
        : {}),
    };
  }

  return {
    ...baseEntry,
    title: "Product deleted",
    description: `${getProductActivityActorLabel(actor)} deleted ${name} from the ${category} category.`,
  };
}

function getActivityTargetPermission(activity) {
  const targetPermission = String(activity?.targetPermission ?? "").trim().toLowerCase();
  if (employeeAccessPermissionKeys.has(targetPermission)) {
    return targetPermission;
  }

  const type = String(activity?.type ?? "").trim().toLowerCase();
  const title = String(activity?.title ?? "").trim().toLowerCase();
  const action = String(activity?.action ?? "").trim().toLowerCase();
  if (type === "product" || title.includes("product") || ["created", "updated", "deleted"].includes(action)) {
    return "products";
  }

  if (title.includes("employee") || String(activity?.description ?? "").toLowerCase().includes("employee account")) {
    return "employee-data";
  }

  return "";
}

function normalizeActivityViewerFromRequestUrl(requestUrl) {
  const role = String(requestUrl.searchParams.get("viewerRole") ?? "").trim().toLowerCase() === "employee"
    ? "employee"
    : "admin";
  const accountId = String(requestUrl.searchParams.get("viewerAccountId") ?? "").trim();
  const accessPermissions = normalizeEmployeeAccessPermissions(
    requestUrl.searchParams.get("accessPermissions") ?? "",
  );
  let accessPermissionGrantedAt = {};
  try {
    const rawGrantMap = String(requestUrl.searchParams.get("accessPermissionGrantedAt") ?? "").trim();
    accessPermissionGrantedAt = rawGrantMap ? JSON.parse(rawGrantMap) : {};
  } catch (error) {
    accessPermissionGrantedAt = {};
  }

  return {
    role,
    accountId,
    accessPermissions,
    accessPermissionGrantedAt: normalizeEmployeeAccessPermissionGrantMap(
      accessPermissionGrantedAt,
      accessPermissions,
      "",
    ),
  };
}

function enrichActivityViewerFromAccounts(viewer, accounts) {
  if (viewer.role !== "employee") {
    return viewer;
  }

  const account = findActivityActorAccount(accounts, {
    role: "employee",
    accountId: viewer.accountId,
  });
  if (!account) {
    return viewer;
  }

  const accessPermissions = ensureRequiredEmployeeAccessPermissions(
    account.accessPermissions ?? viewer.accessPermissions,
    account.position,
  );

  return {
    ...viewer,
    accountId: String(account.employeeId ?? account.accountCode ?? account.id ?? viewer.accountId ?? "").trim(),
    accessPermissions,
    accessPermissionGrantedAt: normalizeEmployeeAccessPermissionGrantMap(
      account.accessPermissionGrantedAt ?? viewer.accessPermissionGrantedAt,
      accessPermissions,
      getEmployeeAccessGrantFallbackTimestamp(account),
    ),
  };
}

function getActivityCreatedTimeMs(activity) {
  const createdTime = new Date(activity?.createdAt ?? "").getTime();
  return Number.isFinite(createdTime) ? createdTime : null;
}

function canViewerSeeActivityAfterPermissionGrant(activity, viewer, targetPermission) {
  if (viewer.role !== "employee") {
    return true;
  }

  const activityTime = getActivityCreatedTimeMs(activity);
  if (activityTime === null) {
    return true;
  }

  const grantTimes = getEquivalentEmployeeAccessPermissionKeys(targetPermission)
    .filter((permission) => viewer.accessPermissions.includes(permission))
    .map((permission) =>
      new Date(
        normalizeIsoTimestamp(viewer.accessPermissionGrantedAt?.[permission], ""),
      ).getTime(),
    )
    .filter((time) => Number.isFinite(time));
  if (!grantTimes.length) {
    return true;
  }

  const grantTime = Math.min(...grantTimes);
  return activityTime >= grantTime;
}

function viewerHasActivityTargetPermission(viewer, targetPermission) {
  if (viewer.role !== "employee") {
    return true;
  }

  return getEquivalentEmployeeAccessPermissionKeys(targetPermission).some((permission) =>
    viewer.accessPermissions.includes(permission),
  );
}

function canActivityBeSeenByViewer(activity, viewer) {
  if (viewer.role !== "employee") {
    return true;
  }

  const targetPermission = getActivityTargetPermission(activity);
  if (!targetPermission || !viewerHasActivityTargetPermission(viewer, targetPermission)) {
    return false;
  }

  return canViewerSeeActivityAfterPermissionGrant(activity, viewer, targetPermission);
}

function getInventoryActivityTargetPathForViewer(viewer) {
  return viewer.role === "employee" ? "/employee_stock.html" : "/stock.html";
}

function resolveActivityTargetUrlForViewer(activity, viewer, targetPermission) {
  const targetUrl = String(activity?.targetUrl ?? "").trim();
  if (targetPermission === "products") {
    const productId = String(activity?.productId ?? "").trim();
    const action = String(activity?.action ?? "").trim().toLowerCase();
    const changeLabel = String(activity?.changeLabel ?? "").trim().toLowerCase();
    const changeTarget = String(activity?.changeTarget ?? "").trim().toLowerCase();
    let targetFocus = "";
    try {
      targetFocus = String(new URL(targetUrl, "http://gms.local").searchParams.get("focus") ?? "")
        .trim()
        .toLowerCase();
    } catch (error) {
      targetFocus = "";
    }

    if (
      productId
      && action === "updated"
      && (changeLabel === "visibility" || changeTarget === "visibility" || targetFocus === "visibility")
    ) {
      return createProductActivityListTargetUrl({ id: productId });
    }
  }

  if (!targetUrl || !isInventoryAccessPermission(targetPermission)) {
    return targetUrl;
  }

  try {
    const url = new URL(targetUrl, "http://gms.local");
    if (/^\/(?:stock|employee_stock)\.html$/i.test(url.pathname)) {
      url.pathname = getInventoryActivityTargetPathForViewer(viewer);
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch (error) {
    return targetUrl;
  }
}

function getProductActivityVerb(action) {
  if (action === "created") {
    return "added";
  }
  if (action === "deleted") {
    return "deleted";
  }
  return "updated";
}

function formatActivityForViewer(activity, viewer) {
  const normalizedActivity = { ...activity };
  const targetPermission = getActivityTargetPermission(normalizedActivity);
  normalizedActivity.targetUrl = resolveActivityTargetUrlForViewer(
    normalizedActivity,
    viewer,
    targetPermission,
  );
  const isProductActivity = targetPermission === "products";

  if (!isProductActivity) {
    return normalizedActivity;
  }

  if (!String(normalizedActivity.productName ?? "").trim()) {
    return normalizedActivity;
  }

  const actor = normalizeActivityActor(normalizedActivity.actor);
  const productName = String(normalizedActivity.productName ?? "").trim() || "Product";
  const category = String(normalizedActivity.category ?? "").trim() || "General";
  const verb = getProductActivityVerb(String(normalizedActivity.action ?? "").trim().toLowerCase());
  const isOwnAction = viewer.role === "employee" && isSameActivityActor(actor, viewer);
  const actorLabel = actor.role === "admin" ? "Admin" : actor.displayName || "Employee";
  const shouldShowActor = viewer.role === "employee" && !isOwnAction;
  const description = String(normalizedActivity.description ?? "").trim();

  return {
    ...normalizedActivity,
    title:
      normalizedActivity.action === "deleted"
        ? "Product deleted"
        : "Product update",
    description: description || (
      shouldShowActor
        ? `${actorLabel} ${verb} ${productName} in the ${category} category.`
        : `${productName} was ${verb} in the ${category} category.`
    ),
  };
}

function createDeliveryPartnerId(branch) {
  const safeStem = sanitizeFileStem(branch) || "delivery-partner";
  return `delivery-partner-${safeStem}-${Date.now()}`;
}

function createPaymentPartnerId(branch) {
  const safeStem = sanitizeFileStem(branch) || "payment-partner";
  return `payment-partner-${safeStem}-${Date.now()}`;
}

function normalizeDeliveryPartnerRecord(input, existingPartner = null) {
  const branch = String(input.branch ?? input.name ?? "")
    .replace(/\s+/g, " ")
    .trim();
  const description = String(input.description ?? "")
    .replace(/\s+/g, " ")
    .trim();
  const imageUrl = String(
    input.imageUrl ?? existingPartner?.imageUrl ?? "",
  ).trim();
  const isActive = normalizePartnerEnabledState({
    ...(existingPartner ?? {}),
    ...(input ?? {}),
  });

  if (branch.length < 2) {
    throw new Error("Branch must be at least 2 characters long.");
  }

  const providedId = String(input.id ?? existingPartner?.id ?? "").trim();

  return {
    id: providedId || createDeliveryPartnerId(branch),
    branch,
    description,
    imageUrl,
    isActive,
    enabled: isActive,
    status: isActive ? "active" : "inactive",
    createdAt: existingPartner?.createdAt ?? new Date().toISOString(),
  };
}

function normalizePaymentPartnerRecord(input, existingPartner = null) {
  const branch = String(input.branch ?? input.name ?? "")
    .replace(/\s+/g, " ")
    .trim();
  const imageUrl = String(
    input.imageUrl ?? existingPartner?.imageUrl ?? "",
  ).trim();
  const isActive = normalizePartnerEnabledState({
    ...(existingPartner ?? {}),
    ...(input ?? {}),
  });

  if (branch.length < 2) {
    throw new Error("Branch must be at least 2 characters long.");
  }

  const providedId = String(input.id ?? existingPartner?.id ?? "").trim();

  return {
    id: providedId || createPaymentPartnerId(branch),
    branch,
    imageUrl,
    isActive,
    enabled: isActive,
    status: isActive ? "active" : "inactive",
    createdAt: existingPartner?.createdAt ?? new Date().toISOString(),
  };
}

const ORDER_STAGE_VALUES = new Set([
  "toPay",
  "toPrepare",
  "toShip",
  "toReceive",
  "toReview",
  "returnRequest",
  "cancelled",
]);

function parseFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeOrderStage(value) {
  const normalizedValue = String(value ?? "").trim();
  return ORDER_STAGE_VALUES.has(normalizedValue) ? normalizedValue : "toPay";
}

function normalizeCancelRequestStatus(value) {
  const normalizedValue = String(value ?? "").trim().toLowerCase();
  if (
    normalizedValue === "pending" ||
    normalizedValue === "accepted" ||
    normalizedValue === "rejected"
  ) {
    return normalizedValue;
  }
  return "";
}

function isCodPaymentOption(value) {
  return String(value ?? "").trim().toLowerCase().startsWith("cod");
}

const MINIMUM_COD_PROCEED_PAYMENT = 500;

function requiredCodProceedPaymentFor(grandTotalAmount) {
  const normalizedGrandTotal = Math.max(parseFiniteNumber(grandTotalAmount, 0), 0);
  return Math.min(
    normalizedGrandTotal,
    Math.max(normalizedGrandTotal * 0.10, MINIMUM_COD_PROCEED_PAYMENT),
  );
}

function codPaidAmountFor(entry, remainingBalanceAmount) {
  const normalizedGrandTotal = Math.max(
    parseFiniteNumber(entry.grandTotalAmount, 0),
    0,
  );
  const normalizedRemainingBalance = Math.max(
    parseFiniteNumber(remainingBalanceAmount, 0),
    0,
  );
  return Math.max(normalizedGrandTotal - normalizedRemainingBalance, 0);
}

function codAmountStillNeededToProceed(entry, remainingBalanceAmount) {
  const requiredProceedPayment = requiredCodProceedPaymentFor(
    entry.grandTotalAmount,
  );
  const paidAmount = codPaidAmountFor(entry, remainingBalanceAmount);
  return Math.max(requiredProceedPayment - paidAmount, 0);
}

function normalizePendingOrderStage(entry) {
  if (entry.stage !== "toPay" && entry.stage !== "toPrepare") {
    return entry;
  }

  const remainingBalanceAmount = Math.max(
    parseFiniteNumber(entry.remainingBalanceAmount, 0),
    0,
  );
  const isCodOrder = isCodPaymentOption(entry.paymentOptionLabel);
  const explicitAmountToPay = Math.max(
    parseFiniteNumber(entry.amountToPayAmount, 0),
    0,
  );
  const nextAmountToPay = isCodOrder
    ? codAmountStillNeededToProceed(entry, remainingBalanceAmount)
    : explicitAmountToPay > 0.009
      ? explicitAmountToPay
      : remainingBalanceAmount;

  return {
    ...entry,
    stage: nextAmountToPay > 0.009 ? "toPay" : "toPrepare",
    amountToPayAmount: nextAmountToPay,
    remainingBalanceAmount,
  };
}

function normalizeInventoryMovementItems(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const productId = String(item?.productId ?? "").trim();
      const quantity = Math.max(0, Math.trunc(parseFiniteNumber(item?.quantity, 0)));
      const role = String(item?.role ?? (item?.isAddOn ? "addon" : "main"))
        .trim()
        .toLowerCase();
      const isAddOn = role === "addon" || item?.isAddOn === true;

      return {
        orderEntryId: String(item?.orderEntryId ?? item?.entryId ?? "").trim(),
        productId,
        productName: String(item?.productName ?? "").trim(),
        variantId: isAddOn ? "" : String(item?.variantId ?? "").trim(),
        variantName: isAddOn ? "" : String(item?.variantName ?? "").trim(),
        quantity,
        role: isAddOn ? "addon" : "main",
        parentProductId: String(item?.parentProductId ?? "").trim(),
        parentVariantId: String(item?.parentVariantId ?? "").trim(),
        adjustedVariant: item?.adjustedVariant === true,
      };
    })
    .filter((item) => item.productId && item.quantity > 0);
}

function buildInventoryMovementItemsFromOrderEntries(entries) {
  const movements = [];

  for (const entry of Array.isArray(entries) ? entries : []) {
    const orderEntryId = String(entry?.id ?? "").trim();
    const productId = String(entry?.productId ?? "").trim();
    const productName = String(entry?.productName ?? "").trim();
    const variantId = String(entry?.variantId ?? "").trim();
    const variantName = String(entry?.variantName ?? "").trim();
    const quantity = Math.max(1, Math.trunc(parseFiniteNumber(entry?.quantity, 1)));

    if (productId) {
      movements.push({
        orderEntryId,
        productId,
        productName,
        variantId,
        variantName,
        quantity,
        role: "main",
        parentProductId: "",
        parentVariantId: "",
        adjustedVariant: false,
      });
    }

    for (const addOn of Array.isArray(entry?.addOns) ? entry.addOns : []) {
      const addOnProductId = String(addOn?.id ?? "").trim();
      const addOnName = String(addOn?.name ?? "").trim();
      const addOnQuantity = Math.max(1, Math.trunc(parseFiniteNumber(addOn?.quantity, 1)));
      if (!addOnProductId) {
        continue;
      }

      movements.push({
        orderEntryId,
        productId: addOnProductId,
        productName: addOnName,
        variantId: "",
        variantName: "",
        quantity: quantity * addOnQuantity,
        role: "addon",
        parentProductId: productId,
        parentVariantId: variantId,
        adjustedVariant: false,
      });
    }
  }

  return movements;
}

function getInventoryMovementProductKey(productId) {
  return String(productId ?? "").trim().toLowerCase();
}

function getInventoryMovementVariantKey(productId, variant) {
  const normalizedProductId = getInventoryMovementProductKey(productId);
  const normalizedVariantId = String(variant?.variantId ?? "").trim().toLowerCase();
  const normalizedVariantName = String(variant?.variantName ?? "").trim().toLowerCase();
  if (!normalizedProductId || (!normalizedVariantId && !normalizedVariantName)) {
    return "";
  }

  return `${normalizedProductId}::${normalizedVariantId || normalizedVariantName}`;
}

function findProductVariantIndex(product, variantId, variantName) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const normalizedVariantId = String(variantId ?? "").trim().toLowerCase();
  const normalizedVariantName = String(variantName ?? "").trim().toLowerCase();

  if (normalizedVariantId) {
    const index = variants.findIndex(
      (variant) => String(variant?.id ?? "").trim().toLowerCase() === normalizedVariantId,
    );
    if (index >= 0) {
      return index;
    }
  }

  if (normalizedVariantName) {
    return variants.findIndex(
      (variant) => String(variant?.name ?? "").trim().toLowerCase() === normalizedVariantName,
    );
  }

  return -1;
}

function applyInventoryMovementToProducts(products, rawMovements, direction) {
  const normalizedDirection = direction === "restore" ? "restore" : "deduct";
  const movements = normalizeInventoryMovementItems(rawMovements);
  if (!movements.length) {
    return { products, movements: [] };
  }

  const productTotals = new Map();
  for (const movement of movements) {
    const productKey = getInventoryMovementProductKey(movement.productId);
    productTotals.set(productKey, (productTotals.get(productKey) || 0) + movement.quantity);
  }

  const updatedAt = new Date().toISOString();
  const adjustedVariantKeys = new Set();
  let didUpdateProducts = false;

  const nextProducts = products.map((product) => {
    const productId = String(product?.id ?? "").trim();
    const productKey = getInventoryMovementProductKey(productId);
    const productQuantity = productTotals.get(productKey) || 0;
    const relevantVariantMovements = movements.filter((movement) => {
      if (getInventoryMovementProductKey(movement.productId) !== productKey) {
        return false;
      }
      if (!movement.variantId && !movement.variantName) {
        return false;
      }
      return normalizedDirection === "restore" ? movement.adjustedVariant === true : true;
    });

    if (!productQuantity && !relevantVariantMovements.length) {
      return product;
    }

    const currentStock = getNormalizedProductInventoryStock(product, 0);
    if (normalizedDirection === "deduct" && currentStock < productQuantity) {
      throw new Error(`Insufficient stock for product ${productId || "unknown"}.`);
    }

    const nextStock =
      normalizedDirection === "restore"
        ? currentStock + productQuantity
        : currentStock - productQuantity;

    let nextProduct = productQuantity
      ? {
          ...product,
          stock: nextStock,
          inventoryStock: nextStock,
          lastStockDeductedQuantity:
            normalizedDirection === "deduct"
              ? productQuantity
              : normalizeOptionalWholeNumber(product?.lastStockDeductedQuantity, 0),
          lastStockReturnedQuantity:
            normalizedDirection === "restore"
              ? productQuantity
              : normalizeOptionalWholeNumber(product?.lastStockReturnedQuantity, 0),
          updatedAt,
        }
      : product;

    if (relevantVariantMovements.length && Array.isArray(nextProduct?.variants)) {
      const variantTotals = new Map();
      for (const movement of relevantVariantMovements) {
        const variantIndex = findProductVariantIndex(
          nextProduct,
          movement.variantId,
          movement.variantName,
        );
        if (variantIndex < 0) {
          continue;
        }

        variantTotals.set(variantIndex, (variantTotals.get(variantIndex) || 0) + movement.quantity);
      }

      if (variantTotals.size) {
        const nextVariants = nextProduct.variants.map((variant, variantIndex) => {
          const variantQuantity = variantTotals.get(variantIndex) || 0;
          if (!variantQuantity) {
            return variant;
          }

          const currentVariantStock = normalizeOptionalWholeNumber(variant?.stock, 0);
          if (normalizedDirection === "deduct") {
            if (currentVariantStock <= 0) {
              return variant;
            }
            if (currentVariantStock < variantQuantity) {
              throw new Error(
                `Insufficient stock for variant ${String(variant?.name || variant?.id || "").trim() || "unknown"}.`,
              );
            }

            adjustedVariantKeys.add(
              getInventoryMovementVariantKey(productId, {
                variantId: variant?.id,
                variantName: variant?.name,
              }),
            );
            return {
              ...variant,
              stock: currentVariantStock - variantQuantity,
            };
          }

          return {
            ...variant,
            stock: currentVariantStock + variantQuantity,
          };
        });

        nextProduct = {
          ...nextProduct,
          variants: nextVariants,
          updatedAt,
        };
      }
    }

    didUpdateProducts = true;
    return nextProduct;
  });

  if (normalizedDirection === "deduct") {
    return {
      products: didUpdateProducts ? nextProducts : products,
      movements: movements.map((movement) => ({
        ...movement,
        adjustedVariant:
          adjustedVariantKeys.has(getInventoryMovementVariantKey(movement.productId, movement)),
      })),
    };
  }

  return {
    products: didUpdateProducts ? nextProducts : products,
    movements,
  };
}

function orderEntryHasActiveInventoryDeduction(entry) {
  if (entry?.inventoryRestoredAtEpochMs > 0) {
    return false;
  }

  if (entry?.inventoryDeducted === true || entry?.inventoryDeductedAtEpochMs > 0) {
    return true;
  }

  const stage = String(entry?.stage ?? "").trim();
  return (
    stage === "toShip" ||
    stage === "toReceive" ||
    stage === "toReview" ||
    stage === "returnRequest"
  );
}

function buildInventoryRestoreMovementsForOrderEntries(entries) {
  const movements = [];

  for (const entry of Array.isArray(entries) ? entries : []) {
    if (!orderEntryHasActiveInventoryDeduction(entry)) {
      continue;
    }

    const storedMovements = normalizeInventoryMovementItems(entry?.inventoryMovements);
    if (storedMovements.length) {
      movements.push(...storedMovements);
      continue;
    }

    // Legacy packed orders did not store movement metadata. Restore product/add-on
    // stock, but do not invent variant stock movement for those old records.
    movements.push(
      ...buildInventoryMovementItemsFromOrderEntries([entry]).map((movement) => ({
        ...movement,
        adjustedVariant: false,
      })),
    );
  }

  return movements;
}

function normalizeStoredOrderEntry(input) {
  if (!input || typeof input !== "object") {
    throw new Error("Each order entry must be an object.");
  }

  const id = String(input.id ?? "").trim();
  const accountId = String(
    input.accountId ??
      input.customerAccountId ??
      input.userAccountId ??
      input.userId ??
      input.uid ??
      input.accountEmail ??
      input.userEmail ??
      input.email ??
      "",
  ).trim();
  const productId = String(input.productId ?? "").trim();
  const productName = String(input.productName ?? "").trim();

  if (!id || !productId || !productName) {
    throw new Error("Each order entry requires id, productId, and productName.");
  }

  const paymentOptionLabel = String(
    input.paymentOptionLabel ?? input.payment ?? input.paymentMethod ?? "",
  ).trim();
  const paymentPartnerName = String(
    input.paymentPartnerName ?? input.paymentMethod ?? input.paymentProvider ?? "",
  ).trim();
  const deliveryPartnerName = String(
    input.deliveryPartnerName ?? input.deliveryPartner ?? input.deliveryMethod ?? input.deliveryProvider ?? input.courier ?? "",
  ).trim();
  const clientName = String(
    input.clientName ?? input.customerName ?? input.customer ?? "",
  ).trim();
  const clientContactNumber = String(
    input.clientContactNumber ?? input.contactNumber ?? input.clientContact ?? "",
  ).trim();
  const clientAddress = String(
    input.clientAddress ?? input.address ?? input.deliveryAddress ?? "",
  ).trim();
  const normalizedStage = normalizeOrderStage(input.stage ?? input.status);
  const cancelRequestStatus = normalizeCancelRequestStatus(
    input.cancelRequestStatus,
  );
  const cancelRequestReason = String(input.cancelRequestReason ?? "").trim();
  const cancelRequestSubmittedAtEpochMs = Math.trunc(
    parseFiniteNumber(input.cancelRequestSubmittedAtEpochMs, 0),
  );
  const cancelRequestResolvedAtEpochMs = Math.trunc(
    parseFiniteNumber(input.cancelRequestResolvedAtEpochMs, 0),
  );
  const inventoryDeductedAtEpochMs = Math.trunc(
    parseFiniteNumber(input.inventoryDeductedAtEpochMs, 0),
  );
  const inventoryRestoredAtEpochMs = Math.trunc(
    parseFiniteNumber(input.inventoryRestoredAtEpochMs, 0),
  );
  const inventoryMovements = normalizeInventoryMovementItems(input.inventoryMovements);
  const hasInventoryDeduction =
    input.inventoryDeducted === true || inventoryDeductedAtEpochMs > 0;
  const inventoryDeducted =
    inventoryRestoredAtEpochMs > 0 ? false : hasInventoryDeduction;
  const productRating = Math.max(
    0,
    Math.min(5, parseFiniteNumber(input.productRating, 0)),
  );
  const productReviewRating = Math.max(
    0,
    Math.min(
      5,
      parseFiniteNumber(
        input.productReviewRating,
        input.productRatedAtEpochMs || String(input.productReviewComment ?? "").trim()
          ? productRating
          : 0,
      ),
    ),
  );
  const productRatedAtEpochMs = Math.trunc(
    parseFiniteNumber(input.productRatedAtEpochMs, 0),
  );
  const productReviewComment = String(input.productReviewComment ?? "").trim();
  const productReviewMedia = getOrderEntryProductReviewMedia(input);
  const productReviewReply = String(
    input.productReviewReply ??
      input.sellerReviewReply ??
      input.reviewReply ??
      input.sellerReply?.message ??
      input.sellerReply?.text ??
      "",
  ).trim();
  const productReviewReplyCreatedAtEpochMs = normalizeProductReviewEpochMs(
    input.productReviewReplyCreatedAtEpochMs ??
      input.sellerReplyCreatedAtEpochMs ??
      input.sellerReply?.createdAtEpochMs,
    input.productReviewReplyCreatedAt ??
      input.sellerReplyCreatedAt ??
      input.sellerReply?.createdAt,
  );
  const productReviewReplyUpdatedAtEpochMs = normalizeProductReviewEpochMs(
    input.productReviewReplyUpdatedAtEpochMs ??
      input.sellerReplyUpdatedAtEpochMs ??
      input.sellerReply?.updatedAtEpochMs,
    input.productReviewReplyUpdatedAt ??
      input.sellerReplyUpdatedAt ??
      input.sellerReply?.updatedAt,
  );
  const createdAtEpochMs = Math.trunc(
    parseFiniteNumber(
      input.createdAtEpochMs,
      Date.parse(String(input.createdAt ?? "").trim()) || Date.now(),
    ),
  );
  const grandTotalAmount = parseFiniteNumber(
    input.grandTotalAmount ?? input.amount ?? input.total ?? input.price,
    0,
  );
  const addOns = Array.isArray(input.addOns)
    ? input.addOns
        .map((addOn) => ({
          id: String(addOn?.id ?? "").trim(),
          name: String(addOn?.name ?? "").trim(),
          quantity: Math.max(1, Math.trunc(parseFiniteNumber(addOn?.quantity, 1))),
        }))
        .filter((addOn) => addOn.id && addOn.name)
    : [];

  return normalizePendingOrderStage({
    id,
    adminId: getRecordAdminId(input),
    accountId,
    productId,
    productName,
    productImageUrl: String(input.productImageUrl ?? "").trim(),
    variantId: String(input.variantId ?? "").trim(),
    variantName: String(input.variantName ?? "").trim(),
    addOns,
    quantity: Math.max(1, Math.trunc(parseFiniteNumber(input.quantity, 1))),
    unitPrice: parseFiniteNumber(input.unitPrice, 0),
    stage: normalizedStage,
    createdAtEpochMs,
    grandTotalAmount,
    amountToPayAmount: parseFiniteNumber(input.amountToPayAmount, 0),
    remainingBalanceAmount: parseFiniteNumber(input.remainingBalanceAmount, 0),
    shippingFeeAmount: parseFiniteNumber(input.shippingFeeAmount, 0),
    paymentOptionLabel,
    paymentPartnerName,
    paymentPartnerImageUrl: String(input.paymentPartnerImageUrl ?? "").trim(),
    deliveryPartnerName,
    deliveryPartnerImageUrl: String(input.deliveryPartnerImageUrl ?? "").trim(),
    clientName,
    clientContactNumber,
    clientAddress,
    cancelRequestStatus,
    cancelRequestReason,
    cancelRequestSubmittedAtEpochMs,
    cancelRequestResolvedAtEpochMs,
    inventoryDeducted,
    inventoryDeductedAtEpochMs,
    inventoryRestoredAtEpochMs,
    inventoryMovements,
    productRating,
    productReviewRating,
    productRatedAtEpochMs,
    productReviewComment,
    productReviewMedia,
    productReviewReply,
    productReviewReplyAuthor: String(
      input.productReviewReplyAuthor ??
        input.sellerReplyAuthor ??
        input.sellerReply?.author ??
        "",
    ).trim(),
    productReviewReplyCompanyName: String(
      input.productReviewReplyCompanyName ??
        input.sellerReplyCompanyName ??
        input.sellerReply?.companyName ??
        "",
    ).trim(),
    productReviewReplyCompanyPictureUrl: String(
      input.productReviewReplyCompanyPictureUrl ??
        input.sellerReplyCompanyPictureUrl ??
        input.sellerReply?.companyPictureUrl ??
        "",
    ).trim(),
    productReviewReplyCreatedAtEpochMs,
    productReviewReplyUpdatedAtEpochMs,
    productReviewReplyCreatedAt:
      productReviewReplyCreatedAtEpochMs > 0
        ? new Date(productReviewReplyCreatedAtEpochMs).toISOString()
        : "",
    productReviewReplyUpdatedAt:
      productReviewReplyUpdatedAtEpochMs > 0
        ? new Date(productReviewReplyUpdatedAtEpochMs).toISOString()
        : "",
    customerName: clientName,
    contactNumber: clientContactNumber,
    address: clientAddress,
    courier: deliveryPartnerName,
    deliveryProvider: deliveryPartnerName,
    payment: paymentOptionLabel || paymentPartnerName,
    paymentMethod: paymentPartnerName || paymentOptionLabel,
    amount: grandTotalAmount,
    total: grandTotalAmount,
    price: grandTotalAmount,
    status: normalizedStage,
    createdAt:
      createdAtEpochMs > 0 ? new Date(createdAtEpochMs).toISOString() : "",
  });
}

function normalizeOrderEntriesPayload(payload, adminId = "") {
  const rawOrders = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.orders)
      ? payload.orders
      : null;

  if (!rawOrders) {
    throw new Error("Orders payload must include an orders array.");
  }

  const normalizedAdminId = normalizeAdminTenantId(adminId, "");
  return rawOrders
    .map((entry) => {
      const normalizedEntry = normalizeStoredOrderEntry(entry);
      return normalizedAdminId
        ? applyAdminId(normalizedEntry, normalizedAdminId)
        : normalizedEntry;
    })
    .filter((entry) => isRealOrderAccountId(entry.accountId));
}

function sortStoredOrderEntries(entries) {
  return [...entries].sort((left, right) => {
    const createdAtDifference =
      Math.trunc(parseFiniteNumber(right?.createdAtEpochMs, 0)) -
      Math.trunc(parseFiniteNumber(left?.createdAtEpochMs, 0));
    if (createdAtDifference !== 0) {
      return createdAtDifference;
    }

    return String(left?.id ?? "").localeCompare(String(right?.id ?? ""));
  });
}

function mergeStoredOrderEntries(existingOrders, incomingOrders) {
  const mergedById = new Map();
  const existingById = new Map();

  for (const entry of existingOrders) {
    const normalizedId = String(entry?.id ?? "").trim();
    if (normalizedId) {
      existingById.set(normalizedId, entry);
    }
  }

  for (const entry of incomingOrders) {
    mergedById.set(
      entry.id,
      mergeOrderEntrySellerReviewReply(existingById.get(entry.id), entry),
    );
  }

  for (const entry of existingOrders) {
    const normalizedId = String(entry?.id ?? "").trim();
    if (!normalizedId || mergedById.has(normalizedId)) {
      continue;
    }

    try {
      mergedById.set(normalizedId, normalizeStoredOrderEntry(entry));
    } catch (error) {
      // Skip malformed legacy records instead of blocking newer orders.
    }
  }

  return sortStoredOrderEntries([...mergedById.values()]);
}

function hasOrderEntrySellerReviewReply(entry) {
  return Boolean(
    String(
      entry?.productReviewReply ??
        entry?.sellerReviewReply ??
        entry?.reviewReply ??
        entry?.sellerReply?.message ??
        entry?.sellerReply?.text ??
        "",
    ).trim(),
  );
}

function mergeOrderEntrySellerReviewReply(existingEntry, incomingEntry) {
  if (!hasOrderEntrySellerReviewReply(existingEntry) || hasOrderEntrySellerReviewReply(incomingEntry)) {
    return incomingEntry;
  }

  return {
    ...incomingEntry,
    productReviewReply: String(existingEntry?.productReviewReply ?? "").trim(),
    productReviewReplyAuthor: String(existingEntry?.productReviewReplyAuthor ?? "").trim(),
    productReviewReplyCompanyName: String(existingEntry?.productReviewReplyCompanyName ?? "").trim(),
    productReviewReplyCompanyPictureUrl: String(
      existingEntry?.productReviewReplyCompanyPictureUrl ?? "",
    ).trim(),
    productReviewReplyCreatedAtEpochMs: Math.trunc(
      parseFiniteNumber(existingEntry?.productReviewReplyCreatedAtEpochMs, 0),
    ),
    productReviewReplyUpdatedAtEpochMs: Math.trunc(
      parseFiniteNumber(existingEntry?.productReviewReplyUpdatedAtEpochMs, 0),
    ),
    productReviewReplyCreatedAt: String(existingEntry?.productReviewReplyCreatedAt ?? "").trim(),
    productReviewReplyUpdatedAt: String(existingEntry?.productReviewReplyUpdatedAt ?? "").trim(),
  };
}

function normalizeProductCommentCount(value) {
  const count = Math.trunc(parseFiniteNumber(value, 0));
  return Number.isFinite(count) && count > 0 ? count : 0;
}

function normalizeProductRatingCount(value) {
  const count = Math.trunc(parseFiniteNumber(value, 0));
  return Number.isFinite(count) && count > 0 ? count : 0;
}

function normalizeProductRatingPoints(value) {
  const points = parseFiniteNumber(value, 0);
  return Number.isFinite(points) && points > 0 ? points : 0;
}

function normalizeProductReviewRating(value) {
  const rating = parseFiniteNumber(value, 0);
  return Number.isFinite(rating) && rating > 0
    ? Math.max(0, Math.min(5, rating))
    : 0;
}

function normalizeProductAggregateRating(value) {
  const rating = normalizeProductReviewRating(value);
  return rating > 0 ? Number(rating.toFixed(4)) : 0;
}

function inferProductReviewMediaType(media) {
  const type = String(media?.type ?? media?.mediaType ?? media?.kind ?? "")
    .trim()
    .toLowerCase();
  const contentType = String(media?.contentType ?? media?.mimeType ?? "")
    .trim()
    .toLowerCase();
  const url = String(media?.url ?? media?.mediaUrl ?? media?.imageUrl ?? media?.videoUrl ?? "")
    .trim()
    .toLowerCase()
    .split("?")[0];

  if (type.includes("video") || contentType.startsWith("video/")) {
    return "video";
  }
  if (type.includes("image") || type.includes("photo") || contentType.startsWith("image/")) {
    return "image";
  }
  if (/\.(mp4|mov|m4v|webm|avi|mkv|3gp)$/i.test(url)) {
    return "video";
  }
  return "image";
}

function normalizeProductReviewMediaItems(...values) {
  const seenUrls = new Set();
  const mediaItems = [];

  function flattenMediaValues(value) {
    if (Array.isArray(value)) {
      return value.flatMap(flattenMediaValues);
    }
    if (value === null || value === undefined || value === "") {
      return [];
    }
    return [value];
  }

  const rawItems = values.flatMap(flattenMediaValues);

  for (const rawItem of rawItems) {
    const item = typeof rawItem === "string" ? { url: rawItem } : rawItem;
    if (!item || typeof item !== "object") {
      continue;
    }

    const url = String(
      item.url ?? item.mediaUrl ?? item.src ?? item.imageUrl ?? item.videoUrl ?? "",
    ).trim();
    if (!url) {
      continue;
    }

    const dedupeKey = url.toLowerCase();
    if (seenUrls.has(dedupeKey)) {
      continue;
    }
    seenUrls.add(dedupeKey);

    const type = inferProductReviewMediaType({ ...item, url });
    const contentType = String(item.contentType ?? item.mimeType ?? "")
      .trim()
      .toLowerCase();
    const uploadedAtEpochMs = normalizeProductReviewEpochMs(
      item.uploadedAtEpochMs ?? item.createdAtEpochMs,
      item.uploadedAt ?? item.createdAt ?? "",
    );

    mediaItems.push({
      id: String(item.id ?? `${type}-${mediaItems.length + 1}`).trim(),
      type,
      url,
      mediaUrl: url,
      imageUrl: type === "image" ? url : "",
      videoUrl: type === "video" ? url : "",
      fileName: String(item.fileName ?? item.name ?? "").trim(),
      contentType,
      sizeBytes: Math.max(0, Math.trunc(parseFiniteNumber(item.sizeBytes ?? item.size, 0))),
      uploadedAtEpochMs,
      uploadedAt: uploadedAtEpochMs > 0 ? new Date(uploadedAtEpochMs).toISOString() : "",
    });
  }

  return mediaItems;
}

function getOrderEntryProductReviewMedia(entry) {
  return normalizeProductReviewMediaItems(
    entry?.productReviewMedia,
    entry?.reviewMedia,
    entry?.reviewMediaItems,
    entry?.reviewAttachments,
    entry?.productReviewAttachments,
    entry?.productReviewMediaUrls,
    entry?.productReviewImageUrls,
    entry?.productReviewVideoUrls,
  );
}

function hasProductReviewComment(entry) {
  const productId = String(entry?.productId ?? "").trim();
  const reviewRating = normalizeProductReviewRating(entry?.productReviewRating);
  const reviewComment = String(entry?.productReviewComment ?? "").trim();
  const reviewMedia = getOrderEntryProductReviewMedia(entry);
  return Boolean(productId && reviewRating > 0 && (reviewComment || reviewMedia.length));
}

function hasProductReviewRating(entry) {
  const productId = String(entry?.productId ?? "").trim();
  const reviewRating = normalizeProductReviewRating(entry?.productReviewRating);
  return Boolean(productId && reviewRating > 0);
}

function getProductCommentCountKey(record, productId) {
  return `${getRecordAdminId(record)}::${String(productId ?? "").trim()}`;
}

function getProductReviewProductOnlyKey(productId) {
  return `*::${String(productId ?? "").trim()}`;
}

function getProductReviewAggregateKey(record, productId) {
  return getProductCommentCountKey(record, productId);
}

function createEmptyProductReviewAggregate(productId = "", adminId = "") {
  return {
    productId: String(productId ?? "").trim(),
    adminId: normalizeAdminTenantId(adminId, ""),
    ratingPoints: 0,
    ratingCount: 0,
    commentCount: 0,
    comments: [],
    ratingBreakdown: {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    },
  };
}

function cloneProductReviewAggregate(aggregate) {
  const nextAggregate = createEmptyProductReviewAggregate(
    aggregate?.productId,
    aggregate?.adminId,
  );
  nextAggregate.ratingPoints = normalizeProductRatingPoints(aggregate?.ratingPoints);
  nextAggregate.ratingCount = normalizeProductRatingCount(aggregate?.ratingCount);
  nextAggregate.commentCount = normalizeProductCommentCount(aggregate?.commentCount);
  nextAggregate.comments = Array.isArray(aggregate?.comments)
    ? aggregate.comments.map((comment) => ({ ...comment }))
    : [];
  for (const star of [1, 2, 3, 4, 5]) {
    nextAggregate.ratingBreakdown[star] = normalizeProductCommentCount(
      aggregate?.ratingBreakdown?.[star],
    );
  }
  return nextAggregate;
}

function mergeProductReviewAggregate(target, source) {
  if (!target || !source) {
    return target;
  }

  target.ratingPoints += normalizeProductRatingPoints(source.ratingPoints);
  target.ratingCount += normalizeProductRatingCount(source.ratingCount);
  target.commentCount += normalizeProductCommentCount(source.commentCount);
  if (Array.isArray(source.comments) && source.comments.length) {
    target.comments.push(...source.comments.map((comment) => ({ ...comment })));
  }
  for (const star of [1, 2, 3, 4, 5]) {
    target.ratingBreakdown[star] =
      normalizeProductCommentCount(target.ratingBreakdown[star]) +
      normalizeProductCommentCount(source.ratingBreakdown?.[star]);
  }
  return target;
}

function getProductReviewAggregateRating(aggregate) {
  const ratingCount = normalizeProductRatingCount(aggregate?.ratingCount);
  if (ratingCount <= 0) {
    return 0;
  }
  return normalizeProductAggregateRating(
    normalizeProductRatingPoints(aggregate?.ratingPoints) / ratingCount,
  );
}

function getProductReviewAuthor(entry) {
  return [
    entry?.clientName,
    entry?.customerName,
    entry?.customer,
    entry?.accountName,
    entry?.accountId,
  ]
    .map((value) => String(value ?? "").trim())
    .find(Boolean) || "Verified Buyer";
}

function getProductReviewTitle(rating) {
  const normalizedRating = normalizeProductReviewRating(rating);
  if (normalizedRating >= 4.5) {
    return "Excellent product experience";
  }
  if (normalizedRating >= 4) {
    return "Great product experience";
  }
  if (normalizedRating >= 3) {
    return "Good product experience";
  }
  return "Customer product review";
}

function getProductReviewDefaultCommentForRating(rating) {
  const normalizedRating = normalizeProductReviewRating(rating);
  if (normalizedRating <= 0) {
    return "";
  }

  switch (Math.max(1, Math.min(5, Math.round(normalizedRating)))) {
    case 1:
      return "Very Bad";
    case 2:
      return "Bad";
    case 3:
      return "Good";
    case 4:
      return "Very Good";
    case 5:
      return "Excellent";
    default:
      return "";
  }
}

function resolveProductReviewCommentMessage(comment, rating) {
  const normalizedComment = String(comment ?? "").trim();
  if (normalizedComment) {
    return normalizedComment;
  }

  return getProductReviewDefaultCommentForRating(rating);
}

function normalizeProductReviewSellerReply(value, fallback = {}) {
  const rawReply =
    value && typeof value === "object"
      ? value
      : {
          message: value,
        };
  const message = String(
    rawReply?.message ??
      rawReply?.reply ??
      rawReply?.text ??
      rawReply?.comment ??
      fallback?.message ??
      "",
  ).trim();
  if (!message) {
    return null;
  }

  const createdAtEpochMs = normalizeProductReviewEpochMs(
    rawReply?.createdAtEpochMs ??
      rawReply?.repliedAtEpochMs ??
      fallback?.createdAtEpochMs,
    rawReply?.createdAt ?? rawReply?.repliedAt ?? fallback?.createdAt,
  );
  const updatedAtEpochMs = normalizeProductReviewEpochMs(
    rawReply?.updatedAtEpochMs ??
      rawReply?.editedAtEpochMs ??
      fallback?.updatedAtEpochMs,
    rawReply?.updatedAt ?? rawReply?.editedAt ?? fallback?.updatedAt,
  );
  const createdAt =
    createdAtEpochMs > 0
      ? new Date(createdAtEpochMs).toISOString()
      : String(rawReply?.createdAt ?? rawReply?.repliedAt ?? fallback?.createdAt ?? "").trim();
  const updatedAt =
    updatedAtEpochMs > 0
      ? new Date(updatedAtEpochMs).toISOString()
      : String(rawReply?.updatedAt ?? rawReply?.editedAt ?? fallback?.updatedAt ?? createdAt).trim();
  const companyName = String(
    rawReply?.companyName ??
      rawReply?.storeName ??
      rawReply?.businessName ??
      fallback?.companyName ??
      "",
  ).trim();
  const companyPictureUrl = String(
    rawReply?.companyPictureUrl ??
      rawReply?.companyProfileImageUrl ??
      rawReply?.profileImageUrl ??
      rawReply?.logoUrl ??
      fallback?.companyPictureUrl ??
      "",
  ).trim();
  const author = String(
    rawReply?.author ??
      rawReply?.sellerName ??
      rawReply?.companyName ??
      fallback?.author ??
      companyName ??
      "",
  ).trim();

  return {
    message,
    text: message,
    comment: message,
    author,
    sellerName: author,
    companyName,
    storeName: companyName,
    businessName: companyName,
    companyPictureUrl,
    profileImageUrl: companyPictureUrl,
    createdAtEpochMs,
    updatedAtEpochMs,
    createdAt,
    updatedAt,
    repliedAt: createdAt,
  };
}

function getProductReviewSellerReplyFromOrder(entry) {
  return normalizeProductReviewSellerReply(
    {
      message:
        entry?.productReviewReply ??
        entry?.sellerReviewReply ??
        entry?.reviewReply ??
        entry?.sellerReply?.message ??
        entry?.sellerReply?.text,
      author:
        entry?.productReviewReplyAuthor ??
        entry?.sellerReplyAuthor ??
        entry?.sellerReply?.author,
      companyName:
        entry?.productReviewReplyCompanyName ??
        entry?.sellerReplyCompanyName ??
        entry?.sellerReply?.companyName,
      companyPictureUrl:
        entry?.productReviewReplyCompanyPictureUrl ??
        entry?.sellerReplyCompanyPictureUrl ??
        entry?.sellerReply?.companyPictureUrl,
      createdAtEpochMs:
        entry?.productReviewReplyCreatedAtEpochMs ??
        entry?.sellerReplyCreatedAtEpochMs ??
        entry?.sellerReply?.createdAtEpochMs,
      updatedAtEpochMs:
        entry?.productReviewReplyUpdatedAtEpochMs ??
        entry?.sellerReplyUpdatedAtEpochMs ??
        entry?.sellerReply?.updatedAtEpochMs,
      createdAt:
        entry?.productReviewReplyCreatedAt ??
        entry?.sellerReplyCreatedAt ??
        entry?.sellerReply?.createdAt,
      updatedAt:
        entry?.productReviewReplyUpdatedAt ??
        entry?.sellerReplyUpdatedAt ??
        entry?.sellerReply?.updatedAt,
    },
  );
}

function normalizeProductReviewEpochMs(value, fallback = 0) {
  const numericValue = Math.trunc(parseFiniteNumber(value, 0));
  if (Number.isFinite(numericValue) && numericValue > 0) {
    return numericValue;
  }

  const parsedFallback = Date.parse(String(fallback ?? "").trim());
  if (Number.isFinite(parsedFallback) && parsedFallback > 0) {
    return parsedFallback;
  }

  const fallbackNumber = Math.trunc(parseFiniteNumber(fallback, 0));
  return Number.isFinite(fallbackNumber) && fallbackNumber > 0 ? fallbackNumber : 0;
}

function getProductReviewCommentIdFromOrder(entry, productId) {
  const ratedAtEpochMs = normalizeProductReviewEpochMs(
    entry?.productRatedAtEpochMs,
    entry?.createdAtEpochMs || entry?.createdAt,
  );
  return String(
    entry?.id
      ? `${entry.id}:${ratedAtEpochMs || "review"}`
      : `${productId}:${ratedAtEpochMs || Date.now()}`,
  );
}

function createProductReviewCommentFromOrder(entry, productId, rating, comment) {
  const ratedAtEpochMs = normalizeProductReviewEpochMs(
    entry?.productRatedAtEpochMs,
    entry?.createdAtEpochMs || entry?.createdAt,
  );
  const reviewer = getProductReviewAuthor(entry);
  const createdAt = ratedAtEpochMs > 0 ? new Date(ratedAtEpochMs).toISOString() : "";
  const media = getOrderEntryProductReviewMedia(entry);
  const message = resolveProductReviewCommentMessage(comment, rating);
  const sellerReply = getProductReviewSellerReplyFromOrder(entry);

  return {
    id: getProductReviewCommentIdFromOrder(entry, productId),
    orderId: String(entry?.id ?? "").trim(),
    productId,
    adminId: getRecordAdminId(entry),
    reviewer,
    author: reviewer,
    user: reviewer,
    title: getProductReviewTitle(rating),
    message,
    comment: message,
    text: message,
    media,
    reviewMedia: media,
    mediaUrls: media.map((item) => item.url),
    imageUrls: media.filter((item) => item.type === "image").map((item) => item.url),
    videoUrls: media.filter((item) => item.type === "video").map((item) => item.url),
    sellerReply,
    reply: sellerReply,
    sellerReplyMessage: sellerReply?.message ?? "",
    rating,
    createdAtEpochMs: ratedAtEpochMs,
    createdAt,
    date: createdAt,
    dateLabel: createdAt,
    likeCount: 0,
    commentCount: sellerReply ? 1 : 0,
    replyCount: sellerReply ? 1 : 0,
  };
}

function normalizeStoredProductReviewComment(comment, index = 0) {
  if (!comment || typeof comment !== "object") {
    return null;
  }

  const rating = normalizeProductReviewRating(comment.rating);
  const message = resolveProductReviewCommentMessage(
    comment.message ?? comment.comment ?? comment.text ?? comment.review ?? "",
    rating,
  );
  const media = normalizeProductReviewMediaItems(
    comment.media,
    comment.reviewMedia,
    comment.mediaItems,
    comment.attachments,
    comment.mediaUrls,
    comment.imageUrls,
    comment.videoUrls,
  );
  if (!message && !media.length) {
    return null;
  }

  const reviewer = [
    comment.reviewer,
    comment.author,
    comment.user,
    comment.userName,
    comment.customerName,
  ]
    .map((value) => String(value ?? "").trim())
    .find(Boolean) || "Verified Buyer";
  const createdAtEpochMs = normalizeProductReviewEpochMs(
    comment.createdAtEpochMs ?? comment.ratedAtEpochMs,
    comment.createdAt ?? comment.date ?? comment.dateLabel,
  );
  const createdAt = createdAtEpochMs > 0
    ? new Date(createdAtEpochMs).toISOString()
    : String(comment.createdAt ?? comment.date ?? "").trim();
  const sellerReply = normalizeProductReviewSellerReply(
    comment.sellerReply ??
      comment.reply ??
      comment.sellerResponse ??
      comment.response,
    {
      message: comment.sellerReplyMessage ?? comment.replyMessage,
      author: comment.sellerReplyAuthor ?? comment.replyAuthor,
      companyName:
        comment.sellerReplyCompanyName ??
        comment.replyCompanyName ??
        comment.companyName,
      companyPictureUrl:
        comment.sellerReplyCompanyPictureUrl ??
        comment.replyCompanyPictureUrl ??
        comment.companyPictureUrl,
      createdAtEpochMs:
        comment.sellerReplyCreatedAtEpochMs ??
        comment.replyCreatedAtEpochMs,
      updatedAtEpochMs:
        comment.sellerReplyUpdatedAtEpochMs ??
        comment.replyUpdatedAtEpochMs,
      createdAt: comment.sellerReplyCreatedAt ?? comment.replyCreatedAt,
      updatedAt: comment.sellerReplyUpdatedAt ?? comment.replyUpdatedAt,
    },
  );
  const replyCount = Math.max(
    normalizeProductCommentCount(comment.commentCount ?? comment.replyCount),
    sellerReply ? 1 : 0,
  );

  return {
    id: String(comment.id ?? comment.orderId ?? `review-${index + 1}`).trim(),
    orderId: String(comment.orderId ?? "").trim(),
    productId: String(comment.productId ?? "").trim(),
    adminId: normalizeAdminTenantId(comment.adminId, ""),
    reviewer,
    author: reviewer,
    user: reviewer,
    title: String(comment.title ?? getProductReviewTitle(rating)).trim(),
    message,
    comment: message,
    text: message,
    media,
    reviewMedia: media,
    mediaUrls: media.map((item) => item.url),
    imageUrls: media.filter((item) => item.type === "image").map((item) => item.url),
    videoUrls: media.filter((item) => item.type === "video").map((item) => item.url),
    sellerReply,
    reply: sellerReply,
    sellerReplyMessage: sellerReply?.message ?? "",
    rating,
    createdAtEpochMs,
    createdAt,
    date: createdAt,
    dateLabel: createdAt,
    likeCount: normalizeProductCommentCount(comment.likeCount ?? comment.likes),
    commentCount: replyCount,
    replyCount,
  };
}

function normalizeProductReviewComments(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeStoredProductReviewComment)
    .filter(Boolean)
    .sort((left, right) =>
      normalizeProductReviewEpochMs(right?.createdAtEpochMs, right?.createdAt) -
      normalizeProductReviewEpochMs(left?.createdAtEpochMs, left?.createdAt),
    );
}

function getProductReviewAggregateForProduct(aggregates, product) {
  if (!(aggregates instanceof Map)) {
    return null;
  }

  const productId = String(product?.id ?? product?.productId ?? "").trim();
  if (!productId) {
    return null;
  }

  return (
    aggregates.get(getProductReviewAggregateKey(product, productId)) ||
    aggregates.get(getProductReviewProductOnlyKey(productId)) ||
    null
  );
}

function createProductReviewAggregatePayload(aggregate) {
  const ratingPoints = normalizeProductRatingPoints(aggregate?.ratingPoints);
  const ratingCount = normalizeProductRatingCount(aggregate?.ratingCount);
  const rating = getProductReviewAggregateRating(aggregate);
  const commentCount = normalizeProductCommentCount(aggregate?.commentCount);
  const reviewComments = normalizeProductReviewComments(aggregate?.comments);
  const ratingBreakdown = {};

  for (const star of [1, 2, 3, 4, 5]) {
    ratingBreakdown[star] = normalizeProductCommentCount(aggregate?.ratingBreakdown?.[star]);
  }

  return {
    rating,
    ratingCount,
    ratingsCount: ratingCount,
    reviewRatingCount: ratingCount,
    productRatingCount: ratingCount,
    ratingPoints,
    totalRatingPoints: ratingPoints,
    productRatingPoints: ratingPoints,
    commentCount,
    reviewCount: commentCount,
    reviewCommentCount: commentCount,
    productReviewCommentCount: commentCount,
    reviewComments,
    productReviewComments: reviewComments,
    reviews: reviewComments,
    ratingBreakdown,
    productRatingBreakdown: ratingBreakdown,
  };
}

function getProductReviewPayloadSnapshot(product) {
  return {
    rating: normalizeProductAggregateRating(product?.rating),
    ratingCount: normalizeProductRatingCount(
      product?.ratingCount ?? product?.reviewRatingCount ?? product?.productRatingCount,
    ),
    ratingPoints: normalizeProductRatingPoints(
      product?.ratingPoints ?? product?.totalRatingPoints ?? product?.productRatingPoints,
    ),
    commentCount: normalizeProductCommentCount(
      product?.commentCount ?? product?.reviewCommentCount ?? product?.productReviewCommentCount,
    ),
    reviewComments: normalizeProductReviewComments(
      product?.reviewComments ?? product?.productReviewComments ?? product?.reviews,
    ),
    ratingBreakdown: {
      1: normalizeProductCommentCount(product?.ratingBreakdown?.[1] ?? product?.productRatingBreakdown?.[1]),
      2: normalizeProductCommentCount(product?.ratingBreakdown?.[2] ?? product?.productRatingBreakdown?.[2]),
      3: normalizeProductCommentCount(product?.ratingBreakdown?.[3] ?? product?.productRatingBreakdown?.[3]),
      4: normalizeProductCommentCount(product?.ratingBreakdown?.[4] ?? product?.productRatingBreakdown?.[4]),
      5: normalizeProductCommentCount(product?.ratingBreakdown?.[5] ?? product?.productRatingBreakdown?.[5]),
    },
  };
}

function applyProductReviewAggregate(product, aggregates) {
  const aggregate = getProductReviewAggregateForProduct(aggregates, product);
  return {
    ...product,
    ...createProductReviewAggregatePayload(aggregate),
  };
}

function doesOrderEntryMatchProductReview(entry, { productId, reviewId, orderId }) {
  const entryProductId = String(entry?.productId ?? "").trim();
  if (!entryProductId || entryProductId !== String(productId ?? "").trim()) {
    return false;
  }

  const normalizedOrderId = String(orderId ?? "").trim();
  if (normalizedOrderId && String(entry?.id ?? "").trim() === normalizedOrderId) {
    return true;
  }

  const normalizedReviewId = String(reviewId ?? "").trim();
  return Boolean(
    normalizedReviewId &&
      getProductReviewCommentIdFromOrder(entry, entryProductId) === normalizedReviewId,
  );
}

async function handleProductReviewReplyApi(request, response) {
  const requestUrl = new URL(request.url, `http://127.0.0.1:${PORT}`);
  const requestAdminId = getRequestAdminId(request, requestUrl);

  if (request.method !== "POST" && request.method !== "PATCH") {
    sendJson(response, 405, { message: "Method not allowed." });
    return;
  }

  try {
    const payload = await parseRequestBody(request);
    const productId = String(payload?.productId ?? "").trim();
    const reviewId = String(payload?.reviewId ?? payload?.id ?? "").trim();
    const orderId = String(payload?.orderId ?? "").trim();
    const replyText = String(
      payload?.reply ??
        payload?.message ??
        payload?.text ??
        payload?.sellerReply ??
        "",
    )
      .replace(/\s+/g, " ")
      .trim();

    if (!productId) {
      sendJson(response, 400, { message: "Product id is required." });
      return;
    }
    if (!reviewId && !orderId) {
      sendJson(response, 400, { message: "Review id is required." });
      return;
    }
    if (!replyText) {
      sendJson(response, 400, { message: "Reply cannot be empty." });
      return;
    }

    const [orders, products, accounts] = await Promise.all([
      readOrders(),
      readProducts(),
      readAccounts(),
    ]);
    const product = products.find(
      (candidate) =>
        String(candidate?.id ?? "").trim() === productId &&
        isRecordInAdminScope(candidate, requestAdminId),
    );

    if (!product) {
      sendJson(response, 404, { message: "Product not found." });
      return;
    }

    const metadataByAdminId = getProductCompanyMetadataByAdminId(accounts);
    const productWithCompany = attachProductCompanyMetadata(
      normalizeStoredProductRecord(product),
      metadataByAdminId,
    );
    const companyName = String(
      payload?.companyName ??
        payload?.sellerName ??
        productWithCompany.companyName ??
        "",
    ).trim();
    const companyPictureUrl = String(
      payload?.companyPictureUrl ??
        payload?.profileImageUrl ??
        productWithCompany.companyPictureUrl ??
        "",
    ).trim();
    const now = Date.now();
    let updatedReview = null;
    let didUpdate = false;

    const nextOrders = orders.map((entry) => {
      if (
        !isRecordInAdminScope(entry, requestAdminId) ||
        !hasProductReviewRating(entry) ||
        !doesOrderEntryMatchProductReview(entry, { productId, reviewId, orderId })
      ) {
        return entry;
      }

      didUpdate = true;
      const existingCreatedAtEpochMs = Math.trunc(
        parseFiniteNumber(entry?.productReviewReplyCreatedAtEpochMs, 0),
      );
      const updatedEntry = normalizeStoredOrderEntry({
        ...entry,
        productReviewReply: replyText,
        productReviewReplyAuthor: companyName || "Seller",
        productReviewReplyCompanyName: companyName,
        productReviewReplyCompanyPictureUrl: companyPictureUrl,
        productReviewReplyCreatedAtEpochMs: existingCreatedAtEpochMs || now,
        productReviewReplyUpdatedAtEpochMs: now,
      });
      updatedReview = createProductReviewCommentFromOrder(
        updatedEntry,
        productId,
        normalizeProductReviewRating(updatedEntry?.productReviewRating),
        updatedEntry?.productReviewComment,
      );
      return updatedEntry;
    });

    if (!didUpdate) {
      sendJson(response, 404, { message: "Review not found." });
      return;
    }

    await writeOrders(nextOrders);
    await syncProductReviewCommentCountsFromOrders(nextOrders, requestAdminId);

    const reviewAggregates = buildProductReviewAggregates(nextOrders, requestAdminId);
    const refreshedProducts = await readProducts();
    const refreshedProduct =
      refreshedProducts.find(
        (candidate) =>
          String(candidate?.id ?? "").trim() === productId &&
          isRecordInAdminScope(candidate, requestAdminId),
      ) ?? product;

    sendJson(response, 200, {
      review: updatedReview,
      product: attachProductCompanyMetadata(
        applyProductReviewAggregate(
          normalizeStoredProductRecord(refreshedProduct),
          reviewAggregates,
        ),
        metadataByAdminId,
      ),
      message: "Seller reply saved.",
    });
  } catch (error) {
    sendJson(response, 400, {
      message: error instanceof Error ? error.message : "Unable to save seller reply.",
    });
  }
}

function summarizeProductReviewAggregatesForProducts(products, aggregates) {
  const summary = createEmptyProductReviewAggregate();
  const seenProductIds = new Set();

  for (const product of Array.isArray(products) ? products : []) {
    const productId = String(product?.id ?? product?.productId ?? "").trim();
    if (!productId || seenProductIds.has(productId)) {
      continue;
    }

    seenProductIds.add(productId);
    mergeProductReviewAggregate(
      summary,
      getProductReviewAggregateForProduct(aggregates, product),
    );
  }

  const payload = createProductReviewAggregatePayload(summary);
  return {
    rating: payload.rating,
    ratingCount: payload.ratingCount,
    ratingsCount: payload.ratingsCount,
    ratingPoints: payload.ratingPoints,
    commentCount: payload.commentCount,
    reviewCount: payload.reviewCount,
    reviewComments: payload.reviewComments,
  };
}

function buildProductReviewAggregates(orders, adminId = null) {
  const aggregates = new Map();
  const shouldFilterByAdmin = adminId !== null && adminId !== undefined;

  for (const entry of Array.isArray(orders) ? orders : []) {
    if (shouldFilterByAdmin && !isRecordInAdminScope(entry, adminId)) {
      continue;
    }

    if (!hasProductReviewRating(entry)) {
      continue;
    }

    const productId = String(entry?.productId ?? "").trim();
    const adminKey = getProductReviewAggregateKey(entry, productId);
    const productOnlyKey = getProductReviewProductOnlyKey(productId);
    const rating = normalizeProductReviewRating(entry?.productReviewRating);
    const reviewComment = resolveProductReviewCommentMessage(
      entry?.productReviewComment,
      rating,
    );
    const reviewMedia = getOrderEntryProductReviewMedia(entry);
    const adminAggregate =
      aggregates.get(adminKey) ||
      createEmptyProductReviewAggregate(productId, getRecordAdminId(entry));

    adminAggregate.ratingPoints += rating;
    adminAggregate.ratingCount += 1;
    adminAggregate.ratingBreakdown[Math.max(1, Math.min(5, Math.round(rating)))] += 1;

    if (reviewComment || reviewMedia.length) {
      adminAggregate.commentCount += 1;
      adminAggregate.comments.push(
        createProductReviewCommentFromOrder(entry, productId, rating, reviewComment),
      );
    }

    aggregates.set(adminKey, adminAggregate);

    const productOnlyAggregate =
      aggregates.get(productOnlyKey) || createEmptyProductReviewAggregate(productId);
    mergeProductReviewAggregate(productOnlyAggregate, {
      ...createEmptyProductReviewAggregate(productId),
      ratingPoints: rating,
      ratingCount: 1,
      commentCount: reviewComment || reviewMedia.length ? 1 : 0,
      comments: reviewComment || reviewMedia.length
        ? [createProductReviewCommentFromOrder(entry, productId, rating, reviewComment)]
        : [],
      ratingBreakdown: {
        1: Math.round(rating) === 1 ? 1 : 0,
        2: Math.round(rating) === 2 ? 1 : 0,
        3: Math.round(rating) === 3 ? 1 : 0,
        4: Math.round(rating) === 4 ? 1 : 0,
        5: Math.round(rating) === 5 ? 1 : 0,
      },
    });
    aggregates.set(productOnlyKey, productOnlyAggregate);
  }

  for (const aggregate of aggregates.values()) {
    aggregate.comments = normalizeProductReviewComments(aggregate.comments);
  }

  return aggregates;
}

function buildProductReviewCommentCounts(orders, adminId = null) {
  const aggregates = buildProductReviewAggregates(orders, adminId);
  const counts = new Map();

  for (const [key, aggregate] of aggregates.entries()) {
    counts.set(key, normalizeProductCommentCount(aggregate?.commentCount));
  }

  return counts;
}

async function syncProductReviewCommentCountsFromOrders(orders, adminId = null) {
  const products = await readProducts();
  const aggregates = buildProductReviewAggregates(orders, adminId);
  const shouldFilterByAdmin = adminId !== null && adminId !== undefined;
  let didUpdateProducts = false;
  const updatedAt = new Date().toISOString();

  const nextProducts = products.map((product) => {
    if (shouldFilterByAdmin && !isRecordInAdminScope(product, adminId)) {
      return product;
    }

    const productId = String(product?.id ?? "").trim();
    if (!productId) {
      return product;
    }

    const nextReviewPayload = createProductReviewAggregatePayload(
      getProductReviewAggregateForProduct(aggregates, product),
    );
    if (
      JSON.stringify(getProductReviewPayloadSnapshot(product)) ===
      JSON.stringify(getProductReviewPayloadSnapshot(nextReviewPayload))
    ) {
      return product;
    }

    didUpdateProducts = true;
    return {
      ...product,
      ...nextReviewPayload,
      updatedAt,
    };
  });

  if (didUpdateProducts) {
    await writeProducts(nextProducts);
  }
}

async function logActivitySafely(entry) {
  if (!entry) {
    return;
  }

  try {
    const activityLog = await readActivityLog();
    activityLog.unshift(entry);
    await writeActivityLog(activityLog.slice(0, MAX_ACTIVITY_ENTRIES));
  } catch (error) {
    console.error("Unable to record activity log:", error);
  }
}

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type,X-File-Name,X-GMS-Admin-ID,X-Admin-ID,X-GMS-Super-Admin-Token",
  );
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
}

function sendJson(response, statusCode, body) {
  setCorsHeaders(response);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

function sendText(response, statusCode, body) {
  setCorsHeaders(response);
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
  });
  response.end(body);
}

function parseRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > MAX_JSON_BODY_BYTES) {
        reject(new Error("Request body is too large."));
        request.destroy();
      }
    });

    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("Invalid JSON body."));
      }
    });

    request.on("error", reject);
  });
}

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseBinaryRequestBody(
  request,
  {
    maxBytes = MAX_UPLOAD_BYTES,
    maxSizeLabel = MAX_UPLOAD_SIZE_LABEL,
  } = {},
) {
  return new Promise((resolve, reject) => {
    const statedContentLength = Number.parseInt(
      String(request.headers["content-length"] ?? ""),
      10,
    );
    if (
      Number.isFinite(statedContentLength) &&
      statedContentLength > maxBytes
    ) {
      request.resume();
      reject(
        createHttpError(
          `Uploaded file is too large. Keep uploads under ${maxSizeLabel}.`,
          413,
        ),
      );
      return;
    }

    const chunks = [];
    let size = 0;
    let isSettled = false;

    function rejectOnce(error) {
      if (isSettled) {
        return;
      }

      isSettled = true;
      request.resume();
      reject(error);
    }

    request.on("data", (chunk) => {
      if (isSettled) {
        return;
      }

      chunks.push(chunk);
      size += chunk.length;

      if (size > maxBytes) {
        rejectOnce(
          createHttpError(
            `Uploaded file is too large. Keep uploads under ${maxSizeLabel}.`,
            413,
          ),
        );
      }
    });

    request.on("end", () => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      resolve(Buffer.concat(chunks));
    });

    request.on("error", (error) => {
      rejectOnce(error);
    });
  });
}

function hasInputValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function parsePriceInput(value) {
  if (!hasInputValue(value)) {
    return Number.NaN;
  }

  if (typeof value === "number") {
    return value;
  }

  const normalized = String(value)
    .trim()
    .replace(/^(?:PHP|\u20B1)\s*/i, "")
    .replace(/,/g, "")
    .replace(/\s+/g, "");

  return Number(normalized);
}

function parseNumberInput(value) {
  if (!hasInputValue(value)) {
    return Number.NaN;
  }

  if (typeof value === "number") {
    return value;
  }

  const normalized = String(value).trim().replace(/,/g, "").replace(/\s+/g, "");
  return Number(normalized);
}

function normalizeAccountPhoneForComparison(value) {
  let digits = String(value ?? "").replace(/\D/g, "");

  if (digits.startsWith("63") && digits.length > 10) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("0") && digits.length > 10) {
    digits = digits.slice(1);
  }

  return digits;
}

function normalizeAccountNamePartForComparison(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAccountApplicantNameForComparison(account) {
  const first = normalizeAccountNamePartForComparison(account?.firstName);
  const middle = normalizeAccountNamePartForComparison(account?.middleName);
  const last = normalizeAccountNamePartForComparison(account?.lastName);
  const suffix = normalizeAccountNamePartForComparison(account?.suffix);

  if (!first || !last) {
    return "";
  }

  return [first, middle, last, suffix].join("|");
}

const EMPLOYEE_SCHEDULE_PAID_HOURS = 8;
const EMPLOYEE_SCHEDULE_ELAPSED_HOURS = 9;

function normalizeEmployeeScheduleTime(value) {
  const match = String(value ?? "").trim().match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    return "";
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
    return "";
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function addEmployeeScheduleHours(timeValue, hoursToAdd) {
  const normalizedTime = normalizeEmployeeScheduleTime(timeValue);
  if (!normalizedTime) {
    return "";
  }

  const [hours, minutes] = normalizedTime.split(":").map(Number);
  const minutesInDay = 24 * 60;
  const totalMinutes =
    ((hours * 60 + minutes + hoursToAdd * 60) % minutesInDay + minutesInDay) % minutesInDay;
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
}

const employeeAccessPermissionKeys = new Set([
  "admin-dashboard",
  "insight",
  "product-insight",
  "products",
  "admin-inventory",
  "employee-data",
  "register",
  "employee-dashboard",
  "live-chat",
  "employee-order",
  "employee-inventory",
  "packing-dashboard",
  "existing-account",
  "settings",
  "sign-out",
]);

const employeeAccessPermissionDashboardPaths = [
  ["employee-dashboard", "/employee_dashboard.html"],
  ["admin-dashboard", "/admin_dashboard.html"],
  ["live-chat", "/live_chat.html"],
  ["employee-order", "/employee_order_insight.html"],
  ["employee-inventory", "/employee_stock.html"],
  ["packing-dashboard", "/packing_dashboard.html"],
  ["insight", "/insight.html"],
  ["product-insight", "/product_insight.html"],
  ["products", "/product_panel.html"],
  ["admin-inventory", "/stock.html"],
  ["employee-data", "/Employee_data.html"],
  ["register", "/register.html"],
];
const employeePanelAccessPermissionKeys = new Set([
  "live-chat",
  "employee-order",
  "employee-inventory",
]);
const inventoryAccessPermissionKeys = new Set([
  "admin-inventory",
  "employee-inventory",
]);

function isInventoryAccessPermission(permission) {
  return inventoryAccessPermissionKeys.has(
    String(permission ?? "").trim().toLowerCase(),
  );
}

function getEquivalentEmployeeAccessPermissionKeys(permission) {
  const key = String(permission ?? "").trim().toLowerCase();
  if (isInventoryAccessPermission(key)) {
    return [...inventoryAccessPermissionKeys];
  }
  return key ? [key] : [];
}

function normalizeEmployeeAccessPermissions(value) {
  const rawValues = Array.isArray(value)
    ? value
    : String(value ?? "")
      .split(",")
      .map((item) => item.trim());

  const seen = new Set();
  const permissions = [];
  for (const rawValue of rawValues) {
    const key = String(rawValue ?? "").trim().toLowerCase();
    if (!employeeAccessPermissionKeys.has(key) || seen.has(key)) {
      continue;
    }

    seen.add(key);
    permissions.push(key);
  }

  return permissions;
}

function ensureRequiredEmployeeAccessPermissions(permissions, position) {
  const normalizedPermissions = normalizeEmployeeAccessPermissions(permissions);
  const normalizedPosition = String(position ?? "").trim().toLowerCase();
  const filteredPermissions = normalizedPermissions.filter(
    (permission) => permission !== "packing-dashboard" || normalizedPosition === "packing",
  );
  const hasEmployeePanelAccess = normalizedPermissions.some((permission) =>
    employeePanelAccessPermissionKeys.has(permission),
  );

  if (
    normalizedPosition === "admin employee" &&
    !filteredPermissions.includes("live-chat")
  ) {
    filteredPermissions.push("live-chat");
  }

  if (
    ((normalizedPosition && normalizedPosition !== "packing") || hasEmployeePanelAccess) &&
    !filteredPermissions.includes("employee-dashboard")
  ) {
    filteredPermissions.unshift("employee-dashboard");
  }

  return filteredPermissions;
}

function normalizeIsoTimestamp(value, fallback = "") {
  if (value === null && fallback === null) {
    return null;
  }

  const rawValue = String(value ?? "").trim();
  if (!rawValue) {
    return fallback;
  }

  const parsedDate = new Date(rawValue);
  return Number.isNaN(parsedDate.getTime()) ? fallback : parsedDate.toISOString();
}

function getEmployeeAccessGrantFallbackTimestamp(account, defaultFallback = "") {
  if (!account || typeof account !== "object") {
    return normalizeIsoTimestamp(defaultFallback, "");
  }

  const preferredTimestamp = account.accessPermissionsConfigured
    ? account.updatedAt ?? account.createdAt
    : account.createdAt ?? account.updatedAt;
  return normalizeIsoTimestamp(preferredTimestamp, defaultFallback);
}

function buildEmployeeAccessPermissionGrantMap(accessPermissions, existingAccount, createdAt, updatedAt) {
  const permissions = normalizeEmployeeAccessPermissions(accessPermissions);
  const existingPermissionSet = new Set(
    ensureRequiredEmployeeAccessPermissions(
      existingAccount?.accessPermissions ?? [],
      existingAccount?.position,
    ),
  );
  const existingGrantMap =
    existingAccount?.accessPermissionGrantedAt &&
    typeof existingAccount.accessPermissionGrantedAt === "object"
      ? existingAccount.accessPermissionGrantedAt
      : {};
  const existingGrantFallback = getEmployeeAccessGrantFallbackTimestamp(
    existingAccount,
    createdAt || updatedAt || new Date().toISOString(),
  );
  const permissionGrantMap = {};

  for (const permission of permissions) {
    const existingGrantAt = normalizeIsoTimestamp(existingGrantMap[permission], "");
    const fallbackGrantAt = existingPermissionSet.has(permission)
      ? existingGrantFallback
      : normalizeIsoTimestamp(updatedAt, createdAt || new Date().toISOString());
    permissionGrantMap[permission] = existingGrantAt || fallbackGrantAt;
  }

  return permissionGrantMap;
}

function normalizeEmployeeAccessPermissionGrantMap(value, accessPermissions, fallbackTimestamp = "") {
  const permissions = normalizeEmployeeAccessPermissions(accessPermissions);
  const source = value && typeof value === "object" ? value : {};
  const normalizedGrantMap = {};

  for (const permission of permissions) {
    normalizedGrantMap[permission] = normalizeIsoTimestamp(
      source[permission],
      normalizeIsoTimestamp(fallbackTimestamp, ""),
    );
  }

  return normalizedGrantMap;
}

function normalizeAccountRecord(input, existingAccount = null) {
  const source = String(input.source ?? "").trim().toLowerCase() === "app"
    ? "app"
    : "web";
  const accountType = source === "app" ? "user" : "employee";
  const employeeId = String(input.employeeId ?? "").trim();
  const timeIn = normalizeEmployeeScheduleTime(input.timeIn ?? input.scheduleTimeIn);
  const expectedTimeOut = addEmployeeScheduleHours(
    timeIn,
    EMPLOYEE_SCHEDULE_ELAPSED_HOURS,
  );
  const timeOut =
    normalizeEmployeeScheduleTime(input.timeOut ?? input.scheduleTimeOut)
    || expectedTimeOut;
  const firstName = String(input.firstName ?? "").trim();
  const middleName = String(input.middleName ?? "").trim();
  const lastName = String(input.lastName ?? "").trim();
  const suffix = String(input.suffix ?? "").trim();
  const email = String(input.email ?? input.registerEmail ?? "").trim().toLowerCase();
  const address = String(input.address ?? "").trim();
  const countryCode = String(input.countryCode ?? "").trim();
  const mobileNumber = String(input.mobileNumber ?? "").replace(/\D/g, "").trim();
  const password = String(input.password ?? "").trim();
  const adminId = normalizeAdminTenantId(
    input.adminId ??
      input.ownerAdminId ??
      input.tenantId ??
      existingAccount?.adminId,
    DEFAULT_ADMIN_ID,
  );
  const normalizeAccountTimestamp = (value, fallback = "") => {
    if (value === null && fallback === null) {
      return null;
    }

    const rawValue = String(value ?? "").trim();
    if (!rawValue) {
      return fallback;
    }

    const parsedDate = new Date(rawValue);
    return Number.isNaN(parsedDate.getTime()) ? fallback : parsedDate.toISOString();
  };
  const profileImageUrl = String(
    input.profileImageUrl
      ?? input.avatarUrl
      ?? input.photoUrl
      ?? existingAccount?.profileImageUrl
      ?? "",
  ).trim();
  const rawGmailBinding =
    input.gmailBinding && typeof input.gmailBinding === "object"
      ? input.gmailBinding
      : existingAccount?.gmailBinding && typeof existingAccount.gmailBinding === "object"
      ? existingAccount.gmailBinding
      : {};
  const gmailBindingEmail = String(
    input.gmailBindingEmail
      ?? input.boundGmail
      ?? rawGmailBinding.email
      ?? "",
  ).trim().toLowerCase();
  const gmailBinding = gmailBindingEmail
    ? {
      email: gmailBindingEmail,
      provider: "gmail",
      boundAt: rawGmailBinding.boundAt || new Date().toISOString(),
    }
    : null;
  const rawAccessPermissionsWereProvided =
    Object.prototype.hasOwnProperty.call(input, "accessPermissions")
    || Object.prototype.hasOwnProperty.call(input, "employeeAccessPermissions");
  const accessPermissionsWereProvided = existingAccount
    ? Boolean(input.__accessPermissionsWereProvided)
    : rawAccessPermissionsWereProvided;
  const isAccessPermissionUpdate = Boolean(
    source === "web"
    && existingAccount
    && accessPermissionsWereProvided,
  );
  const position = String(
    isAccessPermissionUpdate
      ? existingAccount?.position
      : (input.position ?? existingAccount?.position ?? ""),
  ).trim();
  const accessPermissions = ensureRequiredEmployeeAccessPermissions(
    input.accessPermissions ?? input.employeeAccessPermissions ?? existingAccount?.accessPermissions ?? [],
    position,
  );
  const accessPermissionsConfigured = Boolean(
    source === "web"
    && (
      input.accessPermissionsConfigured
      || existingAccount?.accessPermissionsConfigured
      || accessPermissionsWereProvided
    ),
  );
  const faceVerified = Boolean(input.faceVerified);
  const verifiedAt = faceVerified && input.verifiedAt
    ? new Date(input.verifiedAt).toISOString()
    : null;
  const rawDocument =
    input.eDocument && typeof input.eDocument === "object"
      ? input.eDocument
      : {};
  const eDocument = {
    type: String(rawDocument.type ?? rawDocument.documentType ?? "").trim(),
    label: String(rawDocument.label ?? "").trim(),
    fileName: String(rawDocument.fileName ?? "").trim(),
    fileExtension: String(rawDocument.fileExtension ?? "").trim().toLowerCase(),
    url: String(rawDocument.url ?? rawDocument.documentUrl ?? "").trim(),
    uploadedAt: rawDocument.uploadedAt
      ? new Date(rawDocument.uploadedAt).toISOString()
      : null,
  };

  if (firstName.length < 2 || lastName.length < 2) {
    throw new Error("First name and last name must be at least 2 characters long.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Please enter a valid email address.");
  }

  if (gmailBindingEmail && !/^[^\s@]+@gmail\.com$/.test(gmailBindingEmail)) {
    throw new Error("Gmail binding must use a valid Gmail address.");
  }

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }

  if (source === "web") {
    if (!/^(?:[A-Z0-9]{2,8}-)?\d{6}$/.test(employeeId)) {
      throw new Error("Employee ID must be a 6-digit number or follow the ABC-012345 format.");
    }

    if (position.length < 2) {
      throw new Error("Position is required.");
    }

    if (!timeIn) {
      throw new Error("Time In is required.");
    }

    if (!timeOut || timeOut !== expectedTimeOut) {
      throw new Error("Time Out must be computed automatically from Time In.");
    }

    if (countryCode !== "+63") {
      throw new Error("Phone number must use the +63 country code.");
    }

    if (!/^9\d{9}$/.test(mobileNumber)) {
      throw new Error("Phone number must be a valid Philippine mobile number.");
    }
  }

  if (source === "app") {
    if (!countryCode) {
      throw new Error("Country code is required.");
    }

    if (mobileNumber.length < 7) {
      throw new Error("Mobile number must be at least 7 digits long.");
    }
  }

  const createdAt = normalizeAccountTimestamp(
    existingAccount?.createdAt ?? input.createdAt,
    new Date().toISOString(),
  );
  const updatedAt = normalizeAccountTimestamp(
    input.updatedAt,
    existingAccount?.updatedAt ?? createdAt,
  );
  const passwordUpdatedAt = normalizeAccountTimestamp(
    input.passwordUpdatedAt,
    existingAccount?.passwordUpdatedAt ?? (password ? createdAt : null),
  );
  const accessPermissionGrantedAt = buildEmployeeAccessPermissionGrantMap(
    accessPermissions,
    existingAccount,
    createdAt,
    updatedAt,
  );

  return {
    id: existingAccount?.id ?? `acct-${Date.now()}`,
    accountCode:
      existingAccount?.accountCode ??
      (source === "app" ? `USR-${String(Date.now()).slice(-6)}` : employeeId),
    employeeId: source === "web" ? employeeId : "",
    position: source === "web" ? position : "",
    timeIn: source === "web" ? timeIn : "",
    timeOut: source === "web" ? timeOut : "",
    workHours: source === "web" ? EMPLOYEE_SCHEDULE_PAID_HOURS : 0,
    firstName,
    middleName,
    lastName,
    suffix,
    email,
    address,
    countryCode,
    mobileNumber,
    password,
    eDocument,
    profileImageUrl,
    gmailBinding,
    accessPermissions: source === "web" ? accessPermissions : [],
    accessPermissionGrantedAt: source === "web" ? accessPermissionGrantedAt : {},
    accessPermissionsConfigured,
    role: accountType,
    source,
    faceVerified,
    verifiedAt,
    passwordUpdatedAt,
    createdAt,
    updatedAt,
    adminId,
  };
}

function isAdminAccount(account) {
  return String(account?.role ?? "").trim().toLowerCase() === "admin";
}

function getAdminAccountRestrictionMessage(account) {
  const status = String(account?.status ?? account?.accountStatus ?? account?.accountState ?? "")
    .trim()
    .toLowerCase();

  if (status === "banned" || account?.isBanned === true) {
    return "This admin account is banned.";
  }

  if (
    status === "deactivated" ||
    status === "inactive" ||
    status === "disabled" ||
    account?.isActive === false ||
    account?.disabled === true
  ) {
    return "This admin account is deactivated.";
  }

  return "";
}

function createAdminAccountId(input) {
  const stem = normalizeAdminTenantId(
    input?.companyName ??
      input?.storeName ??
      input?.businessName ??
      input?.email ??
      "admin",
    "admin",
  );
  return `admin-${stem}-${Date.now()}`;
}

function normalizeAdminAccountRecord(input, existingAccount = null) {
  const email = String(input.email ?? input.registerEmail ?? "").trim().toLowerCase();
  const password = String(input.password ?? "").trim();
  const storeName = String(
    input.companyName ??
      input.storeName ??
      input.businessName ??
      existingAccount?.companyName ??
      existingAccount?.storeName ??
      "",
  ).replace(/\s+/g, " ").trim();
  const storeType = normalizeStoreTypeName(
    input.storeType ??
      input.storeTypeName ??
      input.businessType ??
      existingAccount?.storeType ??
      existingAccount?.storeTypeName ??
      existingAccount?.businessType ??
      "",
  );
  const firstName = String(input.firstName ?? existingAccount?.firstName ?? "").trim();
  const lastName = String(input.lastName ?? existingAccount?.lastName ?? "").trim();
  const mobileNumber = String(input.mobileNumber ?? existingAccount?.mobileNumber ?? "")
    .replace(/\D/g, "")
    .trim();
  const countryCode = String(input.countryCode ?? existingAccount?.countryCode ?? "+63").trim() || "+63";
  const now = new Date().toISOString();

  if (storeName.length < 2) {
    throw new Error("Company name must be at least 2 characters long.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Please enter a valid admin email address.");
  }

  if (password.length < 6) {
    throw new Error("Admin password must be at least 6 characters long.");
  }

  const id = existingAccount?.id ?? createAdminAccountId({
    companyName: storeName,
    email,
  });
  const adminId = normalizeAdminTenantId(
    input.adminId ?? existingAccount?.adminId ?? id,
    id,
  );
  const createdAt = existingAccount?.createdAt || now;

  return {
    id,
    adminId,
    accountCode: existingAccount?.accountCode || adminId,
    role: "admin",
    source: "web",
    storeName,
    companyName: storeName,
    businessName: storeName,
    storeType,
    storeTypeName: storeType,
    businessType: storeType,
    firstName,
    middleName: String(input.middleName ?? existingAccount?.middleName ?? "").trim(),
    lastName,
    suffix: String(input.suffix ?? existingAccount?.suffix ?? "").trim(),
    email,
    countryCode,
    mobileNumber,
    password,
    profileImageUrl: String(
      input.profileImageUrl ??
        input.logoUrl ??
        existingAccount?.profileImageUrl ??
        "",
    ).trim(),
    accessPermissions: [],
    accessPermissionGrantedAt: {},
    accessPermissionsConfigured: false,
    createdAt,
    updatedAt: now,
    passwordUpdatedAt:
      password !== String(existingAccount?.password ?? "")
        ? now
        : existingAccount?.passwordUpdatedAt ?? createdAt,
  };
}

function serializeAdminAccount(account, counts = null) {
  const { password, ...safeAccount } = account || {};
  const companyName = [
    safeAccount.companyName,
    safeAccount.storeName,
    safeAccount.businessName,
  ]
    .map((value) => String(value ?? "").trim())
    .find(Boolean) || "";
  const storeType = [
    safeAccount.storeType,
    safeAccount.storeTypeName,
    safeAccount.businessType,
  ]
    .map((value) => String(value ?? "").trim())
    .find(Boolean) || "";
  return {
    ...safeAccount,
    companyName,
    storeName: String(safeAccount.storeName ?? "").trim() || companyName,
    businessName: String(safeAccount.businessName ?? "").trim() || companyName,
    storeType,
    storeTypeName: storeType,
    businessType: storeType,
    adminId: getRecordAdminId(safeAccount, safeAccount?.adminId || safeAccount?.id),
    displayName:
      [safeAccount.firstName, safeAccount.lastName].filter(Boolean).join(" ").trim() ||
      companyName ||
      String(safeAccount.email ?? "").trim() ||
      "Admin",
    ...(counts && typeof counts === "object" ? { counts } : {}),
  };
}

function normalizeProductCompanyMetadataText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function getProductCompanyMetadataByAdminId(accounts = []) {
  const metadataByAdminId = new Map();

  for (const account of Array.isArray(accounts) ? accounts : []) {
    if (!isAdminAccount(account)) {
      continue;
    }

    const serializedAccount = serializeAdminAccount(account);
    const adminId = getRecordAdminId(serializedAccount, serializedAccount.adminId);
    if (!adminId) {
      continue;
    }

    const companyName = [
      serializedAccount.companyName,
      serializedAccount.storeName,
      serializedAccount.businessName,
      serializedAccount.displayName,
      serializedAccount.email,
    ]
      .map(normalizeProductCompanyMetadataText)
      .find(Boolean) || "";
    const companyPictureUrl = [
      serializedAccount.companyPictureUrl,
      serializedAccount.companyProfileImageUrl,
      serializedAccount.profileImageUrl,
      serializedAccount.logoUrl,
      serializedAccount.avatarUrl,
      serializedAccount.photoUrl,
    ]
      .map((value) => String(value ?? "").trim())
      .find(Boolean) || "";

    metadataByAdminId.set(adminId, {
      companyName,
      companyPictureUrl,
    });
  }

  return metadataByAdminId;
}

function attachProductCompanyMetadata(product, metadataByAdminId = new Map()) {
  if (!product || typeof product !== "object") {
    return product;
  }

  const adminId = getRecordAdminId(product);
  const metadata = metadataByAdminId.get(adminId) ?? {};
  const companyName = [
    product.companyName,
    product.storeName,
    product.businessName,
    metadata.companyName,
  ]
    .map(normalizeProductCompanyMetadataText)
    .find(Boolean) || "";
  const companyPictureUrl = [
    product.companyPictureUrl,
    product.companyProfileImageUrl,
    metadata.companyPictureUrl,
  ]
    .map((value) => String(value ?? "").trim())
    .find(Boolean) || "";

  return {
    ...product,
    companyName,
    storeName: String(product.storeName ?? "").trim() || companyName,
    businessName: String(product.businessName ?? "").trim() || companyName,
    companyPictureUrl,
  };
}

function attachProductsCompanyMetadata(products, accounts = []) {
  const metadataByAdminId = getProductCompanyMetadataByAdminId(accounts);
  return (Array.isArray(products) ? products : []).map((product) =>
    attachProductCompanyMetadata(product, metadataByAdminId),
  );
}

function getEmployeeDashboardPath(accountOrPosition) {
  const account = accountOrPosition && typeof accountOrPosition === "object"
    ? accountOrPosition
    : null;
  const hasExplicitAccessPermissions =
    Boolean(account?.accessPermissionsConfigured);
  const hasStoredAccessPermissions =
    Array.isArray(account?.accessPermissions) && account.accessPermissions.length > 0;
  const accessPermissions = hasExplicitAccessPermissions || hasStoredAccessPermissions
    ? ensureRequiredEmployeeAccessPermissions(account.accessPermissions, account.position)
    : [];
  const normalizedPosition = String(account?.position ?? accountOrPosition ?? "").trim().toLowerCase();

  if (hasExplicitAccessPermissions || hasStoredAccessPermissions) {
    if (normalizedPosition === "packing") {
      return accessPermissions.includes("packing-dashboard")
        ? "/packing_dashboard.html"
        : "/employee_access_pending.html";
    }

    for (const [permissionKey, dashboardPath] of employeeAccessPermissionDashboardPaths) {
      if (accessPermissions.includes(permissionKey)) {
        return dashboardPath;
      }
    }

    return "/employee_access_pending.html";
  }

  if (normalizedPosition === "packing") {
    return "/packing_dashboard.html";
  }
  if (normalizedPosition) {
    return "/employee_dashboard.html";
  }

  return "/employee_access_pending.html";
}

function getAccountFaceProfileKey(account) {
  return String(account?.employeeId ?? account?.accountCode ?? account?.id ?? "")
    .trim()
    .toUpperCase();
}

function getFaceAttendanceSampleCount(profile) {
  const sampleCount = Number(profile?.sample_count ?? profile?.sampleCount ?? 0);
  if (Number.isFinite(sampleCount) && sampleCount > 0) {
    return Math.trunc(sampleCount);
  }

  const embeddings = profile?.embeddings;
  return Array.isArray(embeddings) ? embeddings.length : 0;
}

function getFaceAttendanceProfilesMap(faceAttendanceData = null) {
  if (faceAttendanceData instanceof Map) {
    return faceAttendanceData;
  }

  return faceAttendanceData?.profiles instanceof Map
    ? faceAttendanceData.profiles
    : null;
}

function getFaceAttendanceRecordsMap(faceAttendanceData = null) {
  return faceAttendanceData?.attendanceRecords instanceof Map
    ? faceAttendanceData.attendanceRecords
    : null;
}

function getFaceAttendanceRecordsForAccount(account, faceAttendanceData = null) {
  const recordsByEmployeeId = getFaceAttendanceRecordsMap(faceAttendanceData);
  if (!(recordsByEmployeeId instanceof Map)) {
    return [];
  }

  const accountKeys = getFaceAttendanceAccountKeys(account);
  for (const accountKey of accountKeys) {
    const records = recordsByEmployeeId.get(accountKey);
    if (Array.isArray(records)) {
      return records;
    }
  }

  return [];
}

function getRegisteredFaceProfile(account, faceAttendanceData = null) {
  const profileKey = getAccountFaceProfileKey(account);
  const faceAttendanceProfiles = getFaceAttendanceProfilesMap(faceAttendanceData);
  if (!profileKey || !(faceAttendanceProfiles instanceof Map)) {
    return null;
  }

  const profile = faceAttendanceProfiles.get(profileKey);
  if (!profile) {
    return null;
  }

  const sampleCount = getFaceAttendanceSampleCount(profile);
  if (sampleCount <= 0 && !profile.registered_at && !profile.registeredAt) {
    return null;
  }

  return {
    employeeId: String(profile.employee_id ?? profile.employeeId ?? profileKey).trim(),
    registeredAt: String(profile.registered_at ?? profile.registeredAt ?? "").trim(),
    sampleCount,
    source: "face_attendance_lh",
  };
}

function applyRegisteredFaceProfile(account, faceAttendanceData = null) {
  const registeredFaceProfile = getRegisteredFaceProfile(account, faceAttendanceData);
  const attendanceRecords = getFaceAttendanceRecordsForAccount(account, faceAttendanceData);
  if (!registeredFaceProfile && attendanceRecords.length === 0) {
    return account;
  }

  const faceAttendanceLh = {
    ...(registeredFaceProfile ?? {
      employeeId: String(account?.employeeId ?? account?.accountCode ?? account?.id ?? "").trim(),
      source: "face_attendance_lh",
    }),
    attendanceRecords,
    attendance_records: attendanceRecords,
  };

  return {
    ...account,
    faceVerified: registeredFaceProfile ? true : Boolean(account?.faceVerified),
    verifiedAt: registeredFaceProfile
      ? account?.verifiedAt || registeredFaceProfile.registeredAt || null
      : account?.verifiedAt,
    faceProfileRegistered: registeredFaceProfile ? true : Boolean(account?.faceProfileRegistered),
    registeredFaceProfile: registeredFaceProfile ?? account?.registeredFaceProfile ?? null,
    face_attendance_lh: faceAttendanceLh,
  };
}

function serializeEmployeeAccount(account, faceAttendanceData = null) {
  const safeAccount = applyRegisteredFaceProfile(account, faceAttendanceData);
  const accessPermissions = ensureRequiredEmployeeAccessPermissions(
    safeAccount.accessPermissions ?? [],
    safeAccount.position,
  );
  return {
    id: safeAccount.id,
    accountCode: safeAccount.accountCode,
    employeeId: safeAccount.employeeId,
    position: safeAccount.position,
    timeIn: safeAccount.timeIn,
    timeOut: safeAccount.timeOut,
    workHours: safeAccount.workHours,
    firstName: safeAccount.firstName,
    middleName: safeAccount.middleName,
    lastName: safeAccount.lastName,
    suffix: safeAccount.suffix,
    email: safeAccount.email,
    profileImageUrl: safeAccount.profileImageUrl || "",
    gmailBinding: safeAccount.gmailBinding || null,
    accessPermissions,
    accessPermissionGrantedAt: normalizeEmployeeAccessPermissionGrantMap(
      safeAccount.accessPermissionGrantedAt,
      accessPermissions,
      getEmployeeAccessGrantFallbackTimestamp(safeAccount),
    ),
    accessPermissionsConfigured: Boolean(safeAccount.accessPermissionsConfigured),
    role: safeAccount.role,
    source: safeAccount.source,
    faceVerified: Boolean(safeAccount.faceVerified),
    verifiedAt: safeAccount.verifiedAt,
    passwordUpdatedAt: safeAccount.passwordUpdatedAt ?? null,
    updatedAt: safeAccount.updatedAt ?? safeAccount.createdAt ?? null,
    adminId: getRecordAdminId(safeAccount),
    faceProfileRegistered: Boolean(safeAccount.faceProfileRegistered),
    registeredFaceProfile: safeAccount.registeredFaceProfile ?? null,
    face_attendance_lh: safeAccount.face_attendance_lh ?? null,
  };
}

function serializeAccountForList(account, faceAttendanceData = null) {
  const accountWithFaceProfile = applyRegisteredFaceProfile(account, faceAttendanceData);
  const { password, ...safeAccount } = accountWithFaceProfile || {};
  const accessPermissions = ensureRequiredEmployeeAccessPermissions(
    safeAccount.accessPermissions ?? [],
    safeAccount.position,
  );
  return {
    ...safeAccount,
    adminId: getRecordAdminId(safeAccount),
    accessPermissions,
    accessPermissionGrantedAt: normalizeEmployeeAccessPermissionGrantMap(
      safeAccount.accessPermissionGrantedAt,
      accessPermissions,
      getEmployeeAccessGrantFallbackTimestamp(safeAccount),
    ),
  };
}

function sanitizeFileStem(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function getUploadExtension(filename, contentType) {
  const filenameExtension = path.extname(filename ?? "").toLowerCase();
  if (
    MIME_TYPES[filenameExtension]?.startsWith("image/") ||
    MIME_TYPES[filenameExtension]?.startsWith("video/") ||
    MIME_TYPES[filenameExtension]?.startsWith("model/") ||
    filenameExtension === ".fbx" ||
    filenameExtension === ".obj"
  ) {
    return filenameExtension;
  }

  switch (String(contentType ?? "").toLowerCase()) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "video/mp4":
      return ".mp4";
    case "video/quicktime":
      return ".mov";
    case "video/x-m4v":
      return ".m4v";
    case "video/webm":
      return ".webm";
    case "video/x-msvideo":
      return ".avi";
    case "video/x-matroska":
      return ".mkv";
    case "video/3gpp":
      return ".3gp";
    case "model/gltf-binary":
      return ".glb";
    case "model/gltf+json":
      return ".gltf";
    default:
      return "";
  }
}

function isImageUploadType(contentType, extension) {
  const normalizedContentType = String(contentType ?? "").toLowerCase();
  if (normalizedContentType.startsWith("image/")) {
    return true;
  }

  return MIME_TYPES[String(extension ?? "").toLowerCase()]?.startsWith("image/") ?? false;
}

function isModelUploadType(contentType, extension) {
  const normalizedContentType = String(contentType ?? "").toLowerCase();
  if (normalizedContentType.startsWith("model/")) {
    return true;
  }

  return [".glb", ".gltf", ".obj", ".fbx"].includes(
    String(extension ?? "").toLowerCase(),
  );
}

async function convertUploadedImageToWebp(fileBuffer) {
  if (!sharp) {
    throw new Error(
      'Image upload conversion is unavailable because the "sharp" package is not installed.',
    );
  }

  try {
    return await sharp(fileBuffer, {
      animated: true,
    })
      .rotate()
      .webp({
        quality: UPLOAD_IMAGE_WEBP_QUALITY,
        effort: UPLOAD_IMAGE_WEBP_EFFORT,
      })
      .toBuffer();
  } catch (error) {
    throw new Error("Unable to convert the uploaded image to WebP.");
  }
}

function shouldStoreUploadedImageAsPng(contentType, extension) {
  return (
    String(contentType ?? "").toLowerCase() === "image/png" ||
    String(extension ?? "").toLowerCase() === ".png"
  );
}

async function createVisualSearchFingerprint(fileBuffer) {
  if (!sharp) {
    throw new Error(
      'Visual product search is unavailable because the "sharp" package is not installed.',
    );
  }

  try {
    return await createVisualSearchFingerprintFromBuffer(fileBuffer, {
      trimEdges: true,
    });
  } catch (error) {
    try {
      return await createVisualSearchFingerprintFromBuffer(fileBuffer, {
        trimEdges: false,
      });
    } catch (_) {
      throw new Error("Unable to read the product photo for visual search.");
    }
  }
}

async function createVisualSearchFingerprintFromBuffer(fileBuffer, options = {}) {
  let pipeline = sharp(fileBuffer, {
    animated: false,
    failOn: "none",
  }).rotate();

  if (options.trimEdges) {
    pipeline = pipeline.trim({ threshold: 10 });
  }

  const { data } = await pipeline
    .resize(VISUAL_SEARCH_VECTOR_SIZE, VISUAL_SEARCH_VECTOR_SIZE, {
      fit: "fill",
    })
    .removeAlpha()
    .toColourspace("srgb")
    .normalize()
    .gamma()
    .sharpen()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return data;
}

async function createVisualSearchNormalizedImageBuffer(fileBuffer) {
  const { data, info } = await sharp(fileBuffer, {
    animated: false,
    failOn: "none",
  })
    .rotate()
    .jpeg({ quality: 92 })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    width: Number(info?.width ?? 0),
    height: Number(info?.height ?? 0),
  };
}

function buildVisualSearchCenterCropRect(imageWidth, imageHeight, widthRatio, heightRatio) {
  const sourceWidth = Math.max(1, Math.floor(Number(imageWidth) || 0));
  const sourceHeight = Math.max(1, Math.floor(Number(imageHeight) || 0));
  const cropWidth = Math.max(
    1,
    Math.min(sourceWidth, Math.round(sourceWidth * Number(widthRatio || 1))),
  );
  const cropHeight = Math.max(
    1,
    Math.min(sourceHeight, Math.round(sourceHeight * Number(heightRatio || 1))),
  );

  return {
    left: Math.max(0, Math.floor((sourceWidth - cropWidth) / 2)),
    top: Math.max(0, Math.floor((sourceHeight - cropHeight) / 2)),
    width: cropWidth,
    height: cropHeight,
  };
}

async function createVisualSearchQueryFingerprints(fileBuffer) {
  const fingerprints = [];
  const seenFingerprints = new Set();

  async function addFingerprintFromBuffer(sourceBuffer) {
    const fingerprint = await createVisualSearchFingerprint(sourceBuffer);
    const fingerprintKey = fingerprint.toString("base64");
    if (seenFingerprints.has(fingerprintKey)) {
      return;
    }

    seenFingerprints.add(fingerprintKey);
    fingerprints.push(fingerprint);
  }

  await addFingerprintFromBuffer(fileBuffer);

  let normalizedImage = null;
  try {
    normalizedImage = await createVisualSearchNormalizedImageBuffer(fileBuffer);
  } catch (error) {
    return fingerprints;
  }

  if (normalizedImage.width < 96 || normalizedImage.height < 96) {
    return fingerprints;
  }

  for (const cropRatio of VISUAL_SEARCH_QUERY_CROP_RATIOS) {
    const cropRect = buildVisualSearchCenterCropRect(
      normalizedImage.width,
      normalizedImage.height,
      cropRatio.width,
      cropRatio.height,
    );

    if (
      cropRect.width >= normalizedImage.width &&
      cropRect.height >= normalizedImage.height
    ) {
      continue;
    }

    try {
      const cropBuffer = await sharp(normalizedImage.buffer, {
        animated: false,
        failOn: "none",
      })
        .extract(cropRect)
        .jpeg({ quality: 92 })
        .toBuffer();
      await addFingerprintFromBuffer(cropBuffer);
    } catch (error) {
      // Keep the remaining search candidates; one bad crop should not fail search.
    }
  }

  for (const rotationDegrees of VISUAL_SEARCH_QUERY_ROTATION_DEGREES) {
    try {
      const rotatedBuffer = await sharp(normalizedImage.buffer, {
        animated: false,
        failOn: "none",
      })
        .rotate(rotationDegrees)
        .jpeg({ quality: 92 })
        .toBuffer();
      await addFingerprintFromBuffer(rotatedBuffer);
    } catch (error) {
      // Rotation variants are best-effort for landscape or sideways captures.
    }
  }

  return fingerprints;
}

function createVisualSearchFingerprintMeta(fingerprint, imageUrl) {
  if (
    !Buffer.isBuffer(fingerprint) ||
    fingerprint.length !== VISUAL_SEARCH_FINGERPRINT_LENGTH
  ) {
    return null;
  }

  return {
    version: VISUAL_SEARCH_FINGERPRINT_VERSION,
    imageUrl: String(imageUrl ?? "").trim(),
    vectorSize: VISUAL_SEARCH_VECTOR_SIZE,
    data: fingerprint.toString("base64"),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeVisualSearchFingerprintMeta(value, imageUrl) {
  const normalizedImageUrl = String(imageUrl ?? "").trim();
  if (!value || typeof value !== "object" || !normalizedImageUrl) {
    return null;
  }

  const version = String(value.version ?? "").trim();
  const fingerprintImageUrl = String(value.imageUrl ?? "").trim();
  const data = String(value.data ?? "").trim();
  const vectorSize = Number(value.vectorSize ?? 0);

  if (
    version !== VISUAL_SEARCH_FINGERPRINT_VERSION ||
    fingerprintImageUrl !== normalizedImageUrl ||
    vectorSize !== VISUAL_SEARCH_VECTOR_SIZE ||
    !data
  ) {
    return null;
  }

  try {
    const fingerprint = Buffer.from(data, "base64");
    if (fingerprint.length !== VISUAL_SEARCH_FINGERPRINT_LENGTH) {
      return null;
    }
  } catch (error) {
    return null;
  }

  return {
    version,
    imageUrl: fingerprintImageUrl,
    vectorSize,
    data,
    updatedAt: normalizeOptionalProductDateTime(value.updatedAt) || "",
  };
}

function normalizeProductVisualSearchImageAngles(product = {}) {
  const imageAngles = {};
  for (const angleKey of VISUAL_SEARCH_IMAGE_ANGLE_KEYS) {
    imageAngles[angleKey] = "";
  }

  const rawAngles = product?.visualSearchImageAngles;
  if (rawAngles && typeof rawAngles === "object" && !Array.isArray(rawAngles)) {
    for (const [rawKey, rawUrl] of Object.entries(rawAngles)) {
      const angleKey = normalizeVisualSearchImageAngleKey(rawKey);
      if (angleKey) {
        imageAngles[angleKey] = String(rawUrl ?? "").trim();
      }
    }
  }

  const rawUrls = Array.isArray(product?.visualSearchImageUrls)
    ? product.visualSearchImageUrls
    : [];
  rawUrls.forEach((url, index) => {
    const angleKey =
      VISUAL_SEARCH_IMAGE_ANGLE_KEYS[index] ??
      createVisualSearchOtherImageKey(
        index - VISUAL_SEARCH_IMAGE_ANGLE_KEYS.length + 1,
      );
    if (angleKey && !imageAngles[angleKey]) {
      imageAngles[angleKey] = String(url ?? "").trim();
    }
  });

  const legacyUrl = String(product?.visualSearchImageUrl ?? "").trim();
  if (legacyUrl && !imageAngles[VISUAL_SEARCH_PRIMARY_IMAGE_ANGLE]) {
    imageAngles[VISUAL_SEARCH_PRIMARY_IMAGE_ANGLE] = legacyUrl;
  }

  return imageAngles;
}

function isVisualSearchOtherImageKey(value) {
  return new RegExp(`^${VISUAL_SEARCH_OTHER_IMAGE_PREFIX}\\d+$`).test(
    String(value ?? "").trim().toLowerCase(),
  );
}

function createVisualSearchOtherImageKey(index) {
  return `${VISUAL_SEARCH_OTHER_IMAGE_PREFIX}${Math.max(1, Number(index) || 1)}`;
}

function getVisualSearchOtherImageIndex(angleKey) {
  const match = String(angleKey ?? "")
    .trim()
    .toLowerCase()
    .match(new RegExp(`^${VISUAL_SEARCH_OTHER_IMAGE_PREFIX}(\\d+)$`));
  return match ? Number(match[1]) : 0;
}

function normalizeVisualSearchImageAngleKey(value) {
  const requestedKey = String(value ?? "").trim().toLowerCase();
  if (VISUAL_SEARCH_IMAGE_ANGLE_KEYS.includes(requestedKey)) {
    return requestedKey;
  }

  if (isVisualSearchOtherImageKey(requestedKey)) {
    return requestedKey;
  }

  return "";
}

function getProductVisualSearchImageAngleKeys(imageAngles = {}) {
  const otherKeys = Object.keys(imageAngles)
    .filter((angleKey) => {
      const url = String(imageAngles?.[angleKey] ?? "").trim();
      return url && isVisualSearchOtherImageKey(angleKey);
    })
    .sort(
      (first, second) =>
        getVisualSearchOtherImageIndex(first) -
        getVisualSearchOtherImageIndex(second),
    );

  return [...VISUAL_SEARCH_IMAGE_ANGLE_KEYS, ...otherKeys];
}

function getProductVisualSearchImageUrlsFromAngles(imageAngles = {}) {
  const urls = [];
  const seen = new Set();

  for (const angleKey of getProductVisualSearchImageAngleKeys(imageAngles)) {
    const url = String(imageAngles?.[angleKey] ?? "").trim();
    const normalizedKey = url.toLowerCase();
    if (!url || seen.has(normalizedKey)) {
      continue;
    }

    seen.add(normalizedKey);
    urls.push(url);
  }

  return urls;
}

function normalizeProductVisualSearchImageUrls(product = {}) {
  return getProductVisualSearchImageUrlsFromAngles(
    normalizeProductVisualSearchImageAngles(product),
  );
}

function getPrimaryProductVisualSearchImageUrl(product = {}) {
  const imageAngles = normalizeProductVisualSearchImageAngles(product);
  return (
    String(imageAngles[VISUAL_SEARCH_PRIMARY_IMAGE_ANGLE] ?? "").trim() ||
    getProductVisualSearchImageUrlsFromAngles(imageAngles)[0] ||
    ""
  );
}

function normalizeVisualSearchFingerprintMetaList(value, imageUrls = []) {
  const sourceFingerprints = Array.isArray(value) ? value : [];

  return imageUrls
    .map((imageUrl, index) => {
      const normalizedUrl = String(imageUrl ?? "").trim();
      const matchingMeta = sourceFingerprints.find(
        (candidate) =>
          String(candidate?.imageUrl ?? "").trim().toLowerCase() ===
          normalizedUrl.toLowerCase(),
      );

      return normalizeVisualSearchFingerprintMeta(
        matchingMeta ?? sourceFingerprints[index],
        normalizedUrl,
      );
    })
    .filter(Boolean);
}

function findVisualSearchFingerprintMetaForUrl(sources, imageUrl) {
  const normalizedImageUrl = String(imageUrl ?? "").trim();
  if (!normalizedImageUrl) {
    return null;
  }

  for (const source of sources) {
    const normalizedMeta = normalizeVisualSearchFingerprintMeta(
      source,
      normalizedImageUrl,
    );
    if (normalizedMeta) {
      return normalizedMeta;
    }
  }

  return null;
}

function getStoredVisualSearchFingerprint(product) {
  const visualSearchImageUrl = String(product?.visualSearchImageUrl ?? "").trim();
  const fingerprintMeta = normalizeVisualSearchFingerprintMeta(
    product?.visualSearchFingerprint,
    visualSearchImageUrl,
  );

  if (!fingerprintMeta) {
    return null;
  }

  try {
    const fingerprint = Buffer.from(fingerprintMeta.data, "base64");
    return fingerprint.length === VISUAL_SEARCH_FINGERPRINT_LENGTH ? fingerprint : null;
  } catch (error) {
    return null;
  }
}

function getStoredVisualSearchFingerprintEntries(product) {
  const imageUrls = normalizeProductVisualSearchImageUrls(product);
  const fingerprintMetas = normalizeVisualSearchFingerprintMetaList(
    product?.visualSearchFingerprints,
    imageUrls,
  );
  const entries = [];

  for (const imageUrl of imageUrls) {
    const fingerprintMeta =
      fingerprintMetas.find(
        (meta) =>
          String(meta?.imageUrl ?? "").trim().toLowerCase() ===
          String(imageUrl ?? "").trim().toLowerCase(),
      ) ||
      normalizeVisualSearchFingerprintMeta(
        product?.visualSearchFingerprint,
        imageUrl,
      );

    if (!fingerprintMeta) {
      continue;
    }

    try {
      const fingerprint = Buffer.from(fingerprintMeta.data, "base64");
      if (fingerprint.length === VISUAL_SEARCH_FINGERPRINT_LENGTH) {
        entries.push({
          imageUrl,
          fingerprint,
          fingerprintMeta,
        });
      }
    } catch (error) {
      // Ignore corrupt fingerprint metadata and let the caller rebuild it.
    }
  }

  return entries;
}

async function createProductVisualSearchFingerprintMeta(product, imageUrl = null) {
  const visualSearchImageUrl = String(
    imageUrl ?? product?.visualSearchImageUrl ?? "",
  ).trim();
  if (!visualSearchImageUrl) {
    return null;
  }

  const imagePath = resolvePublicFilePath(visualSearchImageUrl);
  if (!imagePath) {
    return null;
  }

  try {
    const imageBuffer = await fsPromises.readFile(imagePath);
    const fingerprint = await createVisualSearchFingerprint(imageBuffer);
    return createVisualSearchFingerprintMeta(fingerprint, visualSearchImageUrl);
  } catch (error) {
    return null;
  }
}

async function syncProductVisualSearchFingerprint(product, existingProduct = null) {
  const visualSearchImageAngles = normalizeProductVisualSearchImageAngles(product);
  const visualSearchImageUrls =
    getProductVisualSearchImageUrlsFromAngles(visualSearchImageAngles);
  const visualSearchImageUrl = getPrimaryProductVisualSearchImageUrl(product);
  if (!visualSearchImageUrls.length) {
    return {
      ...product,
      visualSearchImageUrl: "",
      visualSearchImageUrls: [],
      visualSearchImageAngles: {},
      visualSearchFingerprint: null,
      visualSearchFingerprints: [],
    };
  }

  const sourceFingerprintMetas = [
    ...normalizeVisualSearchFingerprintMetaList(
      product?.visualSearchFingerprints,
      visualSearchImageUrls,
    ),
    ...normalizeVisualSearchFingerprintMetaList(
      existingProduct?.visualSearchFingerprints,
      visualSearchImageUrls,
    ),
  ];
  const sourceSingleFingerprints = [
    product?.visualSearchFingerprint,
    existingProduct?.visualSearchFingerprint,
  ];
  const nextFingerprintMetas = [];

  for (const candidateImageUrl of visualSearchImageUrls) {
    let fingerprintMeta = findVisualSearchFingerprintMetaForUrl(
      [
        ...sourceFingerprintMetas,
        ...(candidateImageUrl === visualSearchImageUrl ? sourceSingleFingerprints : []),
      ],
      candidateImageUrl,
    );

    if (!fingerprintMeta) {
      fingerprintMeta = await createProductVisualSearchFingerprintMeta(
        product,
        candidateImageUrl,
      );
    }

    if (fingerprintMeta) {
      nextFingerprintMetas.push(fingerprintMeta);
    }
  }

  return {
    ...product,
    visualSearchImageUrl,
    visualSearchImageUrls,
    visualSearchImageAngles,
    visualSearchFingerprint: nextFingerprintMetas[0] ?? null,
    visualSearchFingerprints: nextFingerprintMetas,
  };
}

function compareVisualSearchFingerprints(firstFingerprint, secondFingerprint) {
  if (
    !Buffer.isBuffer(firstFingerprint) ||
    !Buffer.isBuffer(secondFingerprint) ||
    firstFingerprint.length === 0 ||
    firstFingerprint.length !== secondFingerprint.length
  ) {
    return 0;
  }

  let differenceTotal = 0;
  for (let index = 0; index < firstFingerprint.length; index += 1) {
    differenceTotal += Math.abs(firstFingerprint[index] - secondFingerprint[index]);
  }

  const averageDifference = differenceTotal / firstFingerprint.length;
  return Math.max(0, Math.min(1, 1 - averageDifference / 255));
}

function resolvePublicFilePath(fileUrl) {
  const rawUrl = String(fileUrl ?? "").trim();
  if (!rawUrl || rawUrl.startsWith("data:")) {
    return "";
  }

  let pathname = rawUrl;
  try {
    const parsedUrl = new URL(rawUrl, `http://127.0.0.1:${PORT}`);
    pathname = parsedUrl.pathname;
  } catch (error) {
    pathname = rawUrl;
  }

  let decodedPathname = "";
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch (error) {
    return "";
  }

  const normalizedRelativePath = path
    .normalize(decodedPathname.replace(/^[/\\]+/, ""))
    .replace(/^(\.\.[/\\])+/, "");
  const resolvedPublicDir = path.resolve(PUBLIC_DIR);
  const resolvedFilePath = path.resolve(PUBLIC_DIR, normalizedRelativePath);

  if (
    resolvedFilePath !== resolvedPublicDir &&
    !resolvedFilePath.startsWith(`${resolvedPublicDir}${path.sep}`)
  ) {
    return "";
  }

  const extension = path.extname(resolvedFilePath).toLowerCase();
  if (!MIME_TYPES[extension]?.startsWith("image/")) {
    return "";
  }

  return resolvedFilePath;
}

function getProductVisualSearchImageUrls(product) {
  const urls = [];
  const seen = new Set();

  function addUrl(value) {
    const url = String(value ?? "").trim();
    const key = url.toLowerCase();
    if (!url || seen.has(key)) {
      return;
    }

    seen.add(key);
    urls.push(url);
  }

  for (const imageUrl of normalizeProductVisualSearchImageUrls(product)) {
    addUrl(imageUrl);
  }
  addUrl(product?.visualSearchImageUrl);
  addUrl(product?.imageUrl);
  addUrl(product?.mainImageUrl);
  addUrl(product?.cardImageUrl);
  addUrl(product?.buyModalImageUrl);

  for (const imageUrl of product?.imageUrls ?? []) {
    addUrl(imageUrl);
  }

  for (const crop of product?.detailsImageCrops ?? []) {
    addUrl(crop?.croppedImageUrl);
    addUrl(crop?.sourceUrl);
  }

  for (const variant of product?.variants ?? []) {
    addUrl(variant?.imageUrl);
    addUrl(variant?.imageSourceUrl);
  }

  return urls;
}

function getDocumentUploadExtension(filename, contentType) {
  const filenameExtension = path.extname(filename ?? "").toLowerCase();
  if ([".pdf", ".doc", ".docx"].includes(filenameExtension)) {
    return filenameExtension;
  }

  switch (String(contentType ?? "").toLowerCase()) {
    case "application/pdf":
      return ".pdf";
    case "application/msword":
      return ".doc";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return ".docx";
    default:
      return "";
  }
}

function isVideoAttachmentSource(url, name = "") {
  const normalizedUrl = String(url ?? "").trim().toLowerCase();
  const normalizedName = String(name ?? "").trim().toLowerCase();
  const videoExtensions = [".mp4", ".mov", ".m4v", ".webm", ".avi", ".mkv", ".3gp"];

  return videoExtensions.some(
    (extension) =>
      normalizedUrl.endsWith(extension) || normalizedName.endsWith(extension),
  );
}

function normalizeProductImageUrls(rawImageUrls, fallbackImageUrl = "") {
  const submittedImageUrls = Array.isArray(rawImageUrls) ? rawImageUrls : [];
  const seen = new Set();
  const normalizedImageUrls = [];

  for (const candidate of submittedImageUrls) {
    const imageUrl = String(candidate ?? "").trim();
    const normalizedKey = imageUrl.toLowerCase();

    if (!imageUrl || seen.has(normalizedKey)) {
      continue;
    }

    seen.add(normalizedKey);
    normalizedImageUrls.push(imageUrl);
  }

  const trimmedFallbackImageUrl = String(fallbackImageUrl ?? "").trim();
  if (!normalizedImageUrls.length && trimmedFallbackImageUrl) {
    normalizedImageUrls.push(trimmedFallbackImageUrl);
  }

  return normalizedImageUrls;
}

function normalizeProductVideoUrls(rawVideoUrls, fallbackVideoUrl = "") {
  const submittedVideoUrls = Array.isArray(rawVideoUrls) ? rawVideoUrls : [];
  const seen = new Set();
  const normalizedVideoUrls = [];

  for (const candidate of submittedVideoUrls) {
    const videoUrl = String(candidate ?? "").trim();
    const normalizedKey = videoUrl.toLowerCase();

    if (!videoUrl || seen.has(normalizedKey)) {
      continue;
    }

    seen.add(normalizedKey);
    normalizedVideoUrls.push(videoUrl);
  }

  const trimmedFallbackVideoUrl = String(fallbackVideoUrl ?? "").trim();
  if (!normalizedVideoUrls.length && trimmedFallbackVideoUrl) {
    normalizedVideoUrls.push(trimmedFallbackVideoUrl);
  }

  return normalizedVideoUrls;
}

function normalizeProductVideoThumbnailUrls(
  rawVideoThumbnailUrls,
  videoUrls,
  fallbackVideoThumbnailUrl = "",
) {
  const normalizedVideoUrls = Array.isArray(videoUrls) ? videoUrls : [];
  if (!normalizedVideoUrls.length) {
    return [];
  }

  const submittedThumbnailUrls = Array.isArray(rawVideoThumbnailUrls)
    ? rawVideoThumbnailUrls
    : [];
  const trimmedFallbackThumbnailUrl = String(fallbackVideoThumbnailUrl ?? "").trim();

  return normalizedVideoUrls.map((_, slotIndex) => {
    const submittedThumbnailUrl = String(submittedThumbnailUrls[slotIndex] ?? "").trim();
    if (submittedThumbnailUrl) {
      return submittedThumbnailUrl;
    }

    return slotIndex === 0 ? trimmedFallbackThumbnailUrl : "";
  });
}

function normalizeProductModelScanImageUrls(rawImageUrls = []) {
  const submittedImageUrls = Array.isArray(rawImageUrls) ? rawImageUrls : [];
  const seen = new Set();
  const normalizedImageUrls = [];

  for (const candidate of submittedImageUrls) {
    const imageUrl = String(candidate ?? "").trim();
    const normalizedKey = imageUrl.toLowerCase();
    if (!imageUrl || seen.has(normalizedKey)) {
      continue;
    }

    seen.add(normalizedKey);
    normalizedImageUrls.push(imageUrl);
  }

  return normalizedImageUrls;
}

function normalizeProductModelFrameKey(value) {
  const normalizedValue = String(value ?? "").trim().toLowerCase();
  switch (normalizedValue) {
    case "front":
      return "front";
    case "right":
    case "right-side":
    case "right_side":
      return "right";
    case "back":
      return "back";
    case "left":
    case "left-side":
    case "left_side":
      return "left";
    case "top":
    case "up":
      return "top";
    case "bottom":
    case "down":
    case "detail":
      return "bottom";
    default:
      return "";
  }
}

function normalizeProductModelFrameInputs(input) {
  const framesByKey = new Map();
  const rawFrames = Array.isArray(input?.frames) ? input.frames : [];
  const rawImageUrls = Array.isArray(input?.imageUrls) ? input.imageUrls : [];

  for (const [index, rawFrame] of rawFrames.entries()) {
    const frameKey =
      normalizeProductModelFrameKey(rawFrame?.key ?? rawFrame?.angle) ||
      PRODUCT_MODEL_FRAME_ORDER[index] ||
      "";
    const imageUrl = String(rawFrame?.imageUrl ?? rawFrame?.url ?? "").trim();
    if (frameKey && imageUrl) {
      framesByKey.set(frameKey, imageUrl);
    }
  }

  for (const [index, rawImageUrl] of rawImageUrls.entries()) {
    const frameKey = PRODUCT_MODEL_FRAME_ORDER[index] || "";
    const imageUrl = String(rawImageUrl ?? "").trim();
    if (frameKey && imageUrl && !framesByKey.has(frameKey)) {
      framesByKey.set(frameKey, imageUrl);
    }
  }

  return PRODUCT_MODEL_FRAME_ORDER.map((key) => ({
    key,
    imageUrl: String(framesByKey.get(key) ?? "").trim(),
  }));
}

function clampNumber(value, min, max) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return min;
  }

  return Math.min(Math.max(numberValue, min), max);
}

function createProductModelBufferViewState() {
  return {
    chunks: [],
    bufferViews: [],
    byteLength: 0,
  };
}

function appendProductModelBuffer(state, buffer, target) {
  const padding = (4 - (state.byteLength % 4)) % 4;
  if (padding) {
    state.chunks.push(Buffer.alloc(padding));
    state.byteLength += padding;
  }

  const bufferViewIndex = state.bufferViews.length;
  state.bufferViews.push({
    buffer: 0,
    byteOffset: state.byteLength,
    byteLength: buffer.length,
    target,
  });
  state.chunks.push(buffer);
  state.byteLength += buffer.length;
  return bufferViewIndex;
}

function createFloat32Buffer(values) {
  const buffer = Buffer.alloc(values.length * 4);
  values.forEach((value, index) => {
    buffer.writeFloatLE(value, index * 4);
  });
  return buffer;
}

function createUint16Buffer(values) {
  const buffer = Buffer.alloc(values.length * 2);
  values.forEach((value, index) => {
    buffer.writeUInt16LE(value, index * 2);
  });
  return buffer;
}

function getProductModelVectorBounds(values) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];

  for (let index = 0; index < values.length; index += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      const value = values[index + axis];
      min[axis] = Math.min(min[axis], value);
      max[axis] = Math.max(max[axis], value);
    }
  }

  return { min, max };
}

function getProductModelDimensions(frameMetadataByKey) {
  const frontMetadata = frameMetadataByKey.front ?? {};
  const rightMetadata = frameMetadataByKey.right ?? {};
  const topMetadata = frameMetadataByKey.top ?? {};
  const frontAspect =
    Number(frontMetadata.width || 0) > 0 && Number(frontMetadata.height || 0) > 0
      ? frontMetadata.width / frontMetadata.height
      : 0.72;
  const rightAspect =
    Number(rightMetadata.width || 0) > 0 && Number(rightMetadata.height || 0) > 0
      ? rightMetadata.width / rightMetadata.height
      : 0.42;
  const topAspect =
    Number(topMetadata.width || 0) > 0 && Number(topMetadata.height || 0) > 0
      ? topMetadata.width / topMetadata.height
      : 0;

  const height = 2;
  const width = clampNumber(frontAspect * height, 0.72, 3);
  const sideDepth = clampNumber(rightAspect * height, 0.34, 2.2);
  const topDepth = topAspect > 0 ? clampNumber(width / topAspect, 0.34, 2.2) : sideDepth;
  const depth = clampNumber(sideDepth * 0.65 + topDepth * 0.35, 0.34, 2.2);

  return { width, height, depth };
}

function createTexturedProductBoxGltf(textureFileNames, frameMetadataByKey) {
  const { width, height, depth } = getProductModelDimensions(frameMetadataByKey);
  const x = width / 2;
  const y = height / 2;
  const z = depth / 2;
  const positions = [];
  const normals = [];
  const texcoords = [];
  const indices = [];
  const faceDefinitions = [
    {
      key: "front",
      normal: [0, 0, 1],
      vertices: [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]],
    },
    {
      key: "right",
      normal: [1, 0, 0],
      vertices: [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z]],
    },
    {
      key: "back",
      normal: [0, 0, -1],
      vertices: [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]],
    },
    {
      key: "left",
      normal: [-1, 0, 0],
      vertices: [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]],
    },
    {
      key: "top",
      normal: [0, 1, 0],
      vertices: [[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z]],
    },
    {
      key: "bottom",
      normal: [0, -1, 0],
      vertices: [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]],
    },
  ];

  for (const face of faceDefinitions) {
    const baseIndex = positions.length / 3;
    for (const vertex of face.vertices) {
      positions.push(...vertex);
      normals.push(...face.normal);
    }
    texcoords.push(0, 1, 1, 1, 1, 0, 0, 0);
    indices.push(
      baseIndex,
      baseIndex + 1,
      baseIndex + 2,
      baseIndex,
      baseIndex + 2,
      baseIndex + 3,
    );
  }

  const bufferState = createProductModelBufferViewState();
  const positionBufferView = appendProductModelBuffer(
    bufferState,
    createFloat32Buffer(positions),
    34962,
  );
  const normalBufferView = appendProductModelBuffer(
    bufferState,
    createFloat32Buffer(normals),
    34962,
  );
  const texcoordBufferView = appendProductModelBuffer(
    bufferState,
    createFloat32Buffer(texcoords),
    34962,
  );
  const indexBufferView = appendProductModelBuffer(
    bufferState,
    createUint16Buffer(indices),
    34963,
  );
  const combinedBuffer = Buffer.concat(bufferState.chunks);
  const positionBounds = getProductModelVectorBounds(positions);
  const accessors = [
    {
      bufferView: positionBufferView,
      componentType: 5126,
      count: positions.length / 3,
      type: "VEC3",
      min: positionBounds.min,
      max: positionBounds.max,
    },
    {
      bufferView: normalBufferView,
      componentType: 5126,
      count: normals.length / 3,
      type: "VEC3",
    },
    {
      bufferView: texcoordBufferView,
      componentType: 5126,
      count: texcoords.length / 2,
      type: "VEC2",
    },
  ];

  for (let faceIndex = 0; faceIndex < faceDefinitions.length; faceIndex += 1) {
    accessors.push({
      bufferView: indexBufferView,
      byteOffset: faceIndex * 6 * 2,
      componentType: 5123,
      count: 6,
      type: "SCALAR",
    });
  }

  return {
    asset: {
      version: "2.0",
      generator: "GMS Shopping six-frame model generator",
    },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: "Generated six-frame product model" }],
    meshes: [
      {
        primitives: faceDefinitions.map((face, index) => ({
          attributes: {
            POSITION: 0,
            NORMAL: 1,
            TEXCOORD_0: 2,
          },
          indices: 3 + index,
          material: index,
          mode: 4,
        })),
      },
    ],
    materials: faceDefinitions.map((face, index) => ({
      name: `${face.key} texture`,
      pbrMetallicRoughness: {
        baseColorTexture: { index },
        metallicFactor: 0,
        roughnessFactor: 0.82,
      },
      doubleSided: true,
    })),
    textures: textureFileNames.map((_, index) => ({ source: index })),
    images: textureFileNames.map((textureFileName) => ({
      uri: textureFileName,
      mimeType: "image/jpeg",
    })),
    buffers: [
      {
        uri: `data:application/octet-stream;base64,${combinedBuffer.toString("base64")}`,
        byteLength: combinedBuffer.length,
      },
    ],
    bufferViews: bufferState.bufferViews,
    accessors,
  };
}

function createTexturedProductCurvedGltf(textureFileNames, frameMetadataByKey) {
  const { width, height, depth } = getProductModelDimensions(frameMetadataByKey);
  const radiusX = width / 2;
  const radiusZ = depth / 2;
  const y = height / 2;
  const positions = [];
  const normals = [];
  const texcoords = [];
  const indices = [];
  const primitiveDefinitions = [];
  const sideDefinitions = [
    { key: "front", material: 0, start: -Math.PI / 4, end: Math.PI / 4 },
    { key: "right", material: 1, start: Math.PI / 4, end: (3 * Math.PI) / 4 },
    { key: "back", material: 2, start: (3 * Math.PI) / 4, end: (5 * Math.PI) / 4 },
    { key: "left", material: 3, start: (5 * Math.PI) / 4, end: (7 * Math.PI) / 4 },
  ];
  const sideSegmentCount = 18;
  const capSegmentCount = 72;

  const getEllipsePoint = (theta, yValue) => ({
    x: radiusX * Math.sin(theta),
    y: yValue,
    z: radiusZ * Math.cos(theta),
  });
  const getEllipseNormal = (theta) => {
    const rawX = Math.sin(theta) / Math.max(radiusX, 0.0001);
    const rawZ = Math.cos(theta) / Math.max(radiusZ, 0.0001);
    const length = Math.hypot(rawX, rawZ) || 1;
    return [rawX / length, 0, rawZ / length];
  };

  for (const side of sideDefinitions) {
    const baseVertexIndex = positions.length / 3;
    const indexStart = indices.length;
    for (let segmentIndex = 0; segmentIndex <= sideSegmentCount; segmentIndex += 1) {
      const progress = segmentIndex / sideSegmentCount;
      const theta = side.start + (side.end - side.start) * progress;
      const bottom = getEllipsePoint(theta, -y);
      const top = getEllipsePoint(theta, y);
      const normal = getEllipseNormal(theta);
      positions.push(bottom.x, bottom.y, bottom.z, top.x, top.y, top.z);
      normals.push(...normal, ...normal);
      texcoords.push(progress, 1, progress, 0);
    }

    for (let segmentIndex = 0; segmentIndex < sideSegmentCount; segmentIndex += 1) {
      const current = baseVertexIndex + segmentIndex * 2;
      const next = current + 2;
      indices.push(current, current + 1, next + 1, current, next + 1, next);
    }

    primitiveDefinitions.push({
      key: side.key,
      material: side.material,
      indexStart,
      indexCount: indices.length - indexStart,
    });
  }

  const appendCap = (key, material, yValue, normalY) => {
    const baseVertexIndex = positions.length / 3;
    const indexStart = indices.length;
    positions.push(0, yValue, 0);
    normals.push(0, normalY, 0);
    texcoords.push(0.5, 0.5);

    for (let segmentIndex = 0; segmentIndex <= capSegmentCount; segmentIndex += 1) {
      const theta = (Math.PI * 2 * segmentIndex) / capSegmentCount;
      const point = getEllipsePoint(theta, yValue);
      positions.push(point.x, point.y, point.z);
      normals.push(0, normalY, 0);
      texcoords.push(
        0.5 + point.x / Math.max(width, 0.0001),
        0.5 - point.z / Math.max(depth, 0.0001),
      );
    }

    for (let segmentIndex = 0; segmentIndex < capSegmentCount; segmentIndex += 1) {
      if (normalY > 0) {
        indices.push(baseVertexIndex, baseVertexIndex + segmentIndex + 1, baseVertexIndex + segmentIndex + 2);
      } else {
        indices.push(baseVertexIndex, baseVertexIndex + segmentIndex + 2, baseVertexIndex + segmentIndex + 1);
      }
    }

    primitiveDefinitions.push({
      key,
      material,
      indexStart,
      indexCount: indices.length - indexStart,
    });
  };

  appendCap("top", 4, y, 1);
  appendCap("bottom", 5, -y, -1);

  const bufferState = createProductModelBufferViewState();
  const positionBufferView = appendProductModelBuffer(
    bufferState,
    createFloat32Buffer(positions),
    34962,
  );
  const normalBufferView = appendProductModelBuffer(
    bufferState,
    createFloat32Buffer(normals),
    34962,
  );
  const texcoordBufferView = appendProductModelBuffer(
    bufferState,
    createFloat32Buffer(texcoords),
    34962,
  );
  const indexBufferView = appendProductModelBuffer(
    bufferState,
    createUint16Buffer(indices),
    34963,
  );
  const combinedBuffer = Buffer.concat(bufferState.chunks);
  const positionBounds = getProductModelVectorBounds(positions);
  const accessors = [
    {
      bufferView: positionBufferView,
      componentType: 5126,
      count: positions.length / 3,
      type: "VEC3",
      min: positionBounds.min,
      max: positionBounds.max,
    },
    {
      bufferView: normalBufferView,
      componentType: 5126,
      count: normals.length / 3,
      type: "VEC3",
    },
    {
      bufferView: texcoordBufferView,
      componentType: 5126,
      count: texcoords.length / 2,
      type: "VEC2",
    },
  ];

  for (const primitive of primitiveDefinitions) {
    accessors.push({
      bufferView: indexBufferView,
      byteOffset: primitive.indexStart * 2,
      componentType: 5123,
      count: primitive.indexCount,
      type: "SCALAR",
    });
  }

  return {
    asset: {
      version: "2.0",
      generator: "GMS Shopping curved six-frame model generator",
    },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: "Generated curved six-frame product model" }],
    meshes: [
      {
        primitives: primitiveDefinitions.map((primitive, index) => ({
          attributes: {
            POSITION: 0,
            NORMAL: 1,
            TEXCOORD_0: 2,
          },
          indices: 3 + index,
          material: primitive.material,
          mode: 4,
        })),
      },
    ],
    materials: PRODUCT_MODEL_FRAME_ORDER.map((frameKey, index) => ({
      name: `${frameKey} texture`,
      pbrMetallicRoughness: {
        baseColorTexture: { index },
        metallicFactor: 0,
        roughnessFactor: 0.72,
      },
      doubleSided: true,
    })),
    textures: textureFileNames.map((_, index) => ({ source: index })),
    images: textureFileNames.map((textureFileName) => ({
      uri: textureFileName,
      mimeType: "image/jpeg",
    })),
    buffers: [
      {
        uri: `data:application/octet-stream;base64,${combinedBuffer.toString("base64")}`,
        byteLength: combinedBuffer.length,
      },
    ],
    bufferViews: bufferState.bufferViews,
    accessors,
  };
}

function normalizeProductModelShape(value) {
  const normalizedValue = String(value ?? "").trim().toLowerCase();
  if (["curve", "curved", "round", "rounded", "cylinder", "oval"].includes(normalizedValue)) {
    return "curved";
  }
  return "box";
}

function normalizeProductScanFrameInputs(input) {
  const rawFrames = Array.isArray(input?.frames)
    ? input.frames
    : Array.isArray(input?.imageUrls)
      ? input.imageUrls.map((imageUrl) => ({ imageUrl }))
      : [];

  const normalizedFrames = [];
  for (let index = 0; index < rawFrames.length; index += 1) {
    const frame = rawFrames[index];
    const imageUrl =
      typeof frame === "string"
        ? frame
        : frame?.imageUrl ?? frame?.url ?? frame?.src ?? "";
    const normalizedImageUrl = String(imageUrl ?? "").trim();
    if (!normalizedImageUrl) {
      continue;
    }

    normalizedFrames.push({
      key: `scan-${normalizedFrames.length + 1}`,
      imageUrl: normalizedImageUrl,
    });
  }

  return normalizedFrames.slice(0, 80);
}

function createAverageColorFromSamples(samples) {
  if (!samples.length) {
    return [245, 245, 245];
  }

  const totals = samples.reduce(
    (sum, sample) => [
      sum[0] + sample[0],
      sum[1] + sample[1],
      sum[2] + sample[2],
    ],
    [0, 0, 0],
  );
  return totals.map((value) => value / samples.length);
}

function getScanTextureBackgroundColor(data, info) {
  const sampleStride = Math.max(1, Math.floor(Math.min(info.width, info.height) / 48));
  const edgeSize = Math.max(10, Math.floor(Math.min(info.width, info.height) * 0.07));
  const samples = [];

  for (let y = 0; y < info.height; y += sampleStride) {
    for (let x = 0; x < info.width; x += sampleStride) {
      const isEdge =
        x < edgeSize ||
        y < edgeSize ||
        x >= info.width - edgeSize ||
        y >= info.height - edgeSize;
      if (!isEdge) {
        continue;
      }

      const offset = (y * info.width + x) * info.channels;
      samples.push([data[offset], data[offset + 1], data[offset + 2]]);
    }
  }

  return createAverageColorFromSamples(samples);
}

async function createProductScanTextureBuffer(frameFilePath) {
  const resizedImage = sharp(frameFilePath)
    .rotate()
    .resize({
      width: PRODUCT_MODEL_TEXTURE_MAX_SIZE,
      height: PRODUCT_MODEL_TEXTURE_MAX_SIZE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .ensureAlpha();
  const { data, info } = await resizedImage
    .raw()
    .toBuffer({ resolveWithObject: true });
  const backgroundColor = getScanTextureBackgroundColor(data, info);
  const output = Buffer.alloc(info.width * info.height * 4);
  let left = info.width;
  let top = info.height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const sourceOffset = (y * info.width + x) * info.channels;
      const targetOffset = (y * info.width + x) * 4;
      const red = data[sourceOffset];
      const green = data[sourceOffset + 1];
      const blue = data[sourceOffset + 2];
      const sourceAlpha = info.channels >= 4 ? data[sourceOffset + 3] : 255;
      const maxChannel = Math.max(red, green, blue);
      const minChannel = Math.min(red, green, blue);
      const saturation = maxChannel > 0 ? (maxChannel - minChannel) / maxChannel : 0;
      const colorDistance =
        Math.abs(red - backgroundColor[0]) +
        Math.abs(green - backgroundColor[1]) +
        Math.abs(blue - backgroundColor[2]);
      const brightNeutral =
        maxChannel > 210 &&
        saturation < 0.15 &&
        colorDistance < 95;
      const foregroundStrength = brightNeutral
        ? Math.max(0, colorDistance - 36) / 52
        : Math.max(colorDistance / 72, saturation * 2.2);
      const alpha = clampNumber(foregroundStrength, 0, 1) * sourceAlpha;
      const roundedAlpha = Math.round(Math.min(255, Math.max(0, alpha)));

      output[targetOffset] = red;
      output[targetOffset + 1] = green;
      output[targetOffset + 2] = blue;
      output[targetOffset + 3] = roundedAlpha;

      if (roundedAlpha > 18) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }

  if (right < left || bottom < top) {
    left = 0;
    top = 0;
    right = info.width - 1;
    bottom = info.height - 1;
  }

  const marginX = Math.max(2, Math.round((right - left + 1) * 0.035));
  const marginY = Math.max(2, Math.round((bottom - top + 1) * 0.04));
  const crop = {
    left: Math.max(0, left - marginX),
    top: Math.max(0, top - marginY),
    width: Math.min(info.width - Math.max(0, left - marginX), right - left + 1 + marginX * 2),
    height: Math.min(info.height - Math.max(0, top - marginY), bottom - top + 1 + marginY * 2),
  };
  const pngBuffer = await sharp(output, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .extract(crop)
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
    })
    .toBuffer();
  const metadata = await sharp(pngBuffer).metadata();

  return {
    buffer: pngBuffer,
    width: Number(metadata.width || crop.width),
    height: Number(metadata.height || crop.height),
  };
}

function createProductScanShellGltf(textureFileNames, frameMetadata) {
  const frameCount = Math.max(1, textureFileNames.length);
  const averageAspect =
    frameMetadata.reduce((sum, metadata) => {
      const width = Number(metadata?.width || 0);
      const height = Number(metadata?.height || 0);
      return sum + (width > 0 && height > 0 ? width / height : 0.72);
    }, 0) / frameCount;
  const height = 2;
  const planeWidth = clampNumber(averageAspect * height, 0.65, 2.2);
  const radius = clampNumber(planeWidth * 0.24, 0.18, 0.62);
  const positions = [];
  const normals = [];
  const texcoords = [];
  const indices = [];
  const primitiveDefinitions = [];

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const angle = (Math.PI * 2 * frameIndex) / frameCount;
    const normal = [Math.sin(angle), 0, Math.cos(angle)];
    const tangent = [Math.cos(angle), 0, -Math.sin(angle)];
    const center = [normal[0] * radius, 0, normal[2] * radius];
    const halfWidth = planeWidth / 2;
    const halfHeight = height / 2;
    const baseIndex = positions.length / 3;
    const indexStart = indices.length;
    const corners = [
      [-halfWidth, -halfHeight],
      [halfWidth, -halfHeight],
      [halfWidth, halfHeight],
      [-halfWidth, halfHeight],
    ];

    for (const [xOffset, yOffset] of corners) {
      positions.push(
        center[0] + tangent[0] * xOffset,
        yOffset,
        center[2] + tangent[2] * xOffset,
      );
      normals.push(...normal);
    }
    texcoords.push(0, 1, 1, 1, 1, 0, 0, 0);
    indices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3);
    primitiveDefinitions.push({
      indexStart,
      indexCount: indices.length - indexStart,
      material: frameIndex,
    });
  }

  const bufferState = createProductModelBufferViewState();
  const positionBufferView = appendProductModelBuffer(
    bufferState,
    createFloat32Buffer(positions),
    34962,
  );
  const normalBufferView = appendProductModelBuffer(
    bufferState,
    createFloat32Buffer(normals),
    34962,
  );
  const texcoordBufferView = appendProductModelBuffer(
    bufferState,
    createFloat32Buffer(texcoords),
    34962,
  );
  const indexBufferView = appendProductModelBuffer(
    bufferState,
    createUint16Buffer(indices),
    34963,
  );
  const combinedBuffer = Buffer.concat(bufferState.chunks);
  const positionBounds = getProductModelVectorBounds(positions);
  const accessors = [
    {
      bufferView: positionBufferView,
      componentType: 5126,
      count: positions.length / 3,
      type: "VEC3",
      min: positionBounds.min,
      max: positionBounds.max,
    },
    {
      bufferView: normalBufferView,
      componentType: 5126,
      count: normals.length / 3,
      type: "VEC3",
    },
    {
      bufferView: texcoordBufferView,
      componentType: 5126,
      count: texcoords.length / 2,
      type: "VEC2",
    },
  ];

  for (const primitive of primitiveDefinitions) {
    accessors.push({
      bufferView: indexBufferView,
      byteOffset: primitive.indexStart * 2,
      componentType: 5123,
      count: primitive.indexCount,
      type: "SCALAR",
    });
  }

  return {
    asset: {
      version: "2.0",
      generator: "GMS Shopping any-shape photo scan generator",
    },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: "Generated any-shape photo scan shell" }],
    meshes: [
      {
        primitives: primitiveDefinitions.map((primitive, index) => ({
          attributes: {
            POSITION: 0,
            NORMAL: 1,
            TEXCOORD_0: 2,
          },
          indices: 3 + index,
          material: primitive.material,
          mode: 4,
        })),
      },
    ],
    materials: textureFileNames.map((_, index) => ({
      name: `scan frame ${index + 1}`,
      pbrMetallicRoughness: {
        baseColorTexture: { index },
        metallicFactor: 0,
        roughnessFactor: 0.85,
      },
      alphaMode: "BLEND",
      alphaCutoff: 0.04,
      doubleSided: true,
    })),
    textures: textureFileNames.map((_, index) => ({ source: index })),
    images: textureFileNames.map((textureFileName) => ({
      uri: textureFileName,
      mimeType: "image/png",
    })),
    buffers: [
      {
        uri: `data:application/octet-stream;base64,${combinedBuffer.toString("base64")}`,
        byteLength: combinedBuffer.length,
      },
    ],
    bufferViews: bufferState.bufferViews,
    accessors,
  };
}

async function createProductModelFromScanImages(input) {
  if (!sharp) {
    throw createHttpError(
      'Any-shape scan generation needs the "sharp" package to prepare scan textures.',
      503,
    );
  }

  const normalizedFrames = normalizeProductScanFrameInputs(input);
  if (normalizedFrames.length < 8) {
    throw new Error("Upload at least 8 scan photos. 30 or more photos gives a better 3D scan.");
  }

  const timestamp = Date.now();
  const safeStem =
    sanitizeFileStem(input?.name ?? input?.productName ?? "any-shape-product") ||
    "any-shape-product";
  const textureFileNames = [];
  const frameMetadata = [];

  for (let index = 0; index < normalizedFrames.length; index += 1) {
    const frame = normalizedFrames[index];
    const frameFilePath = resolvePublicFilePath(frame.imageUrl);
    if (!frameFilePath) {
      throw new Error(`Invalid scan frame ${index + 1}.`);
    }

    const texture = await createProductScanTextureBuffer(frameFilePath);
    const textureFileName = `${safeStem}-scan-${String(index + 1).padStart(2, "0")}-${timestamp}.png`;
    await fsPromises.writeFile(path.join(UPLOADS_DIR, textureFileName), texture.buffer);
    textureFileNames.push(textureFileName);
    frameMetadata.push({
      width: texture.width,
      height: texture.height,
    });
  }

  const gltf = createProductScanShellGltf(textureFileNames, frameMetadata);
  const modelFileName = `${safeStem}-any-shape-scan-${timestamp}.gltf`;
  await fsPromises.writeFile(
    path.join(UPLOADS_DIR, modelFileName),
    `${JSON.stringify(gltf, null, 2)}\n`,
    "utf8",
  );

  return {
    modelUrl: `/uploads/${modelFileName}`,
    modelShape: "scan",
    textureUrls: textureFileNames.map((fileName) => `/uploads/${fileName}`),
    frameImageUrls: normalizedFrames.map((frame) => frame.imageUrl),
  };
}

async function createProductModelFromFrameImages(input) {
  if (!sharp) {
    throw createHttpError(
      '3D model generation needs the "sharp" package to prepare frame textures.',
      503,
    );
  }

  const normalizedFrames = normalizeProductModelFrameInputs(input);
  const missingFrame = normalizedFrames.find((frame) => !frame.imageUrl);
  if (missingFrame) {
    throw new Error("Upload all 6 product frames before generating the 3D model.");
  }

  const timestamp = Date.now();
  const safeStem =
    sanitizeFileStem(input?.name ?? input?.productName ?? "product-model") ||
    "product-model";
  const textureFileNamesByKey = {};
  const frameMetadataByKey = {};

  for (const frame of normalizedFrames) {
    const frameFilePath = resolvePublicFilePath(frame.imageUrl);
    if (!frameFilePath) {
      throw new Error(`Invalid ${frame.key} frame image.`);
    }

    const textureFileName = `${safeStem}-3d-${frame.key}-${timestamp}.jpg`;
    const textureFilePath = path.join(UPLOADS_DIR, textureFileName);
    const frameImage = sharp(frameFilePath).rotate();
    frameMetadataByKey[frame.key] = await frameImage.metadata();
    const textureBuffer = await frameImage
      .clone()
      .resize({
        width: PRODUCT_MODEL_TEXTURE_MAX_SIZE,
        height: PRODUCT_MODEL_TEXTURE_MAX_SIZE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 88,
        mozjpeg: true,
      })
      .toBuffer();

    await fsPromises.writeFile(textureFilePath, textureBuffer);
    textureFileNamesByKey[frame.key] = textureFileName;
  }

  const textureFileNames = PRODUCT_MODEL_FRAME_ORDER.map(
    (frameKey) => textureFileNamesByKey[frameKey],
  );
  const modelShape = normalizeProductModelShape(input?.shape ?? input?.modelShape);
  const gltf =
    modelShape === "curved"
      ? createTexturedProductCurvedGltf(textureFileNames, frameMetadataByKey)
      : createTexturedProductBoxGltf(textureFileNames, frameMetadataByKey);
  const modelFileName = `${safeStem}-${modelShape}-generated-3d-${timestamp}.gltf`;
  await fsPromises.writeFile(
    path.join(UPLOADS_DIR, modelFileName),
    `${JSON.stringify(gltf, null, 2)}\n`,
    "utf8",
  );

  return {
    modelUrl: `/uploads/${modelFileName}`,
    modelShape,
    textureUrls: textureFileNames.map((fileName) => `/uploads/${fileName}`),
    frameImageUrls: normalizedFrames.map((frame) => frame.imageUrl),
  };
}

function resolveProductMainImageIndex(imageUrls, requestedMainImageIndex, fallbackImageUrl = "") {
  if (!imageUrls.length) {
    return 0;
  }

  const normalizedMainImageIndex = Number(requestedMainImageIndex);
  if (
    Number.isInteger(normalizedMainImageIndex) &&
    normalizedMainImageIndex >= 0 &&
    normalizedMainImageIndex < imageUrls.length
  ) {
    return normalizedMainImageIndex;
  }

  const trimmedFallbackImageUrl = String(fallbackImageUrl ?? "").trim();
  const fallbackIndex = trimmedFallbackImageUrl
    ? imageUrls.indexOf(trimmedFallbackImageUrl)
    : -1;

  return fallbackIndex >= 0 ? fallbackIndex : 0;
}

function normalizeProductCardImagePosition(value, fallback = 50) {
  const normalizedValue = Number(value ?? fallback);
  if (!Number.isFinite(normalizedValue)) {
    return fallback;
  }

  return Math.min(100, Math.max(0, normalizedValue));
}

function normalizeProductCropZoomPercent(value, fallback = 0) {
  const normalizedValue = Number(value ?? fallback);
  if (!Number.isFinite(normalizedValue)) {
    return fallback;
  }

  return Math.min(500, Math.max(0, Math.round(normalizedValue)));
}

function normalizeProductVisibleFraction(value, fallback = 0) {
  const normalizedValue = Number(value ?? fallback);
  if (!Number.isFinite(normalizedValue)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, normalizedValue));
}

function normalizeProductMediaTimeMs(value, fallback = 0) {
  const normalizedValue = Number(value ?? fallback);
  if (!Number.isFinite(normalizedValue)) {
    return fallback;
  }

  return Math.max(0, Math.round(normalizedValue));
}

function normalizeProductDetailsImageCrops(
  rawDetailsImageCrops,
  imageUrls,
  existingDetailsImageCrops = [],
) {
  const submittedCrops = Array.isArray(rawDetailsImageCrops)
    ? rawDetailsImageCrops
    : Array.isArray(existingDetailsImageCrops)
      ? existingDetailsImageCrops
      : [];
  const validSourceKeys = new Set(
    (Array.isArray(imageUrls) ? imageUrls : [])
      .map((imageUrl) => String(imageUrl ?? "").trim().toLowerCase())
      .filter(Boolean),
  );
  const seen = new Set();
  const normalizedCrops = [];

  for (const cropEntry of submittedCrops) {
    const sourceUrl = String(cropEntry?.sourceUrl ?? "").trim();
    const croppedImageUrl = String(cropEntry?.croppedImageUrl ?? "").trim();
    const sourceKey = sourceUrl.toLowerCase();

    if (
      !sourceUrl ||
      !croppedImageUrl ||
      !validSourceKeys.has(sourceKey) ||
      seen.has(sourceKey)
    ) {
      continue;
    }

    seen.add(sourceKey);
    normalizedCrops.push({
      sourceUrl,
      croppedImageUrl,
      positionX: normalizeProductCardImagePosition(cropEntry?.positionX),
      positionY: normalizeProductCardImagePosition(cropEntry?.positionY),
    });
  }

  return normalizedCrops;
}

function normalizeStoredProductImageGallery(product) {
  const fallbackImageUrl = String(
    product?.imageUrl ?? product?.mainImageUrl ?? "",
  ).trim();
  const imageUrls = normalizeProductImageUrls(
    product?.imageUrls,
    fallbackImageUrl,
  );
  const mainImageIndex = resolveProductMainImageIndex(
    imageUrls,
    product?.mainImageIndex,
    String(product?.mainImageUrl ?? fallbackImageUrl).trim(),
  );
  const resolvedMainImageUrl = imageUrls[mainImageIndex] ?? "";
  const requestedCardImageUrl = String(product?.cardImageUrl ?? "").trim();
  const requestedCardImageSourceUrl = String(product?.cardImageSourceUrl ?? "").trim();
  const cardImageSourceUrl =
    requestedCardImageSourceUrl && requestedCardImageSourceUrl === resolvedMainImageUrl
      ? requestedCardImageSourceUrl
      : "";
  const cardImageUrl = cardImageSourceUrl && requestedCardImageUrl ? requestedCardImageUrl : "";
  const detailsImageCrops = normalizeProductDetailsImageCrops(
    product?.detailsImageCrops,
    imageUrls,
  );

  return {
    ...product,
    imageUrl: resolvedMainImageUrl,
    mainImageUrl: resolvedMainImageUrl,
    imageUrls,
    mainImageIndex,
    cardImageUrl,
    cardImageSourceUrl,
    detailsImageCrops,
    cardImagePositionX: normalizeProductCardImagePosition(product?.cardImagePositionX),
    cardImagePosition: normalizeProductCardImagePosition(product?.cardImagePosition),
  };
}

function normalizeVariantName(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeVariantQuantity(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeVariantAddOns(inputAddOns) {
  if (!Array.isArray(inputAddOns) || !inputAddOns.length) {
    return [];
  }

  const seen = new Set();
  const normalizedAddOns = [];

  for (const addOn of inputAddOns) {
    const id = String(addOn?.id ?? "").trim();
    const name = String(addOn?.name ?? "").replace(/\s+/g, " ").trim();
    const quantity = parseNumberInput(addOn?.quantity ?? 1);
    const normalizedKey = id.toLowerCase();

    if (
      !id ||
      !name ||
      seen.has(normalizedKey) ||
      !Number.isFinite(quantity) ||
      quantity < 1 ||
      !Number.isInteger(quantity)
    ) {
      continue;
    }

    seen.add(normalizedKey);
    normalizedAddOns.push({ id, name, quantity });
  }

  return normalizedAddOns;
}

function normalizeProductVariants(inputVariants, imageUrls, existingVariants = []) {
  const submittedVariants = Array.isArray(inputVariants) ? inputVariants : [];

  if (!submittedVariants.length) {
    return [];
  }

  return submittedVariants.map((variant, index) => {
    const submittedVariantId = String(variant?.id ?? "").trim();
    const existingVariant = Array.isArray(existingVariants)
      ? existingVariants.find(
          (candidate) => String(candidate?.id ?? "").trim() === submittedVariantId,
        ) ?? existingVariants[index] ?? null
      : null;
    const name = normalizeVariantName(variant?.name);
    const imageUrl = String(variant?.imageUrl ?? "").trim();
    const imageSourceUrl = String(
      variant?.imageSourceUrl ?? existingVariant?.imageSourceUrl ?? imageUrl,
    ).trim();
    const addOns = normalizeVariantAddOns(variant?.addOns);
    const originalPrice = parsePriceInput(variant?.originalPrice);
    const hasSalesPrice = hasInputValue(variant?.salesPrice);
    const salesPrice = hasSalesPrice ? parsePriceInput(variant?.salesPrice) : null;
    const imagePositionX = normalizeProductCardImagePosition(
      variant?.imagePositionX ?? existingVariant?.imagePositionX,
      50,
    );
    const imagePositionY = normalizeProductCardImagePosition(
      variant?.imagePositionY ?? existingVariant?.imagePositionY,
      50,
    );

    if (!name) {
      throw new Error(`Variant ${index + 1} name is required.`);
    }

    if (!imageUrl) {
      throw new Error(`Variant ${index + 1} image is required.`);
    }

    if (!Number.isFinite(originalPrice) || originalPrice < 0) {
      throw new Error(`Variant ${index + 1} original price must be valid.`);
    }

    if (hasSalesPrice) {
      if (!Number.isFinite(salesPrice) || salesPrice < 0) {
        throw new Error(`Variant ${index + 1} sales price must be valid.`);
      }

      if (salesPrice > originalPrice) {
        throw new Error(`Variant ${index + 1} sales price cannot be higher than original price.`);
      }
    }

    return {
      id: submittedVariantId || String(existingVariant?.id ?? `var-${Date.now()}-${index + 1}`),
      name,
      imageUrl,
      imageSourceUrl: imageSourceUrl || imageUrl,
      imagePositionX,
      imagePositionY,
      addOns,
      originalPrice,
      salesPrice,
      quantity: "",
      stock: 0,
    };
  });
}

function normalizeStoredProductVariants(product) {
  const variants = Array.isArray(product?.variants)
    ? product.variants.map((variant, index) => {
        const name = normalizeVariantName(variant?.name);
        const imageUrl = String(variant?.imageUrl ?? "").trim();
        const imageSourceUrl = String(variant?.imageSourceUrl ?? imageUrl).trim();
        const addOns = normalizeVariantAddOns(variant?.addOns);
        const originalPrice = Number(variant?.originalPrice ?? 0);
        const salesPrice = hasInputValue(variant?.salesPrice)
          ? Number(variant.salesPrice)
          : null;
        const stock = Number(variant?.stock ?? 0);
        const imagePositionX = normalizeProductCardImagePosition(
          variant?.imagePositionX,
          50,
        );
        const imagePositionY = normalizeProductCardImagePosition(
          variant?.imagePositionY,
          50,
        );

        if (
          !name ||
          !imageUrl ||
          !Number.isFinite(originalPrice) ||
          originalPrice < 0 ||
          !Number.isFinite(stock) ||
          stock < 0
        ) {
          return null;
        }

        const normalizedSalesPrice =
          salesPrice === null || !Number.isFinite(salesPrice) || salesPrice < 0
            ? null
            : salesPrice;

        return {
          id: String(variant?.id ?? `var-${product?.id ?? "product"}-${index + 1}`),
          name,
          imageUrl,
          imageSourceUrl: imageSourceUrl || imageUrl,
          imagePositionX,
          imagePositionY,
          addOns,
          originalPrice,
          salesPrice:
            normalizedSalesPrice !== null && normalizedSalesPrice <= originalPrice
              ? normalizedSalesPrice
              : null,
          quantity: "",
          stock: Math.trunc(stock),
        };
      }).filter(Boolean)
    : [];

  return {
    ...product,
    variants,
  };
}

function normalizeProductActiveState(value, fallback = true) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value !== 0 : fallback;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();
    if (normalizedValue === "true") {
      return true;
    }
    if (normalizedValue === "false") {
      return false;
    }
  }

  return fallback;
}

function normalizeProductApprovalStatus(value, fallback = PRODUCT_APPROVAL_APPROVED) {
  const normalizedValue = String(value ?? "").trim().toLowerCase();
  if (normalizedValue === PRODUCT_APPROVAL_PENDING) {
    return PRODUCT_APPROVAL_PENDING;
  }
  if (normalizedValue === PRODUCT_APPROVAL_APPROVED) {
    return PRODUCT_APPROVAL_APPROVED;
  }

  return fallback === PRODUCT_APPROVAL_PENDING
    ? PRODUCT_APPROVAL_PENDING
    : PRODUCT_APPROVAL_APPROVED;
}

function isProductPendingApproval(product) {
  return normalizeProductApprovalStatus(
    product?.approvalStatus,
    PRODUCT_APPROVAL_APPROVED,
  ) === PRODUCT_APPROVAL_PENDING;
}

function isProductApprovedForApp(product) {
  return normalizeProductApprovalStatus(
    product?.approvalStatus,
    PRODUCT_APPROVAL_APPROVED,
  ) === PRODUCT_APPROVAL_APPROVED;
}

function normalizeOptionalProductDateTime(value, fallback = "") {
  const normalizedValue = value ?? fallback ?? "";
  const trimmedValue = String(normalizedValue).trim();

  if (!trimmedValue) {
    return "";
  }

  const parsedDate = new Date(trimmedValue);
  return Number.isNaN(parsedDate.getTime()) ? "" : parsedDate.toISOString();
}

function getUtcDateStartTimestamp(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return NaN;
  }

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function isNormalizedProductDateExpired(value) {
  const normalizedValue = normalizeOptionalProductDateTime(value);
  if (!normalizedValue) {
    return false;
  }

  const parsedDate = new Date(normalizedValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  return getUtcDateStartTimestamp(parsedDate) < getUtcDateStartTimestamp(new Date());
}

function getNormalizedProductStockedDate(product) {
  return normalizeOptionalProductDateTime(
    product?.stockedDate ??
      product?.stockDate ??
      product?.dateStocked ??
      product?.createdAt,
  );
}

function getNormalizedProductUpdatedAt(product) {
  return normalizeOptionalProductDateTime(
    product?.updatedAt ??
      product?.modifiedAt ??
      product?.lastModifiedAt ??
      product?.stockedDate ??
      product?.lastRestockedAt ??
      product?.lastOutOfStockAt ??
      product?.createdAt,
  );
}

function normalizeOptionalWholeNumber(value, fallback = 0) {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return fallback;
  }

  return Math.trunc(parsedValue);
}

function getNormalizedProductInventoryStock(product, fallback = 0) {
  return normalizeOptionalWholeNumber(
    product?.inventoryStock ??
      product?.stock,
    fallback,
  );
}

function getNormalizedProductLastRestockPreviousStock(product) {
  return normalizeOptionalWholeNumber(
    product?.lastRestockPreviousStock ??
      product?.oldStockCount ??
      product?.previousStockCount,
    0,
  );
}

function getNormalizedProductLastRestockPreviousExpiryDate(product) {
  return normalizeOptionalProductDateTime(
    product?.lastRestockPreviousExpiryDate ??
      product?.oldStockExpiryDate ??
      product?.previousExpiryDate,
  );
}

function getNormalizedProductLastRestockAddedStock(product) {
  return normalizeOptionalWholeNumber(
    product?.lastRestockAddedStock ??
      product?.newStockCount ??
      product?.addedStockCount,
    0,
  );
}

function getNormalizedProductLastRestockExpiryDate(product) {
  return normalizeOptionalProductDateTime(
    product?.lastRestockExpiryDate ??
      product?.newStockDate ??
      product?.newStockExpiryDate ??
      product?.restockExpiryDate,
  );
}

function getNormalizedProductLastRestockedAt(product) {
  return normalizeOptionalProductDateTime(
    product?.lastRestockedAt ??
      product?.restockedAt ??
      product?.stockAddedAt,
  );
}

function getNormalizedProductLastStockAddedQuantity(product) {
  return normalizeOptionalWholeNumber(
    product?.lastStockAddedQuantity ??
      product?.lastAddedStockQuantity ??
      product?.lastAddStockQuantity,
    0,
  );
}

function getNormalizedProductLastStockDeductedQuantity(product) {
  return normalizeOptionalWholeNumber(
    product?.lastStockDeductedQuantity ??
      product?.lastDeductedStockQuantity ??
      product?.lastDeductStockQuantity,
    0,
  );
}

function resolveNormalizedProductSellableStock(product, fallbackStock = 0) {
  const normalizedFallbackStock = normalizeOptionalWholeNumber(fallbackStock, 0);
  const primaryExpiryDate = normalizeOptionalProductDateTime(
    product?.expiryDate ??
      product?.expirationDate ??
      product?.expiredDate ??
      product?.expireDate ??
      product?.bestBeforeDate ??
      product?.bestBefore,
  );
  const previousStock = getNormalizedProductLastRestockPreviousStock(product);
  const addedStock = getNormalizedProductLastRestockAddedStock(product);
  const previousExpiryDate =
    getNormalizedProductLastRestockPreviousExpiryDate(product) ||
    (previousStock > 0 && addedStock <= 0 ? primaryExpiryDate : "");
  const addedExpiryDate =
    getNormalizedProductLastRestockExpiryDate(product) ||
    (addedStock > 0 ? primaryExpiryDate : "");
  const hasRestockMeta =
    previousStock > 0 ||
    addedStock > 0 ||
    Boolean(previousExpiryDate) ||
    Boolean(addedExpiryDate);

  if (hasRestockMeta) {
    const sellablePreviousStock = isNormalizedProductDateExpired(previousExpiryDate)
      ? 0
      : previousStock;
    const sellableAddedStock = isNormalizedProductDateExpired(addedExpiryDate)
      ? 0
      : addedStock;
    return sellablePreviousStock + sellableAddedStock;
  }

  return isNormalizedProductDateExpired(primaryExpiryDate) ? 0 : normalizedFallbackStock;
}

function resolveProductLastStockAdjustmentMeta(input, existingProduct, stock) {
  const hasExplicitAddedQuantity = Object.prototype.hasOwnProperty.call(
    input ?? {},
    "lastStockAddedQuantity",
  );
  const explicitAddedQuantity = hasExplicitAddedQuantity
    ? normalizeOptionalWholeNumber(input.lastStockAddedQuantity, 0)
    : getNormalizedProductLastStockAddedQuantity(existingProduct);
  const hasExplicitDeductedQuantity = Object.prototype.hasOwnProperty.call(
    input ?? {},
    "lastStockDeductedQuantity",
  );
  const explicitDeductedQuantity = hasExplicitDeductedQuantity
    ? normalizeOptionalWholeNumber(input.lastStockDeductedQuantity, 0)
    : getNormalizedProductLastStockDeductedQuantity(existingProduct);

  const previousStock = existingProduct
    ? getNormalizedProductInventoryStock(existingProduct, 0)
    : null;

  if (previousStock !== null && stock > previousStock) {
    return {
      addedQuantity: stock - previousStock,
      deductedQuantity: 0,
    };
  }

  if (previousStock !== null && stock < previousStock) {
    return {
      addedQuantity: 0,
      deductedQuantity: previousStock - stock,
    };
  }

  return {
    addedQuantity: explicitAddedQuantity,
    deductedQuantity: explicitDeductedQuantity,
  };
}

function normalizeProductStockHistoryLabel(value, fallback = "Saved Stock") {
  const normalizedValue = String(value ?? fallback ?? "").replace(/\s+/g, " ").trim();
  return normalizedValue || fallback;
}

function normalizeProductStockHistoryBatchRole(value) {
  const normalizedValue = String(value ?? "").trim().toLowerCase();
  return normalizedValue === "expired" || normalizedValue === "fresh"
    ? normalizedValue
    : "";
}

function normalizeProductStockHistoryReason(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeProductStockHistoryEntry(entry, index = 0, fallback = {}) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const fallbackModifiedAt = normalizeOptionalProductDateTime(
    fallback?.modifiedAt,
    new Date().toISOString(),
  ) || new Date().toISOString();
  const modifiedAt = normalizeOptionalProductDateTime(
    entry.modifiedAt ??
      entry.updatedAt ??
      entry.timestamp ??
      entry.savedAt ??
      fallback?.modifiedAt,
    fallbackModifiedAt,
  ) || fallbackModifiedAt;
  const stock = normalizeOptionalWholeNumber(
    entry.stock ??
      entry.stocks ??
      entry.stockAfter ??
      fallback?.stock,
    0,
  );
  const addedQuantity = normalizeOptionalWholeNumber(
    entry.addedQuantity ??
      entry.addedStock ??
      entry.add ??
      entry.lastStockAddedQuantity ??
      fallback?.addedQuantity,
    0,
  );
  const deductedQuantity = normalizeOptionalWholeNumber(
    entry.deductedQuantity ??
      entry.deductedStock ??
      entry.deduct ??
      entry.lastStockDeductedQuantity ??
      fallback?.deductedQuantity,
    0,
  );
  const expiryDate = normalizeOptionalProductDateTime(
    entry.expiryDate ??
      entry.expireDate ??
      entry.expirationDate ??
      fallback?.expiryDate,
  );
  const label = normalizeProductStockHistoryLabel(
    entry.label,
    addedQuantity > 0
      ? "Added Stock"
      : deductedQuantity > 0
        ? "Deducted Stock"
        : "Saved Stock",
  );
  const batchRole = normalizeProductStockHistoryBatchRole(
    entry.batchRole ??
      entry.stockBatchRole ??
      entry.batch,
  );
  const reason = normalizeProductStockHistoryReason(
    entry.reason ??
      entry.deductReason,
  );
  const explicitId = String(entry.id ?? "").trim();

  return {
    id: explicitId || `stock-history-${Date.parse(modifiedAt) || Date.now()}-${index + 1}`,
    stock,
    addedQuantity,
    deductedQuantity,
    expiryDate,
    modifiedAt,
    reason,
    label,
    ...(batchRole ? { batchRole } : {}),
  };
}

function normalizeProductStockHistoryEntries(entries, fallbackEntries = [], fallback = {}) {
  const rawEntries = Array.isArray(entries)
    ? entries
    : Array.isArray(fallbackEntries)
      ? fallbackEntries
      : [];

  return rawEntries
    .map((entry, index) => normalizeProductStockHistoryEntry(entry, index, fallback))
    .filter(Boolean);
}

function getNormalizedProductStockHistory(product) {
  return normalizeProductStockHistoryEntries(
    product?.stockHistory ??
      product?.stockRecords ??
      product?.stockHistoryEntries,
  );
}

function getProductStockHistoryEntryKey(entry) {
  const explicitId = String(entry?.id ?? "").trim();
  if (explicitId) {
    return explicitId.toLowerCase();
  }

  return [
    String(entry?.modifiedAt ?? "").trim(),
    normalizeOptionalWholeNumber(entry?.stock, 0),
    normalizeOptionalWholeNumber(entry?.addedQuantity, 0),
    normalizeOptionalWholeNumber(entry?.deductedQuantity, 0),
    String(entry?.expiryDate ?? "").trim(),
    normalizeProductStockHistoryReason(entry?.reason ?? entry?.deductReason),
    normalizeProductStockHistoryLabel(entry?.label),
    normalizeProductStockHistoryBatchRole(entry?.batchRole ?? entry?.stockBatchRole),
  ].join("|").toLowerCase();
}

function mergeNormalizedProductStockHistoryEntries(existingEntries, inputEntries) {
  const mergedEntries = [];
  const seen = new Set();

  for (const entry of [...existingEntries, ...inputEntries]) {
    const normalizedEntry = entry && typeof entry === "object" ? entry : null;
    if (!normalizedEntry) {
      continue;
    }

    const entryKey = getProductStockHistoryEntryKey(normalizedEntry);
    if (!entryKey || seen.has(entryKey)) {
      continue;
    }

    seen.add(entryKey);
    mergedEntries.push(normalizedEntry);
  }

  return mergedEntries;
}

function createInitialProductStockHistoryEntry(stock, expiryDate, modifiedAt) {
  const normalizedStock = normalizeOptionalWholeNumber(stock, 0);
  if (normalizedStock <= 0) {
    return null;
  }

  const normalizedModifiedAt = normalizeOptionalProductDateTime(
    modifiedAt,
    new Date().toISOString(),
  ) || new Date().toISOString();

  return normalizeProductStockHistoryEntry(
    {
      stock: normalizedStock,
      addedQuantity: normalizedStock,
      deductedQuantity: 0,
      expiryDate,
      modifiedAt: normalizedModifiedAt,
      label: "New Stock",
      reason: "",
    },
    0,
    {
      stock: normalizedStock,
      addedQuantity: normalizedStock,
      deductedQuantity: 0,
      expiryDate,
      modifiedAt: normalizedModifiedAt,
    },
  );
}

function createImplicitProductStockHistoryEntry(
  input,
  existingProduct,
  stock,
  expiryDate,
  modifiedAt,
) {
  if (!existingProduct) {
    return null;
  }

  const hasExplicitStock = Object.prototype.hasOwnProperty.call(input ?? {}, "stock");
  const hasExplicitExpiryDate = Object.prototype.hasOwnProperty.call(input ?? {}, "expiryDate");
  if (!hasExplicitStock && !hasExplicitExpiryDate) {
    return null;
  }

  const previousStock = getNormalizedProductInventoryStock(existingProduct, 0);
  const previousExpiryDate = normalizeOptionalProductDateTime(existingProduct?.expiryDate);
  const nextExpiryDate = normalizeOptionalProductDateTime(expiryDate);
  const addedQuantity = stock > previousStock ? stock - previousStock : 0;
  const deductedQuantity = stock < previousStock ? previousStock - stock : 0;
  const stockChanged = addedQuantity > 0 || deductedQuantity > 0;
  const expiryChanged = nextExpiryDate !== previousExpiryDate;

  if (!stockChanged && !expiryChanged) {
    return null;
  }

  const normalizedModifiedAt = normalizeOptionalProductDateTime(
    modifiedAt,
    new Date().toISOString(),
  ) || new Date().toISOString();

  return normalizeProductStockHistoryEntry(
    {
      stock,
      addedQuantity,
      deductedQuantity,
      expiryDate: deductedQuantity > 0 ? "" : nextExpiryDate,
      modifiedAt: normalizedModifiedAt,
      label:
        addedQuantity > 0
          ? "Added Stock"
          : deductedQuantity > 0
            ? "Deducted Stock"
            : "Edit Expiry Date",
      reason: "",
    },
    0,
    {
      stock,
      addedQuantity,
      deductedQuantity,
      expiryDate: nextExpiryDate,
      modifiedAt: normalizedModifiedAt,
    },
  );
}

function resolveNextProductStockHistory(input, existingProduct, stock, expiryDate, modifiedAt) {
  const existingHistory = getNormalizedProductStockHistory(existingProduct);
  const inputHistory = normalizeProductStockHistoryEntries(
    input?.stockHistory,
    [],
    {
      stock,
      expiryDate,
      modifiedAt,
    },
  );
  const shouldReplaceHistory =
    Array.isArray(input?.stockHistory)
    && (
      input?.replaceStockHistory === true
      || String(input?.replaceStockHistory ?? "").trim().toLowerCase() === "true"
    );
  const nextBaseHistory = shouldReplaceHistory
    ? inputHistory
    : mergeNormalizedProductStockHistoryEntries(existingHistory, inputHistory);

  const hasExplicitStockHistory =
    Object.prototype.hasOwnProperty.call(input ?? {}, "stockHistory")
    || Object.prototype.hasOwnProperty.call(input ?? {}, "stockHistoryEntry");
  if (!existingProduct && !hasExplicitStockHistory && nextBaseHistory.length === 0) {
    const initialStockHistoryEntry = createInitialProductStockHistoryEntry(
      stock,
      expiryDate,
      modifiedAt,
    );
    if (initialStockHistoryEntry) {
      return [initialStockHistoryEntry];
    }
  }

  const implicitStockHistoryEntry = !hasExplicitStockHistory
    ? createImplicitProductStockHistoryEntry(
        input,
        existingProduct,
        stock,
        expiryDate,
        modifiedAt,
      )
    : null;

  if (!input?.stockHistoryEntry || typeof input.stockHistoryEntry !== "object") {
    return implicitStockHistoryEntry
      ? [...nextBaseHistory, implicitStockHistoryEntry]
      : nextBaseHistory;
  }

  const normalizedHistoryEntry = normalizeProductStockHistoryEntry(
    input.stockHistoryEntry,
    nextBaseHistory.length,
    {
      stock,
      expiryDate,
      modifiedAt,
    },
  );

  return normalizedHistoryEntry
    ? [...nextBaseHistory, normalizedHistoryEntry]
    : nextBaseHistory;
}

function resolveProductLastRestockMeta(input, existingProduct, stock) {
  const hasExplicitPreviousStock = Object.prototype.hasOwnProperty.call(
    input ?? {},
    "lastRestockPreviousStock",
  );
  const explicitPreviousStock = hasExplicitPreviousStock
    ? normalizeOptionalWholeNumber(input.lastRestockPreviousStock, 0)
    : getNormalizedProductLastRestockPreviousStock(existingProduct);
  const hasExplicitPreviousExpiryDate = Object.prototype.hasOwnProperty.call(
    input ?? {},
    "lastRestockPreviousExpiryDate",
  );
  const explicitPreviousExpiryDate = hasExplicitPreviousExpiryDate
    ? normalizeOptionalProductDateTime(input.lastRestockPreviousExpiryDate)
    : getNormalizedProductLastRestockPreviousExpiryDate(existingProduct);
  const hasExplicitAddedStock = Object.prototype.hasOwnProperty.call(
    input ?? {},
    "lastRestockAddedStock",
  );
  const explicitAddedStock = hasExplicitAddedStock
    ? normalizeOptionalWholeNumber(input.lastRestockAddedStock, 0)
    : getNormalizedProductLastRestockAddedStock(existingProduct);
  const hasExplicitExpiryDate = Object.prototype.hasOwnProperty.call(
    input ?? {},
    "lastRestockExpiryDate",
  );
  const explicitExpiryDate = hasExplicitExpiryDate
    ? normalizeOptionalProductDateTime(input.lastRestockExpiryDate)
    : getNormalizedProductLastRestockExpiryDate(existingProduct);
  const hasExplicitRestockedAt = Object.prototype.hasOwnProperty.call(
    input ?? {},
    "lastRestockedAt",
  );
  const explicitRestockedAt = hasExplicitRestockedAt
    ? normalizeOptionalProductDateTime(input.lastRestockedAt)
    : getNormalizedProductLastRestockedAt(existingProduct);

  const previousStock = existingProduct
    ? getNormalizedProductInventoryStock(existingProduct, 0)
    : null;
  if (hasExplicitPreviousStock && hasExplicitAddedStock) {
    return {
      previousStock: explicitPreviousStock,
      previousExpiryDate: explicitPreviousStock > 0 ? explicitPreviousExpiryDate : "",
      addedStock: explicitAddedStock,
      expiryDate: explicitAddedStock > 0 ? explicitExpiryDate : "",
      restockedAt:
        explicitAddedStock > 0
          ? explicitRestockedAt || new Date().toISOString()
          : explicitRestockedAt,
    };
  }

  if (previousStock !== null && stock > previousStock) {
    const restockExpiryDateSource = Object.prototype.hasOwnProperty.call(input ?? {}, "expiryDate")
      ? input.expiryDate
      : existingProduct?.expiryDate;
    return {
      previousStock,
      previousExpiryDate: normalizeOptionalProductDateTime(existingProduct?.expiryDate),
      addedStock: stock - previousStock,
      expiryDate: normalizeOptionalProductDateTime(restockExpiryDateSource),
      restockedAt: new Date().toISOString(),
    };
  }

  if (previousStock !== null && stock < previousStock) {
    const existingAddedStock = Math.min(
      previousStock,
      getNormalizedProductLastRestockAddedStock(existingProduct),
    );
    const existingPreviousStock = getNormalizedProductLastRestockPreviousStock(existingProduct);
    const existingPreviousExpiryDate = getNormalizedProductLastRestockPreviousExpiryDate(
      existingProduct,
    );
    const existingExpiryDate = getNormalizedProductLastRestockExpiryDate(existingProduct);
    const existingRestockedAt = getNormalizedProductLastRestockedAt(existingProduct);
    const hasExistingRestockMeta =
      existingAddedStock > 0 ||
      existingPreviousStock > 0 ||
      Boolean(existingPreviousExpiryDate) ||
      Boolean(existingExpiryDate) ||
      Boolean(existingRestockedAt);

    if (!hasExistingRestockMeta) {
      return {
        previousStock: 0,
        previousExpiryDate: "",
        addedStock: 0,
        expiryDate: "",
        restockedAt: explicitRestockedAt,
      };
    }

    const oldStock =
      existingPreviousStock + existingAddedStock === previousStock
        ? existingPreviousStock
        : Math.max(0, previousStock - existingAddedStock);
    const deductionAmount = previousStock - stock;
    const nextAddedStock = Math.max(0, existingAddedStock - deductionAmount);
    const deductedFromNewStock = existingAddedStock - nextAddedStock;

    return {
      previousStock: Math.max(0, oldStock - Math.max(0, deductionAmount - deductedFromNewStock)),
      previousExpiryDate:
        Math.max(0, oldStock - Math.max(0, deductionAmount - deductedFromNewStock)) > 0
          ? existingPreviousExpiryDate
          : "",
      addedStock: nextAddedStock,
      expiryDate: nextAddedStock > 0 ? existingExpiryDate : "",
      restockedAt: explicitRestockedAt,
    };
  }

  return {
    previousStock: explicitPreviousStock,
    previousExpiryDate: explicitPreviousStock > 0 ? explicitPreviousExpiryDate : "",
    addedStock: explicitAddedStock,
    expiryDate: explicitAddedStock > 0 ? explicitExpiryDate : "",
    restockedAt: explicitRestockedAt,
  };
}

function getNormalizedProductLastOutOfStockAt(product) {
  return normalizeOptionalProductDateTime(
    product?.lastOutOfStockAt ??
      product?.lastOutOfStockDate ??
      product?.outOfStockAt ??
      product?.outOfStockDate,
  );
}

function resolveProductLastOutOfStockAt(input, existingProduct, stock) {
  const explicitInputSource = Object.prototype.hasOwnProperty.call(input ?? {}, "lastOutOfStockAt")
    ? input.lastOutOfStockAt
    : Object.prototype.hasOwnProperty.call(input ?? {}, "lastOutOfStockDate")
      ? input.lastOutOfStockDate
      : Object.prototype.hasOwnProperty.call(input ?? {}, "outOfStockAt")
        ? input.outOfStockAt
        : Object.prototype.hasOwnProperty.call(input ?? {}, "outOfStockDate")
          ? input.outOfStockDate
          : undefined;
  const explicitInputValue = normalizeOptionalProductDateTime(explicitInputSource);
  if (explicitInputValue) {
    return explicitInputValue;
  }

  const existingLastOutOfStockAt = getNormalizedProductLastOutOfStockAt(existingProduct);
  const previousStock = existingProduct
    ? getNormalizedProductInventoryStock(existingProduct, 0)
    : null;

  if (stock <= 0) {
    if (!existingProduct) {
      return new Date().toISOString();
    }

    if (previousStock > 0) {
      return new Date().toISOString();
    }
  }

  return existingLastOutOfStockAt;
}

function resolveProductStockedDate(input, existingProduct, stock, lastRestockAddedStock, lastRestockedAt) {
  const hasExplicitStockedDate = Object.prototype.hasOwnProperty.call(input ?? {}, "stockedDate") ||
    Object.prototype.hasOwnProperty.call(input ?? {}, "stockDate") ||
    Object.prototype.hasOwnProperty.call(input ?? {}, "dateStocked");
  const explicitStockedDateSource = Object.prototype.hasOwnProperty.call(input ?? {}, "stockedDate")
    ? input.stockedDate
    : Object.prototype.hasOwnProperty.call(input ?? {}, "stockDate")
      ? input.stockDate
      : Object.prototype.hasOwnProperty.call(input ?? {}, "dateStocked")
        ? input.dateStocked
        : undefined;

  if (hasExplicitStockedDate) {
    return normalizeOptionalProductDateTime(explicitStockedDateSource);
  }

  const existingStockedDate = getNormalizedProductStockedDate(existingProduct);
  if (lastRestockAddedStock > 0) {
    return normalizeOptionalProductDateTime(lastRestockedAt, existingStockedDate || new Date().toISOString());
  }

  if (existingStockedDate) {
    return existingStockedDate;
  }

  if (stock > 0) {
    return new Date().toISOString();
  }

  return normalizeOptionalProductDateTime(existingProduct?.createdAt);
}

function normalizeStoredProductRecord(product) {
  const normalizedStock = getNormalizedProductInventoryStock(product, 0);
  const normalizedExpiryDate = normalizeOptionalProductDateTime(
    product?.expiryDate ??
      product?.expirationDate ??
      product?.expiredDate ??
      product?.expireDate ??
      product?.bestBeforeDate ??
      product?.bestBefore,
  );
  const sellableStock = resolveNormalizedProductSellableStock(
    {
      ...product,
      expiryDate: normalizedExpiryDate,
    },
    normalizedStock,
  );
  const stockedDate = getNormalizedProductStockedDate(product);
  const updatedAt = getNormalizedProductUpdatedAt(product);
  const lastOutOfStockAt = getNormalizedProductLastOutOfStockAt(product);
  const lastRestockPreviousStock = getNormalizedProductLastRestockPreviousStock(product);
  const lastRestockPreviousExpiryDate = getNormalizedProductLastRestockPreviousExpiryDate(product);
  const lastRestockAddedStock = getNormalizedProductLastRestockAddedStock(product);
  const lastRestockExpiryDate = getNormalizedProductLastRestockExpiryDate(product);
  const lastRestockedAt = getNormalizedProductLastRestockedAt(product);
  const lastStockAddedQuantity = getNormalizedProductLastStockAddedQuantity(product);
  const lastStockDeductedQuantity = getNormalizedProductLastStockDeductedQuantity(product);
  const stockHistory = getNormalizedProductStockHistory(product);
  const videoUrls = normalizeProductVideoUrls(
    product?.videoUrls,
    product?.videoUrl,
  );
  const normalizedVideoUrl = videoUrls[0] ?? "";
  const videoThumbnailUrls = normalizeProductVideoThumbnailUrls(
    product?.videoThumbnailUrls,
    videoUrls,
    product?.videoThumbnailUrl,
  );
  const normalizedVideoThumbnailUrl = videoThumbnailUrls[0] ?? "";
  const normalizedCategories = getProductCategoryList(product);
  const requestedDetailsVideoSourceUrl = String(
    product?.detailsVideoSourceUrl ?? "",
  ).trim();
  const validVideoSourceKeys = new Set(
    videoUrls.map((videoUrl) => String(videoUrl ?? "").trim().toLowerCase()).filter(Boolean),
  );
  const visualSearchImageAngles = normalizeProductVisualSearchImageAngles(product);
  const visualSearchImageUrls =
    getProductVisualSearchImageUrlsFromAngles(visualSearchImageAngles);
  const visualSearchImageUrl =
    String(visualSearchImageAngles[VISUAL_SEARCH_PRIMARY_IMAGE_ANGLE] ?? "").trim() ||
    visualSearchImageUrls[0] ||
    "";
  const visualSearchFingerprints = normalizeVisualSearchFingerprintMetaList(
    product?.visualSearchFingerprints,
    visualSearchImageUrls,
  );
  const visualSearchFingerprint =
    normalizeVisualSearchFingerprintMeta(
      product?.visualSearchFingerprint,
      visualSearchImageUrl,
    ) ||
    visualSearchFingerprints.find(
      (meta) =>
        String(meta?.imageUrl ?? "").trim().toLowerCase() ===
        visualSearchImageUrl.toLowerCase(),
    ) ||
    visualSearchFingerprints[0] ||
    null;
  const approvalStatus = normalizeProductApprovalStatus(
    product?.approvalStatus,
    PRODUCT_APPROVAL_APPROVED,
  );
  const submittedAt = normalizeOptionalProductDateTime(
    product?.submittedAt,
    product?.createdAt ?? updatedAt,
  ) || updatedAt;

  return normalizeStoredProductVariants(
    {
      ...normalizeStoredProductImageGallery(product),
      adminId: getRecordAdminId(product),
      approvalStatus,
      isApprovalPending: approvalStatus === PRODUCT_APPROVAL_PENDING,
      isApproved: approvalStatus === PRODUCT_APPROVAL_APPROVED,
      submittedAt,
      approvedAt: normalizeOptionalProductDateTime(product?.approvedAt),
      approvedBy: String(product?.approvedBy ?? "").trim(),
      approvalUpdatedAt: normalizeOptionalProductDateTime(product?.approvalUpdatedAt),
      stock: sellableStock,
      inventoryStock: normalizedStock,
      isActive:
        sellableStock > 0 && normalizeProductActiveState(product?.isActive, true),
      categories: normalizedCategories,
      category: normalizedCategories[0] ?? "General",
      deliveryPartnerIds: normalizePartnerIdList(product?.deliveryPartnerIds),
      paymentPartnerIds: normalizePartnerIdList(product?.paymentPartnerIds),
      videoUrls,
      videoUrl: normalizedVideoUrl,
      videoThumbnailUrls,
      videoThumbnailUrl: normalizedVideoThumbnailUrl,
      model3dUrl: String(
        product?.model3dUrl ??
          product?.model3DUrl ??
          product?.threeDModelUrl ??
          product?.modelUrl ??
          "",
      ).trim(),
      model3dScanImageUrls: normalizeProductModelScanImageUrls(
        product?.model3dScanImageUrls,
      ),
      detailsVideoSourceUrl:
        requestedDetailsVideoSourceUrl &&
        validVideoSourceKeys.has(requestedDetailsVideoSourceUrl.toLowerCase())
          ? requestedDetailsVideoSourceUrl
          : "",
      visualSearchImageUrl,
      visualSearchImageUrls,
      visualSearchImageAngles,
      visualSearchFingerprint,
      visualSearchFingerprints,
      detailsVideoPositionX: normalizeProductCardImagePosition(
        product?.detailsVideoPositionX,
        50,
      ),
      detailsVideoPositionY: normalizeProductCardImagePosition(
        product?.detailsVideoPositionY,
        50,
      ),
      detailsVideoZoomPercent: normalizeProductCropZoomPercent(
        product?.detailsVideoZoomPercent,
        0,
      ),
      detailsVideoVisibleWidthFraction: normalizeProductVisibleFraction(
        product?.detailsVideoVisibleWidthFraction,
        0,
      ),
      detailsVideoVisibleHeightFraction: normalizeProductVisibleFraction(
        product?.detailsVideoVisibleHeightFraction,
        0,
      ),
      detailsVideoPreviewTimeMs: normalizeProductMediaTimeMs(
        product?.detailsVideoPreviewTimeMs,
        0,
      ),
      buyModalImageUrl: String(product?.buyModalImageUrl ?? "").trim(),
      buyModalImageSourceUrl: String(product?.buyModalImageSourceUrl ?? "").trim(),
      buyModalImagePositionX: normalizeProductCardImagePosition(
        product?.buyModalImagePositionX,
        50,
      ),
      buyModalImagePositionY: normalizeProductCardImagePosition(
        product?.buyModalImagePositionY,
        50,
      ),
      updatedAt,
      stockedDate,
      expiryDate: normalizedExpiryDate,
      lastOutOfStockAt,
      lastRestockPreviousStock,
      lastRestockPreviousExpiryDate,
      lastRestockAddedStock,
      lastRestockExpiryDate,
      lastRestockedAt,
      lastStockAddedQuantity,
      lastStockDeductedQuantity,
      stockHistory,
    },
  );
}

async function migrateProductsForImageGallery() {
  const products = await readProducts();
  let didChange = false;

  const nextProducts = [];

  for (const product of products) {
    const normalizedProduct = normalizeStoredProductRecord(product);
    let storedProduct = {
      ...normalizedProduct,
      stock: getNormalizedProductInventoryStock(product, 0),
    };
    storedProduct = await syncProductVisualSearchFingerprint(storedProduct, product);
    const currentImageUrls = Array.isArray(product?.imageUrls)
      ? product.imageUrls.map((value) => String(value ?? "").trim())
      : [];
    const currentVariants = Array.isArray(product?.variants)
      ? product.variants
      : [];

    if (
      normalizedProduct.isActive !== product?.isActive ||
      normalizedProduct.category !== getPrimaryProductCategory(product, "General") ||
      JSON.stringify(normalizedProduct.categories ?? []) !==
        JSON.stringify(getProductCategoryList(product)) ||
      normalizedProduct.imageUrl !== String(product?.imageUrl ?? "").trim() ||
      normalizedProduct.mainImageUrl !== String(product?.mainImageUrl ?? "").trim() ||
      normalizedProduct.mainImageIndex !== Number(product?.mainImageIndex ?? 0) ||
      normalizedProduct.cardImageUrl !== String(product?.cardImageUrl ?? "").trim() ||
      normalizedProduct.cardImageSourceUrl !==
        String(product?.cardImageSourceUrl ?? "").trim() ||
      JSON.stringify(normalizedProduct.detailsImageCrops ?? []) !==
        JSON.stringify(
          Array.isArray(product?.detailsImageCrops) ? product.detailsImageCrops : [],
        ) ||
      normalizedProduct.cardImagePositionX !==
        normalizeProductCardImagePosition(product?.cardImagePositionX) ||
      normalizedProduct.cardImagePosition !==
        normalizeProductCardImagePosition(product?.cardImagePosition) ||
      JSON.stringify(normalizedProduct.videoUrls ?? []) !==
        JSON.stringify(
          normalizeProductVideoUrls(product?.videoUrls, product?.videoUrl),
        ) ||
      normalizedProduct.videoUrl !== String(product?.videoUrl ?? "").trim() ||
      JSON.stringify(normalizedProduct.videoThumbnailUrls ?? []) !==
        JSON.stringify(
          normalizeProductVideoThumbnailUrls(
            product?.videoThumbnailUrls,
            normalizeProductVideoUrls(product?.videoUrls, product?.videoUrl),
            product?.videoThumbnailUrl,
          ),
        ) ||
      normalizedProduct.videoThumbnailUrl !==
        String(product?.videoThumbnailUrl ?? "").trim() ||
      normalizedProduct.model3dUrl !==
        String(
          product?.model3dUrl ??
            product?.model3DUrl ??
            product?.threeDModelUrl ??
            product?.modelUrl ??
            "",
        ).trim() ||
      JSON.stringify(normalizedProduct.model3dScanImageUrls ?? []) !==
        JSON.stringify(normalizeProductModelScanImageUrls(product?.model3dScanImageUrls)) ||
      normalizedProduct.detailsVideoSourceUrl !==
        String(product?.detailsVideoSourceUrl ?? "").trim() ||
      normalizedProduct.detailsVideoPositionX !==
        normalizeProductCardImagePosition(product?.detailsVideoPositionX) ||
      normalizedProduct.detailsVideoPositionY !==
        normalizeProductCardImagePosition(product?.detailsVideoPositionY) ||
      normalizedProduct.detailsVideoZoomPercent !==
        normalizeProductCropZoomPercent(product?.detailsVideoZoomPercent) ||
      normalizedProduct.detailsVideoVisibleWidthFraction !==
        normalizeProductVisibleFraction(product?.detailsVideoVisibleWidthFraction) ||
      normalizedProduct.detailsVideoVisibleHeightFraction !==
        normalizeProductVisibleFraction(product?.detailsVideoVisibleHeightFraction) ||
      normalizedProduct.detailsVideoPreviewTimeMs !==
        normalizeProductMediaTimeMs(product?.detailsVideoPreviewTimeMs) ||
      normalizedProduct.visualSearchImageUrl !==
        getPrimaryProductVisualSearchImageUrl(product) ||
      JSON.stringify(normalizedProduct.visualSearchImageUrls ?? []) !==
        JSON.stringify(normalizeProductVisualSearchImageUrls(product)) ||
      JSON.stringify(normalizedProduct.visualSearchImageAngles ?? {}) !==
        JSON.stringify(normalizeProductVisualSearchImageAngles(product)) ||
      JSON.stringify(
        normalizeVisualSearchFingerprintMetaList(
          storedProduct.visualSearchFingerprints,
          storedProduct.visualSearchImageUrls,
        ),
      ) !==
        JSON.stringify(
          normalizeVisualSearchFingerprintMetaList(
            product?.visualSearchFingerprints,
            storedProduct.visualSearchImageUrls,
          ),
        ) ||
      normalizedProduct.lastOutOfStockAt !== getNormalizedProductLastOutOfStockAt(product) ||
      JSON.stringify(normalizedProduct.imageUrls) !== JSON.stringify(currentImageUrls) ||
      JSON.stringify(normalizedProduct.variants ?? []) !== JSON.stringify(currentVariants)
    ) {
      didChange = true;
    }

    nextProducts.push(storedProduct);
  }

  if (didChange) {
    await writeProducts(nextProducts);
  }

  return didChange;
}

function normalizeProduct(input, existingProduct = null) {
  const name = String(input.name ?? "").trim();
  const categories = normalizeProductCategoryValues(
    input.categories,
    input.category ??
      existingProduct?.categories ??
      existingProduct?.category ??
      "",
  );
  const category = categories[0] ?? "";
  const description = String(input.description ?? "").trim();
  const fallbackImageUrl = String(
    input.imageUrl ??
      input.mainImageUrl ??
      existingProduct?.mainImageUrl ??
      existingProduct?.imageUrl ??
      "",
  ).trim();
  const imageUrls = normalizeProductImageUrls(
    input.imageUrls ?? existingProduct?.imageUrls,
    fallbackImageUrl,
  );
  const mainImageIndex = resolveProductMainImageIndex(
    imageUrls,
    input.mainImageIndex ?? existingProduct?.mainImageIndex,
    fallbackImageUrl,
  );
  const cardImagePositionX = normalizeProductCardImagePosition(
    input.cardImagePositionX ?? existingProduct?.cardImagePositionX,
  );
  const cardImagePosition = normalizeProductCardImagePosition(
    input.cardImagePosition ?? existingProduct?.cardImagePosition,
  );
  const buyModalImagePositionX = normalizeProductCardImagePosition(
    input.buyModalImagePositionX ?? existingProduct?.buyModalImagePositionX,
  );
  const buyModalImagePositionY = normalizeProductCardImagePosition(
    input.buyModalImagePositionY ?? existingProduct?.buyModalImagePositionY,
  );
  const imageUrl = imageUrls[mainImageIndex] ?? "";
  const requestedCardImageUrl = String(
    input.cardImageUrl ?? existingProduct?.cardImageUrl ?? "",
  ).trim();
  const requestedCardImageSourceUrl = String(
    input.cardImageSourceUrl ?? existingProduct?.cardImageSourceUrl ?? "",
  ).trim();
  const cardImageSourceUrl =
    requestedCardImageSourceUrl && requestedCardImageSourceUrl === imageUrl
      ? requestedCardImageSourceUrl
      : "";
  const cardImageUrl = cardImageSourceUrl && requestedCardImageUrl ? requestedCardImageUrl : "";
  const requestedBuyModalImageUrl = String(
    input.buyModalImageUrl ?? existingProduct?.buyModalImageUrl ?? "",
  ).trim();
  const requestedBuyModalImageSourceUrl = String(
    input.buyModalImageSourceUrl ?? existingProduct?.buyModalImageSourceUrl ?? "",
  ).trim();
  const buyModalImageSourceUrl =
    requestedBuyModalImageSourceUrl && requestedBuyModalImageSourceUrl === imageUrl
      ? requestedBuyModalImageSourceUrl
      : "";
  const buyModalImageUrl =
    buyModalImageSourceUrl && requestedBuyModalImageUrl ? requestedBuyModalImageUrl : "";
  const detailsImageCrops = normalizeProductDetailsImageCrops(
    input.detailsImageCrops,
    imageUrls,
    existingProduct?.detailsImageCrops,
  );
  const videoUrls = normalizeProductVideoUrls(
    input.videoUrls ?? existingProduct?.videoUrls,
    input.videoUrl ?? existingProduct?.videoUrl ?? "",
  );
  const videoUrl = videoUrls[0] ?? "";
  const videoThumbnailUrls = normalizeProductVideoThumbnailUrls(
    input.videoThumbnailUrls ?? existingProduct?.videoThumbnailUrls,
    videoUrls,
    input.videoThumbnailUrl ?? existingProduct?.videoThumbnailUrl ?? "",
  );
  const videoThumbnailUrl = videoThumbnailUrls[0] ?? "";
  const model3dUrl = String(
    input.model3dUrl ??
      input.model3DUrl ??
      input.threeDModelUrl ??
      input.modelUrl ??
      existingProduct?.model3dUrl ??
      existingProduct?.model3DUrl ??
      existingProduct?.threeDModelUrl ??
      existingProduct?.modelUrl ??
      "",
  ).trim();
  const model3dScanImageUrls = normalizeProductModelScanImageUrls(
    input.model3dScanImageUrls ?? existingProduct?.model3dScanImageUrls,
  );
  const detailsVideoPositionX = normalizeProductCardImagePosition(
    input.detailsVideoPositionX ?? existingProduct?.detailsVideoPositionX,
    50,
  );
  const detailsVideoPositionY = normalizeProductCardImagePosition(
    input.detailsVideoPositionY ?? existingProduct?.detailsVideoPositionY,
    50,
  );
  const detailsVideoZoomPercent = normalizeProductCropZoomPercent(
    input.detailsVideoZoomPercent ?? existingProduct?.detailsVideoZoomPercent,
    0,
  );
  const detailsVideoVisibleWidthFraction = normalizeProductVisibleFraction(
    input.detailsVideoVisibleWidthFraction ??
      existingProduct?.detailsVideoVisibleWidthFraction,
    0,
  );
  const detailsVideoVisibleHeightFraction = normalizeProductVisibleFraction(
    input.detailsVideoVisibleHeightFraction ??
      existingProduct?.detailsVideoVisibleHeightFraction,
    0,
  );
  const detailsVideoPreviewTimeMs = normalizeProductMediaTimeMs(
    input.detailsVideoPreviewTimeMs ?? existingProduct?.detailsVideoPreviewTimeMs,
    0,
  );
  const requestedDetailsVideoSourceUrl = String(
    input.detailsVideoSourceUrl ?? existingProduct?.detailsVideoSourceUrl ?? "",
  ).trim();
  const validVideoSourceKeys = new Set(
    videoUrls.map((candidate) => String(candidate ?? "").trim().toLowerCase()).filter(Boolean),
  );
  const detailsVideoSourceUrl =
    requestedDetailsVideoSourceUrl &&
    validVideoSourceKeys.has(requestedDetailsVideoSourceUrl.toLowerCase())
      ? requestedDetailsVideoSourceUrl
      : "";
  const visualSearchImageAngles = normalizeProductVisualSearchImageAngles({
    visualSearchImageAngles:
      input.visualSearchImageAngles ?? existingProduct?.visualSearchImageAngles,
    visualSearchImageUrls:
      input.visualSearchImageUrls ?? existingProduct?.visualSearchImageUrls,
    visualSearchImageUrl:
      input.visualSearchImageUrl ?? existingProduct?.visualSearchImageUrl,
  });
  const visualSearchImageUrls =
    getProductVisualSearchImageUrlsFromAngles(visualSearchImageAngles);
  const visualSearchImageUrl =
    String(visualSearchImageAngles[VISUAL_SEARCH_PRIMARY_IMAGE_ANGLE] ?? "").trim() ||
    visualSearchImageUrls[0] ||
    "";
  const visualSearchFingerprints = normalizeVisualSearchFingerprintMetaList(
    input.visualSearchFingerprints ?? existingProduct?.visualSearchFingerprints,
    visualSearchImageUrls,
  );
  const visualSearchFingerprint =
    normalizeVisualSearchFingerprintMeta(
      input.visualSearchFingerprint ?? existingProduct?.visualSearchFingerprint,
      visualSearchImageUrl,
    ) ||
    visualSearchFingerprints.find(
      (meta) =>
        String(meta?.imageUrl ?? "").trim().toLowerCase() ===
        visualSearchImageUrl.toLowerCase(),
    ) ||
    visualSearchFingerprints[0] ||
    null;
  const hasStock = hasInputValue(input.stock);
  const stock = hasStock
    ? parseNumberInput(input.stock)
    : Number(existingProduct?.inventoryStock ?? existingProduct?.stock ?? 0);
  const hasSold = hasInputValue(input.sold);
  const existingSold = parseNumberInput(existingProduct?.sold ?? 0);
  const sold = hasSold
    ? parseNumberInput(input.sold)
    : (Number.isFinite(existingSold) ? Math.max(0, Math.trunc(existingSold)) : 0);
  const hasRating = hasInputValue(input.rating);
  const existingRating = parseNumberInput(existingProduct?.rating ?? 0);
  const rating = hasRating
    ? parseNumberInput(input.rating)
    : (
        Number.isFinite(existingRating)
          ? Math.max(0, Math.min(5, existingRating))
          : 0
      );
  const commentCount = normalizeProductCommentCount(
    input.commentCount ??
      input.reviewCommentCount ??
      input.productReviewCommentCount ??
      existingProduct?.commentCount ??
      existingProduct?.reviewCommentCount ??
      existingProduct?.productReviewCommentCount,
  );
  const isActive =
    stock > 0 &&
    normalizeProductActiveState(input.isActive, existingProduct?.isActive ?? true);
  const originalPriceSource = hasInputValue(input.originalPrice)
    ? input.originalPrice
    : input.price;
  const originalPrice = parsePriceInput(originalPriceSource);
  const hasSalesPrice = hasInputValue(input.salesPrice);
  const salesPrice = hasSalesPrice ? parsePriceInput(input.salesPrice) : null;
  const expiryDateSource = Object.prototype.hasOwnProperty.call(input ?? {}, "expiryDate")
    ? input.expiryDate
    : existingProduct?.expiryDate;
  const expiryDate = normalizeOptionalProductDateTime(expiryDateSource);
  const lastOutOfStockAt = resolveProductLastOutOfStockAt(input, existingProduct, stock);
  const {
    previousStock: lastRestockPreviousStock,
    previousExpiryDate: lastRestockPreviousExpiryDate,
    addedStock: lastRestockAddedStock,
    expiryDate: lastRestockExpiryDate,
    restockedAt: lastRestockedAt,
  } = resolveProductLastRestockMeta(input, existingProduct, stock);
  const {
    addedQuantity: lastStockAddedQuantity,
    deductedQuantity: lastStockDeductedQuantity,
  } = resolveProductLastStockAdjustmentMeta(input, existingProduct, stock);
  const updatedAt = new Date().toISOString();
  const stockedDate = resolveProductStockedDate(
    input,
    existingProduct,
    stock,
    lastRestockAddedStock,
    lastRestockedAt,
  );
  const stockHistory = resolveNextProductStockHistory(
    input,
    existingProduct,
    stock,
    expiryDate,
    updatedAt,
  );
  const variants = normalizeProductVariants(
    input.variants,
    imageUrls,
    existingProduct?.variants,
  );
  const deliveryPartnerIds = normalizePartnerIdList(
    input.deliveryPartnerIds,
    existingProduct?.deliveryPartnerIds,
  );
  const paymentPartnerIds = normalizePartnerIdList(
    input.paymentPartnerIds,
    existingProduct?.paymentPartnerIds,
  );
  // When editing an existing product, require review by setting to pending
  // This ensures ALL edits go through super_admin.html review
  const defaultApprovalStatus = PRODUCT_APPROVAL_PENDING;
  const approvalStatus = existingProduct
    ? PRODUCT_APPROVAL_PENDING  // Always set to pending when editing existing product
    : normalizeProductApprovalStatus(input.approvalStatus, defaultApprovalStatus);
  const submittedAt = normalizeOptionalProductDateTime(
    input.submittedAt ?? existingProduct?.submittedAt,
    existingProduct?.createdAt ?? updatedAt,
  ) || updatedAt;
  const approvedAt = approvalStatus === PRODUCT_APPROVAL_APPROVED
    ? (
        normalizeOptionalProductDateTime(input.approvedAt ?? existingProduct?.approvedAt)
        || (defaultApprovalStatus === PRODUCT_APPROVAL_PENDING ? updatedAt : "")
      )
    : "";
  const approvedBy = approvalStatus === PRODUCT_APPROVAL_APPROVED
    ? String(input.approvedBy ?? existingProduct?.approvedBy ?? "").trim()
    : "";
  const approvalUpdatedAt = normalizeOptionalProductDateTime(
    input.approvalUpdatedAt ?? existingProduct?.approvalUpdatedAt,
    approvalStatus !== defaultApprovalStatus ? updatedAt : "",
  );

  if (!name) {
    throw new Error("Product name is required.");
  }

  if (!categories.length) {
    throw new Error("At least one category is required.");
  }

  if (!description) {
    throw new Error("Description is required.");
  }

  if (!Number.isFinite(originalPrice) || originalPrice < 0) {
    throw new Error(
      "Original price must be a valid number greater than or equal to zero.",
    );
  }

  if (hasSalesPrice) {
    if (!Number.isFinite(salesPrice) || salesPrice < 0) {
      throw new Error(
        "Sales price must be a valid number greater than or equal to zero.",
      );
    }

    if (salesPrice > originalPrice) {
      throw new Error("Sales price cannot be higher than original price.");
    }
  }

  if (!Number.isFinite(sold) || sold < 0 || !Number.isInteger(sold)) {
    throw new Error("Sold must be a valid whole number greater than or equal to zero.");
  }

  if (!Number.isFinite(stock) || stock < 0 || !Number.isInteger(stock)) {
    throw new Error("Stock must be a valid whole number greater than or equal to zero.");
  }

  if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
    throw new Error("Rating must be a valid number from 0 to 5.");
  }

  return {
    id: existingProduct?.id ?? `prd-${Date.now()}`,
    adminId: getRecordAdminId(input, getRecordAdminId(existingProduct)),
    approvalStatus,
    submittedAt,
    approvedAt,
    approvedBy,
    approvalUpdatedAt,
    name,
    isActive,
    originalPrice,
    salesPrice,
    category,
    categories,
    deliveryPartnerIds,
    paymentPartnerIds,
    description,
    imageUrl,
    mainImageUrl: imageUrl,
    imageUrls,
    buyModalImageUrl,
    buyModalImageSourceUrl,
    buyModalImagePositionX,
    buyModalImagePositionY,
    cardImageUrl,
    cardImageSourceUrl,
    detailsImageCrops,
    videoUrls,
    videoUrl,
    videoThumbnailUrls,
    videoThumbnailUrl,
    model3dUrl,
    model3dScanImageUrls,
    detailsVideoSourceUrl,
    detailsVideoPositionX,
    detailsVideoPositionY,
    detailsVideoZoomPercent,
    detailsVideoVisibleWidthFraction,
    detailsVideoVisibleHeightFraction,
    detailsVideoPreviewTimeMs,
    visualSearchImageUrl,
    visualSearchImageUrls,
    visualSearchImageAngles,
    visualSearchFingerprint,
    visualSearchFingerprints,
    mainImageIndex,
    cardImagePositionX,
    cardImagePosition,
    stock,
    sold,
    rating,
    commentCount,
    variants,
    stockedDate,
    expiryDate,
    lastOutOfStockAt,
    lastRestockPreviousStock,
    lastRestockPreviousExpiryDate,
    lastRestockAddedStock,
    lastRestockExpiryDate,
    lastRestockedAt,
    lastStockAddedQuantity,
    lastStockDeductedQuantity,
    stockHistory,
    barcode: String(input.barcode ?? existingProduct?.barcode ?? "").trim(),
    moveBarcodeToPackingDashboard: Boolean(
      input.moveBarcodeToPackingDashboard ?? existingProduct?.moveBarcodeToPackingDashboard,
    ),
    updatedAt,
    createdAt: existingProduct?.createdAt ?? new Date().toISOString(),
  };
}

function normalizeChatTimestamp(value, fallback = null) {
  const fallbackDate = fallback instanceof Date ? fallback : new Date();
  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? fallbackDate : parsedDate;
}

function normalizeOptionalChatTimestamp(value) {
  if (value == null) {
    return null;
  }

  const trimmedValue = String(value).trim();
  if (!trimmedValue) {
    return null;
  }

  const parsedDate = new Date(trimmedValue);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function normalizeChatTypingActor(input, fallbackActor = "") {
  if (!input || typeof input !== "object") {
    return null;
  }

  const rawIsTyping = input.isTyping === true;
  const rawIsOnline = input.isOnline === true;
  if (!rawIsTyping && !rawIsOnline) {
    return null;
  }

  const actor = String(input.actor ?? fallbackActor ?? "").trim().toLowerCase();
  if (actor !== "user" && actor !== "employee") {
    return null;
  }

  const updatedAt = normalizeOptionalChatTimestamp(input.updatedAt) ?? new Date();
  const ageMs = Date.now() - updatedAt.getTime();
  const isTyping = rawIsTyping && ageMs <= CHAT_TYPING_ACTIVE_WINDOW_MS;
  const isOnline = rawIsOnline && ageMs <= CHAT_ONLINE_ACTIVE_WINDOW_MS;
  if (!isTyping && !isOnline) {
    return null;
  }

  const displayName =
    String(input.displayName ?? input.name ?? "").replace(/\s+/g, " ").trim() ||
    (actor === "employee" ? "Employee" : "App User");
  const avatarUrl = String(input.avatarUrl ?? input.profileImageUrl ?? "").trim();

  return {
    actor,
    isTyping,
    isOnline,
    displayName,
    avatarUrl,
    updatedAt: updatedAt.toISOString(),
  };
}

function normalizeChatTypingState(input) {
  const rawTyping = input && typeof input === "object" ? input : {};
  const typing = {};
  const userTyping = normalizeChatTypingActor(rawTyping.user, "user");
  const employeeTyping = normalizeChatTypingActor(rawTyping.employee, "employee");

  if (userTyping) {
    typing.user = userTyping;
  }
  if (employeeTyping) {
    typing.employee = employeeTyping;
  }

  return typing;
}

function chooseLatestChatTypingActor(left, right) {
  const normalizedLeft = normalizeChatTypingActor(left, left?.actor);
  const normalizedRight = normalizeChatTypingActor(right, right?.actor);

  if (!normalizedLeft) {
    return normalizedRight;
  }
  if (!normalizedRight) {
    return normalizedLeft;
  }

  return new Date(normalizedRight.updatedAt).getTime() >=
    new Date(normalizedLeft.updatedAt).getTime()
    ? normalizedRight
    : normalizedLeft;
}

function mergeChatTypingState(existingTyping, incomingTyping) {
  const existingState = normalizeChatTypingState(existingTyping);
  const incomingState = normalizeChatTypingState(incomingTyping);
  const typing = {};

  for (const actor of ["user", "employee"]) {
    const nextActorState = chooseLatestChatTypingActor(
      existingState[actor],
      incomingState[actor],
    );
    if (nextActorState) {
      typing[actor] = nextActorState;
    }
  }

  return typing;
}

function updateChatTypingState(input, actor, options = {}) {
  const normalizedActor = String(actor ?? "").trim().toLowerCase();
  const typing = normalizeChatTypingState(input);

  if (normalizedActor !== "user" && normalizedActor !== "employee") {
    return typing;
  }

  const currentEntry = typing[normalizedActor];
  const isTyping = options.isTyping === true;
  const isOnline =
    options.isOnline === true ||
    (options.isOnline !== false && currentEntry?.isOnline === true);

  if (!isTyping && !isOnline) {
    delete typing[normalizedActor];
    return typing;
  }

  typing[normalizedActor] = {
    actor: normalizedActor,
    isTyping,
    isOnline,
    displayName:
      String(options.displayName ?? "").replace(/\s+/g, " ").trim() ||
      String(currentEntry?.displayName ?? "").replace(/\s+/g, " ").trim() ||
      (normalizedActor === "employee" ? "Employee" : "App User"),
    avatarUrl: String(options.avatarUrl ?? "").trim() || String(currentEntry?.avatarUrl ?? "").trim(),
    updatedAt: new Date().toISOString(),
  };

  return typing;
}

function normalizeChatThreadRating(value, fallback = 0) {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.max(0, Math.min(5, parsedValue));
}

function formatChatAiPrice(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return "N/A";
  }

  return `PHP ${numericValue.toFixed(Number.isInteger(numericValue) ? 0 : 2)}`;
}

function buildChatAiSystemPrompt(thread) {
  const productName = String(thread?.productName ?? "").trim() || "Unnamed Product";
  const productCategory = String(thread?.productCategory ?? "").trim() || "General";
  const productDescription = String(thread?.productDescription ?? "").trim() || "No description provided.";
  const productStock = Number.isFinite(Number(thread?.productStock))
    ? Math.max(0, Math.trunc(Number(thread.productStock)))
    : 0;
  const productOriginalPrice = formatChatAiPrice(thread?.productOriginalPrice);
  const productSalesPrice = thread?.productSalesPrice == null
    ? "N/A"
    : formatChatAiPrice(thread.productSalesPrice);

  return [
    DEFAULT_CHAT_AI_SYSTEM_PROMPT,
    "",
    "Product context:",
    `- Name: ${productName}`,
    `- Category: ${productCategory}`,
    `- Sales price: ${productSalesPrice}`,
    `- Original price: ${productOriginalPrice}`,
    `- Stock: ${productStock}`,
    `- Description: ${productDescription}`,
  ].join("\n");
}

function buildChatAiHistory(thread) {
  return (Array.isArray(thread?.messages) ? thread.messages : [])
    .slice(-12)
    .map((message) => {
      const text = String(message?.text ?? "").trim();
      const imageUrl = String(message?.imageUrl ?? "").trim();
      const imageName = String(message?.imageName ?? "").trim();
      const content =
        text ||
        (imageUrl
          ? isVideoAttachmentSource(imageUrl, imageName)
            ? "Customer shared a video attachment."
            : "Customer shared a photo attachment."
          : "");
      if (!content) {
        return null;
      }

      return {
        role: message?.isFromSupport ? "assistant" : "user",
        content,
      };
    })
    .filter(Boolean);
}

function buildChatAiPayload(thread) {
  const systemPrompt = buildChatAiSystemPrompt(thread);
  const history = buildChatAiHistory(thread);
  const usesResponsesApi = /\/responses\/?$/i.test(CHAT_AI_API_URL);

  if (usesResponsesApi) {
    return {
      model: CHAT_AI_MODEL,
      instructions: systemPrompt,
      input: history.map((message) => ({
        role: message.role,
        content: [
          {
            type: "input_text",
            text: message.content,
          },
        ],
      })),
      temperature: 0.6,
    };
  }

  return {
    model: CHAT_AI_MODEL,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      ...history,
    ],
    temperature: 0.6,
  };
}

function extractChatAiResponseText(payload) {
  const directOutputText = String(payload?.output_text ?? "").trim();
  if (directOutputText) {
    return directOutputText;
  }

  const outputItems = Array.isArray(payload?.output) ? payload.output : [];
  const outputTexts = [];

  for (const item of outputItems) {
    const contentItems = Array.isArray(item?.content) ? item.content : [];
    for (const contentItem of contentItems) {
      const contentText = String(
        contentItem?.text ?? contentItem?.output_text ?? "",
      ).trim();
      if (contentText) {
        outputTexts.push(contentText);
      }
    }
  }

  if (outputTexts.length) {
    return outputTexts.join("\n").trim();
  }

  const choiceContent = payload?.choices?.[0]?.message?.content;
  if (typeof choiceContent === "string" && choiceContent.trim()) {
    return choiceContent.trim();
  }

  if (Array.isArray(choiceContent)) {
    const joinedText = choiceContent
      .map((item) => String(item?.text ?? "").trim())
      .filter(Boolean)
      .join("\n")
      .trim();
    if (joinedText) {
      return joinedText;
    }
  }

  throw new Error("Chat AI returned an empty reply.");
}

function getLatestChatMessage(thread) {
  const messages = Array.isArray(thread?.messages) ? thread.messages : [];
  return messages.length ? messages[messages.length - 1] : null;
}

function shouldAutoReplyWithAi(thread) {
  const latestMessage = getLatestChatMessage(thread);
  if (!latestMessage || latestMessage.isFromSupport) {
    return false;
  }

  const latestUserTimestamp = normalizeChatTimestamp(latestMessage.timestamp);
  const supportReadAt = normalizeOptionalChatTimestamp(thread?.supportReadAt);

  return !supportReadAt || latestUserTimestamp.getTime() > supportReadAt.getTime();
}

async function requestChatAiReply(thread) {
  if (!CHAT_AI_API_KEY) {
    throw new Error(CHAT_AI_ENV_HINT);
  }

  if (typeof fetch !== "function") {
    throw new Error("This server runtime does not support Chat AI requests.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CHAT_AI_TIMEOUT_MS);

  try {
    const response = await fetch(CHAT_AI_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CHAT_AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildChatAiPayload(thread)),
      signal: controller.signal,
    });

    const responseText = await response.text();
    let responsePayload = {};

    if (responseText.trim()) {
      try {
        responsePayload = JSON.parse(responseText);
      } catch (_) {
        responsePayload = {
          message: responseText.trim(),
        };
      }
    }

    if (!response.ok) {
      const errorMessage = String(
        responsePayload?.error?.message ??
        responsePayload?.message ??
        `Chat AI request failed (${response.status}).`,
      ).trim();
      throw new Error(errorMessage || `Chat AI request failed (${response.status}).`);
    }

    return extractChatAiResponseText(responsePayload);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Chat AI request timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function createChatMessageId(isFromSupport = false) {
  return `msg-${Date.now()}-${isFromSupport ? "support" : "user"}`;
}

function normalizeChatReplyReference(input) {
  const messageId = String(input?.messageId ?? "").trim();
  const senderLabel = String(input?.senderLabel ?? "").trim();
  const previewText = String(input?.previewText ?? "").replace(/\s+/g, " ").trim();

  if (!messageId || !senderLabel || !previewText) {
    return null;
  }

  return {
    messageId,
    senderLabel,
    previewText,
  };
}

function normalizeChatMessage(input, index = 0) {
  const text = String(input?.text ?? "").replace(/\s+/g, " ").trim();
  const imageUrl = String(input?.imageUrl ?? "").trim();
  const imageName = String(input?.imageName ?? "").trim();
  const deletedAt = normalizeOptionalChatTimestamp(input?.deletedAt);
  if (!text && !imageUrl && !deletedAt) {
    return null;
  }

  const isFromSupport = input?.isFromSupport === true;
  const timestamp = normalizeChatTimestamp(
    input?.timestamp,
    new Date(Date.now() + index),
  );
  const messageId = String(input?.id ?? "").trim() || createChatMessageId(isFromSupport);
  const normalizedSource = String(input?.source ?? "").trim().toLowerCase();
  const source = isFromSupport
    ? (normalizedSource === "ai" ? "ai" : "support")
    : (normalizedSource === "pin-product" ? "pin-product" : "user");
  const replyTo = normalizeChatReplyReference(input?.replyTo);
  const editedAt = normalizeOptionalChatTimestamp(input?.editedAt);

  return {
    id: messageId,
    text,
    imageUrl,
    imageName,
    isFromSupport,
    isSentToServer: !isFromSupport,
    timestamp: timestamp.toISOString(),
    source,
    editedAt: editedAt ? editedAt.toISOString() : null,
    deletedAt: deletedAt ? deletedAt.toISOString() : null,
    replyTo,
  };
}

function mergeChatMessages(existingMessages, incomingMessages) {
  const messagesById = new Map();
  const normalizedExistingMessages = Array.isArray(existingMessages)
    ? existingMessages
    : [];
  const normalizedIncomingMessages = Array.isArray(incomingMessages)
    ? incomingMessages
    : [];

  for (const [index, message] of normalizedExistingMessages.entries()) {
    const normalizedMessage = normalizeChatMessage(message, index);
    if (!normalizedMessage) {
      continue;
    }
    messagesById.set(normalizedMessage.id, normalizedMessage);
  }

  for (const [index, message] of normalizedIncomingMessages.entries()) {
    const normalizedMessage = normalizeChatMessage(
      message,
      normalizedExistingMessages.length + index,
    );
    if (!normalizedMessage) {
      continue;
    }
    const existingMessage = messagesById.get(normalizedMessage.id);
    const shouldKeepDeletedState =
      Boolean(existingMessage?.deletedAt) && !normalizedMessage.deletedAt;
    messagesById.set(
      normalizedMessage.id,
      existingMessage
        ? {
            ...existingMessage,
            ...normalizedMessage,
            text: shouldKeepDeletedState
              ? existingMessage.text
              : normalizedMessage.deletedAt
              ? normalizedMessage.text
              : (normalizedMessage.text || existingMessage.text),
            imageUrl: shouldKeepDeletedState
              ? existingMessage.imageUrl
              : normalizedMessage.deletedAt
              ? normalizedMessage.imageUrl
              : (normalizedMessage.imageUrl || existingMessage.imageUrl),
            imageName: shouldKeepDeletedState
              ? existingMessage.imageName
              : normalizedMessage.deletedAt
              ? normalizedMessage.imageName
              : (normalizedMessage.imageName || existingMessage.imageName),
            editedAt: shouldKeepDeletedState
              ? existingMessage.editedAt ?? null
              : (normalizedMessage.editedAt ?? existingMessage.editedAt ?? null),
            deletedAt: normalizedMessage.deletedAt ?? existingMessage.deletedAt ?? null,
            replyTo: shouldKeepDeletedState
              ? null
              : normalizedMessage.deletedAt
              ? null
              : (normalizedMessage.replyTo ?? existingMessage.replyTo ?? null),
          }
        : normalizedMessage,
    );
  }

  return [...messagesById.values()].sort((left, right) => {
    const timestampDifference =
      new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime();

    if (timestampDifference !== 0) {
      return timestampDifference;
    }

    return left.id.localeCompare(right.id);
  });
}

function getChatThreadCustomerId(thread) {
  return String(
    thread?.customerId ??
      thread?.userId ??
      thread?.user_id ??
      "",
  ).trim();
}

function buildChatCustomerThreadId(customerId, adminId, productId = "") {
  const normalizedCustomerId = String(customerId ?? "").trim() || "customer-local";
  const normalizedAdminId = String(adminId ?? "").trim();
  const normalizedProductId = String(productId ?? "").trim().toLowerCase() || "product";
  if (normalizedAdminId) {
    return `thread-${normalizedCustomerId}-${normalizedAdminId}-${normalizedProductId}`;
  }
  return `thread-${normalizedCustomerId}-${normalizedProductId}`;
}

function getChatThreadUpdatedTime(thread) {
  const messages = Array.isArray(thread?.messages) ? thread.messages : [];
  const latestMessage = messages[messages.length - 1];
  const threadUpdatedTime = normalizeChatTimestamp(thread?.updatedAt).getTime();
  const latestMessageTime = latestMessage
    ? normalizeChatTimestamp(latestMessage.timestamp).getTime()
    : 0;
  return Math.max(threadUpdatedTime, latestMessageTime);
}

function pickLatestProductThread(leftThread, rightThread) {
  if (!leftThread) {
    return rightThread;
  }

  if (!rightThread) {
    return leftThread;
  }

  const leftHasProduct = String(leftThread.productId ?? "").trim().length > 0;
  const rightHasProduct = String(rightThread.productId ?? "").trim().length > 0;
  if (rightHasProduct && !leftHasProduct) {
    return rightThread;
  }
  if (leftHasProduct && !rightHasProduct) {
    return leftThread;
  }

  return getChatThreadUpdatedTime(rightThread) >= getChatThreadUpdatedTime(leftThread)
    ? rightThread
    : leftThread;
}

function mergeChatThreadRecords(leftThread, rightThread) {
  if (!leftThread) {
    const customerId = getChatThreadCustomerId(rightThread) || "customer-local";
    const adminId = getRecordAdminId(rightThread);
    const productId = String(rightThread?.productId ?? "").trim();
    return {
      ...rightThread,
      adminId,
      customerId,
      userId: customerId,
      threadId: buildChatCustomerThreadId(customerId, adminId, productId),
    };
  }

  const adminId = getRecordAdminId(leftThread, getRecordAdminId(rightThread));
  const customerId =
    getChatThreadCustomerId(rightThread) ||
    getChatThreadCustomerId(leftThread) ||
    "customer-local";
  const productThread = pickLatestProductThread(leftThread, rightThread);
  const productId = String(productThread?.productId ?? "").trim();
  const mergedMessages = mergeChatMessages(leftThread?.messages, rightThread?.messages);
  const latestMergedMessageTime = mergedMessages.length
    ? normalizeChatTimestamp(mergedMessages[mergedMessages.length - 1].timestamp).getTime()
    : 0;
  const updatedAt = new Date(Math.max(
    getChatThreadUpdatedTime(leftThread),
    getChatThreadUpdatedTime(rightThread),
    latestMergedMessageTime,
  ));
  const leftEmployeeRatingUpdatedAt = normalizeOptionalChatTimestamp(
    leftThread?.employeeRatingUpdatedAt,
  );
  const rightEmployeeRatingUpdatedAt = normalizeOptionalChatTimestamp(
    rightThread?.employeeRatingUpdatedAt,
  );
  const rightRatingIsNewer =
    rightEmployeeRatingUpdatedAt &&
    (!leftEmployeeRatingUpdatedAt ||
      rightEmployeeRatingUpdatedAt.getTime() >= leftEmployeeRatingUpdatedAt.getTime());
  const leftSupportReadTime =
    normalizeOptionalChatTimestamp(leftThread?.supportReadAt)?.getTime() || 0;
  const rightSupportReadTime =
    normalizeOptionalChatTimestamp(rightThread?.supportReadAt)?.getTime() || 0;
  const supportReadTime = Math.max(leftSupportReadTime, rightSupportReadTime);

  return {
    ...leftThread,
    adminId,
    customerId,
    userId: customerId,
    threadId: buildChatCustomerThreadId(customerId, adminId, productId),
    customerLabel:
      String(rightThread?.customerLabel ?? "").trim() ||
      String(leftThread?.customerLabel ?? "").trim() ||
      "App User",
    productId: String(productThread?.productId ?? "").trim(),
    productName:
      String(productThread?.productName ?? "").trim() ||
      String(leftThread?.productName ?? "").trim() ||
      "Unnamed Product",
    productCategory: String(productThread?.productCategory ?? "").trim(),
    productDescription: String(productThread?.productDescription ?? "").trim(),
    productImageUrl: String(productThread?.productImageUrl ?? "").trim(),
    productOriginalPrice: Number(productThread?.productOriginalPrice ?? 0) || 0,
    productSalesPrice:
      typeof productThread?.productSalesPrice === "number"
        ? productThread.productSalesPrice
        : null,
    productStock: Number.isFinite(Number(productThread?.productStock))
      ? Math.max(0, Math.trunc(Number(productThread.productStock)))
      : 0,
    productSold: Number.isFinite(Number(productThread?.productSold))
      ? Math.max(0, Math.trunc(Number(productThread.productSold)))
      : 0,
    productRating: Number.isFinite(Number(productThread?.productRating))
      ? Number(productThread.productRating)
      : 0,
    productShowsTopBrand:
      leftThread?.productShowsTopBrand === true || rightThread?.productShowsTopBrand === true,
    companyName:
      String(productThread?.companyName ?? productThread?.storeName ?? productThread?.businessName ?? "").trim() ||
      String(rightThread?.companyName ?? rightThread?.storeName ?? rightThread?.businessName ?? "").trim() ||
      String(leftThread?.companyName ?? leftThread?.storeName ?? leftThread?.businessName ?? "").trim(),
    companyPictureUrl:
      String(
        productThread?.companyPictureUrl ??
          productThread?.companyProfileImageUrl ??
          productThread?.profileImageUrl ??
          "",
      ).trim() ||
      String(
        rightThread?.companyPictureUrl ??
          rightThread?.companyProfileImageUrl ??
          rightThread?.profileImageUrl ??
          "",
      ).trim() ||
      String(
        leftThread?.companyPictureUrl ??
          leftThread?.companyProfileImageUrl ??
          leftThread?.profileImageUrl ??
          "",
      ).trim(),
    employeeRating: rightRatingIsNewer
      ? normalizeChatThreadRating(rightThread?.employeeRating, 0)
      : normalizeChatThreadRating(leftThread?.employeeRating, 0),
    employeeRatingComment: rightRatingIsNewer
      ? String(rightThread?.employeeRatingComment ?? "").trim()
      : String(leftThread?.employeeRatingComment ?? "").trim(),
    employeeRatingUpdatedAt: (
      rightRatingIsNewer ? rightEmployeeRatingUpdatedAt : leftEmployeeRatingUpdatedAt
    )?.toISOString() ?? null,
    updatedAt: updatedAt.toISOString(),
    lastReadAt: new Date(
      Math.max(
        normalizeChatTimestamp(leftThread?.lastReadAt, updatedAt).getTime(),
        normalizeChatTimestamp(rightThread?.lastReadAt, updatedAt).getTime(),
      ),
    ).toISOString(),
    supportReadAt: supportReadTime > 0 ? new Date(supportReadTime).toISOString() : null,
    typing: mergeChatTypingState(leftThread?.typing, rightThread?.typing),
    messages: mergedMessages,
  };
}

function mergeChatThreadsByCustomer(threads) {
  const threadsByCustomerId = new Map();
  const orderedThreads = [...threads].sort(
    (left, right) => getChatThreadUpdatedTime(left) - getChatThreadUpdatedTime(right),
  );

  for (const thread of orderedThreads) {
    const adminId = getRecordAdminId(thread);
    const customerId = getChatThreadCustomerId(thread) || "customer-local";
    const productId = String(thread?.productId ?? "").trim();
    const customerKey = `${adminId}:${customerId.toLowerCase()}:${productId.toLowerCase()}`;
    const normalizedThread = {
      ...thread,
      adminId,
      customerId,
      userId: customerId,
      threadId: buildChatCustomerThreadId(customerId, adminId, productId),
    };
    threadsByCustomerId.set(
      customerKey,
      mergeChatThreadRecords(threadsByCustomerId.get(customerKey), normalizedThread),
    );
  }

  return [...threadsByCustomerId.values()];
}

async function readNormalizedChatThreads(adminId = DEFAULT_ADMIN_ID) {
  return mergeChatThreadsByCustomer(
    filterRecordsByAdminId(await readChatThreads(), adminId).map(normalizeStoredChatThreadRecord),
  );
}

async function readAllNormalizedChatThreads() {
  return mergeChatThreadsByCustomer(
    (await readChatThreads()).map(normalizeStoredChatThreadRecord),
  );
}

async function writeNormalizedChatThreadsForAdmin(adminId, scopedThreads) {
  const normalizedAdminId = normalizeAdminTenantId(adminId, DEFAULT_ADMIN_ID);
  const existingThreads = await readChatThreads();
  const scopedThreadRecords = sortChatThreadsByUpdatedAt(
    mergeChatThreadsByCustomer(
      (Array.isArray(scopedThreads) ? scopedThreads : []).map((thread) =>
        applyAdminId(thread, normalizedAdminId),
      ),
    ),
  );
  const nextThreads = sortChatThreadsByUpdatedAt([
    ...existingThreads.filter((thread) => !isRecordInAdminScope(thread, normalizedAdminId)),
    ...scopedThreadRecords,
  ]);
  await writeChatThreads(nextThreads);
}

function normalizeStoredChatThreadRecord(thread) {
  const customerId = getChatThreadCustomerId(thread) || "customer-local";
  const productId = String(thread?.productId ?? "").trim();
  const messages = mergeChatMessages([], thread?.messages);
  const latestMessageTime = messages.length
    ? normalizeChatTimestamp(messages[messages.length - 1].timestamp).getTime()
    : 0;
  const updatedAt = new Date(Math.max(
    normalizeChatTimestamp(thread?.updatedAt).getTime(),
    latestMessageTime,
  ));
  const employeeRatingUpdatedAt = normalizeOptionalChatTimestamp(
    thread?.employeeRatingUpdatedAt,
  );

  return {
    threadId: buildChatCustomerThreadId(customerId, getRecordAdminId(thread), productId),
    adminId: getRecordAdminId(thread),
    customerId,
    userId: customerId,
    customerLabel:
      String(thread?.customerLabel ?? "").trim() || "App User",
    productId,
    productName: String(thread?.productName ?? "").trim() || "Unnamed Product",
    productCategory: String(thread?.productCategory ?? "").trim(),
    productDescription: String(thread?.productDescription ?? "").trim(),
    productImageUrl: String(thread?.productImageUrl ?? "").trim(),
    productOriginalPrice: parsePriceInput(thread?.productOriginalPrice) || 0,
    productSalesPrice: hasInputValue(thread?.productSalesPrice)
      ? parsePriceInput(thread?.productSalesPrice)
      : null,
    productStock: Number.isFinite(parseNumberInput(thread?.productStock))
      ? Math.max(0, Math.trunc(parseNumberInput(thread?.productStock)))
      : 0,
    productSold: Number.isFinite(parseNumberInput(thread?.productSold))
      ? Math.max(0, Math.trunc(parseNumberInput(thread?.productSold)))
      : 0,
    productRating: Number.isFinite(parseNumberInput(thread?.productRating))
      ? Math.max(0, Number(parseNumberInput(thread?.productRating)))
      : 0,
    productShowsTopBrand: thread?.productShowsTopBrand === true,
    companyName: String(
      thread?.companyName ?? thread?.storeName ?? thread?.businessName ?? "",
    ).trim(),
    companyPictureUrl: String(
      thread?.companyPictureUrl ??
        thread?.companyProfileImageUrl ??
        thread?.profileImageUrl ??
        "",
    ).trim(),
    employeeRating: normalizeChatThreadRating(thread?.employeeRating, 0),
    employeeRatingComment: String(thread?.employeeRatingComment ?? "").trim(),
    employeeRatingUpdatedAt: employeeRatingUpdatedAt?.toISOString() ?? null,
    updatedAt: updatedAt.toISOString(),
    lastReadAt: normalizeChatTimestamp(
      thread?.lastReadAt,
      updatedAt,
    ).toISOString(),
    supportReadAt: normalizeOptionalChatTimestamp(thread?.supportReadAt)?.toISOString() ?? null,
    typing: normalizeChatTypingState(thread?.typing),
    messages,
  };
}

function normalizeIncomingChatThread(input, existingThread = null) {
  const customerId =
    getChatThreadCustomerId(input) ||
    getChatThreadCustomerId(existingThread) ||
    "customer-local";
  const productId = String(
    input?.productId ?? existingThread?.productId ?? "",
  ).trim();

  if (!productId) {
    throw new Error("Product ID is required.");
  }

  const mergedMessages = mergeChatMessages(
    existingThread?.messages,
    input?.messages,
  );
  const requestedUpdatedAt = normalizeChatTimestamp(
    input?.updatedAt ?? existingThread?.updatedAt,
    new Date(),
  );
  const latestMessageTimestamp = mergedMessages.length
    ? normalizeChatTimestamp(mergedMessages[mergedMessages.length - 1].timestamp)
    : requestedUpdatedAt;
  const threadUpdatedAt = new Date(Math.max(
    requestedUpdatedAt.getTime(),
    latestMessageTimestamp.getTime(),
  ));
  const requestedLastReadAt = normalizeChatTimestamp(
    input?.lastReadAt ?? existingThread?.lastReadAt,
    threadUpdatedAt,
  );
  const requestedSupportReadAt = normalizeOptionalChatTimestamp(
    input?.supportReadAt ?? existingThread?.supportReadAt,
  );
  const employeeRating = normalizeChatThreadRating(
    input?.employeeRating ?? existingThread?.employeeRating ?? 0,
    0,
  );
  const employeeRatingUpdatedAt = normalizeOptionalChatTimestamp(
    input?.employeeRatingUpdatedAt ?? existingThread?.employeeRatingUpdatedAt,
  );
  const originalPrice = parsePriceInput(
    input?.productOriginalPrice ?? existingThread?.productOriginalPrice ?? 0,
  );
  const salesPrice = hasInputValue(
    input?.productSalesPrice ?? existingThread?.productSalesPrice,
  )
    ? parsePriceInput(input?.productSalesPrice ?? existingThread?.productSalesPrice)
    : null;
  const stock = parseNumberInput(
    input?.productStock ?? existingThread?.productStock ?? 0,
  );

  return {
    threadId: buildChatCustomerThreadId(
      customerId,
      getRecordAdminId(input, getRecordAdminId(existingThread)),
      productId,
    ),
    adminId: getRecordAdminId(input, getRecordAdminId(existingThread)),
    customerId,
    userId: customerId,
    customerLabel:
      String(input?.customerLabel ?? existingThread?.customerLabel ?? "").trim() ||
      "App User",
    productId,
    productName:
      String(input?.productName ?? existingThread?.productName ?? "").trim() ||
      "Unnamed Product",
    productCategory: String(
      input?.productCategory ?? existingThread?.productCategory ?? "",
    ).trim(),
    productDescription: String(
      input?.productDescription ?? existingThread?.productDescription ?? "",
    ).trim(),
    productImageUrl: String(
      input?.productImageUrl ?? existingThread?.productImageUrl ?? "",
    ).trim(),
    productOriginalPrice: Number.isFinite(originalPrice) ? originalPrice : 0,
    productSalesPrice:
      Number.isFinite(salesPrice) && salesPrice >= 0 ? salesPrice : null,
    productStock:
      Number.isFinite(stock) && stock >= 0 ? Math.trunc(stock) : 0,
    productSold: Number.isFinite(parseNumberInput(input?.productSold ?? existingThread?.productSold ?? 0))
      ? Math.max(0, Math.trunc(parseNumberInput(input?.productSold ?? existingThread?.productSold ?? 0)))
      : 0,
    productRating: Number.isFinite(parseNumberInput(input?.productRating ?? existingThread?.productRating ?? 0))
      ? Math.max(0, Number(parseNumberInput(input?.productRating ?? existingThread?.productRating ?? 0)))
      : 0,
    productShowsTopBrand:
      input?.productShowsTopBrand === true || existingThread?.productShowsTopBrand === true,
    companyName: String(
      input?.companyName ??
        input?.storeName ??
        input?.businessName ??
        existingThread?.companyName ??
        existingThread?.storeName ??
        existingThread?.businessName ??
        "",
    ).trim(),
    companyPictureUrl: String(
      input?.companyPictureUrl ??
        input?.companyProfileImageUrl ??
        input?.profileImageUrl ??
        existingThread?.companyPictureUrl ??
        existingThread?.companyProfileImageUrl ??
        existingThread?.profileImageUrl ??
        "",
    ).trim(),
    employeeRating,
    employeeRatingComment: String(
      input?.employeeRatingComment ?? existingThread?.employeeRatingComment ?? "",
    ).trim(),
    employeeRatingUpdatedAt: employeeRatingUpdatedAt?.toISOString() ?? null,
    updatedAt: threadUpdatedAt.toISOString(),
    lastReadAt: requestedLastReadAt.toISOString(),
    supportReadAt: requestedSupportReadAt?.toISOString() ?? null,
    typing: mergeChatTypingState(existingThread?.typing, input?.typing),
    messages: mergedMessages,
  };
}

function sortChatThreadsByUpdatedAt(threads) {
  return [...threads].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

async function readChatThreadsForRequest(request, requestUrl, requestAdminId) {
  if (hasRequestAdminScope(request, requestUrl)) {
    return readNormalizedChatThreads(requestAdminId);
  }
  return readAllNormalizedChatThreads();
}

function findChatThreadIndex(threads, threadId) {
  const normalizedThreadId = String(threadId ?? "").trim().toLowerCase();
  return threads.findIndex(
    (thread) => String(thread?.threadId ?? "").trim().toLowerCase() === normalizedThreadId,
  );
}

async function handleChatSupportApi(request, response, requestUrl) {
  const requestAdminId = getRequestAdminId(request, requestUrl);
  const requestHasAdminScope = hasRequestAdminScope(request, requestUrl);

  if (request.method === "GET") {
    try {
      const requestedCustomerId = String(
        requestUrl?.searchParams.get("customerId") ??
          requestUrl?.searchParams.get("userId") ??
          requestUrl?.searchParams.get("user_id") ??
          "",
      )
        .trim()
        .toLowerCase();
      if (!requestedCustomerId && !requestHasAdminScope) {
        sendJson(response, 200, { threads: [] });
        return;
      }
      const threads = sortChatThreadsByUpdatedAt(
        await readChatThreadsForRequest(request, requestUrl, requestAdminId),
      );
      const visibleThreads = requestedCustomerId
        ? threads.filter(
            (thread) =>
              getChatThreadCustomerId(thread).toLowerCase() ===
              requestedCustomerId,
          )
        : threads;

      sendJson(response, 200, { threads: visibleThreads });
    } catch (error) {
      sendJson(response, 500, {
        message: error instanceof Error ? error.message : "Unable to load chat threads.",
      });
    }
    return;
  }

  if (request.method === "POST") {
    try {
      const payload = await parseRequestBody(request);
      const threadInput =
        payload?.thread && typeof payload.thread === "object"
          ? payload.thread
          : payload;
      const effectiveAdminId = requestHasAdminScope
        ? requestAdminId
        : getRecordAdminId(threadInput, requestAdminId);
      const threads = await readNormalizedChatThreads(effectiveAdminId);
      const requestedCustomerId = getChatThreadCustomerId(threadInput);
      const requestedProductId = String(threadInput?.productId ?? "").trim();
      const requestedThreadId =
        (requestedCustomerId && requestedProductId
          ? buildChatCustomerThreadId(
              requestedCustomerId,
              effectiveAdminId,
              requestedProductId,
            )
          : "") ||
        String(threadInput?.threadId ?? "").trim();
      const existingThreadIndex = requestedThreadId
        ? findChatThreadIndex(threads, requestedThreadId)
        : -1;
      const existingThread =
        existingThreadIndex >= 0 ? threads[existingThreadIndex] : null;
      let normalizedThread = normalizeIncomingChatThread(
        {
          ...threadInput,
          adminId: threadInput?.adminId ?? effectiveAdminId,
        },
        existingThread,
      );

      if (shouldAutoReplyWithAi(normalizedThread)) {
        try {
          const aiReplyText = await requestChatAiReply(normalizedThread);
          const aiReplyMessage = normalizeChatMessage({
            id: createChatMessageId(true),
            text: aiReplyText,
            isFromSupport: true,
            source: "ai",
            timestamp: new Date().toISOString(),
          });

          normalizedThread = normalizeIncomingChatThread(
            {
              ...normalizedThread,
              messages: [...normalizedThread.messages, aiReplyMessage],
              updatedAt: aiReplyMessage.timestamp,
            },
            normalizedThread,
          );
        } catch (error) {
          console.error("Unable to generate automatic AI reply:", error);
        }
      }

      normalizedThread = {
        ...normalizedThread,
        typing: updateChatTypingState(normalizedThread.typing, "user", {
          isTyping: false,
        }),
      };

      if (existingThreadIndex >= 0) {
        threads[existingThreadIndex] = normalizedThread;
      } else {
        threads.unshift(normalizedThread);
      }

      const sortedThreads = sortChatThreadsByUpdatedAt(mergeChatThreadsByCustomer(threads));
      await writeNormalizedChatThreadsForAdmin(effectiveAdminId, sortedThreads);
      sendJson(response, 200, {
        thread: normalizedThread,
        message: "Chat thread synced.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : "Unable to sync chat thread.",
      });
    }
    return;
  }

  sendJson(response, 405, { message: "Method not allowed." });
}

  async function handleSellerFollowApi(request, response, sellerAdminId) {
    const requestUrl = new URL(request.url, `http://127.0.0.1:${PORT}`);
    try {
      if (request.method !== "POST") {
        sendJson(response, 405, { message: "Method not allowed." });
        return;
      }

      const identifier = getRequestAccountIdentifier(request, requestUrl);
      const accounts = await readAccounts();
      let account = null;
      if (identifier.id) {
        account = accounts.find((a) => [a.id, a._id, a.accountCode, a.employeeId].some((v) => String(v ?? "").trim().toLowerCase() === identifier.id.toLowerCase()));
      }
      if (!account && identifier.email) {
        account = accounts.find((a) => String(a.email ?? "").trim().toLowerCase() === identifier.email.toLowerCase());
      }

      if (!account) {
        sendJson(response, 401, { message: "Account not found. Provide account id or email." });
        return;
      }

      const followers = await readFollowers();
      const key = normalizeAdminTenantId(sellerAdminId, "");
      const list = getFollowersListForAdmin(followers, key);
      const accountId = String(account.id ?? account._id ?? account.accountCode ?? account.email ?? identifier.id ?? identifier.email ?? "").trim();
      if (!key || !accountId) {
        sendJson(response, 400, { message: "Seller and account are required." });
        return;
      }
      if (!list.includes(accountId)) {
        list.push(accountId);
      }
      followers[key] = list;
      await writeFollowers(followers);
      sendJson(response, 200, { adminId: key, followersCount: list.length, followed: true });
    } catch (error) {
      sendJson(response, 500, { message: error instanceof Error ? error.message : "Unable to follow seller." });
    }
  }

  async function handleSellerUnfollowApi(request, response, sellerAdminId) {
    const requestUrl = new URL(request.url, `http://127.0.0.1:${PORT}`);
    try {
      if (request.method !== "POST") {
        sendJson(response, 405, { message: "Method not allowed." });
        return;
      }

      const identifier = getRequestAccountIdentifier(request, requestUrl);
      const accounts = await readAccounts();
      let account = null;
      if (identifier.id) {
        account = accounts.find((a) => [a.id, a._id, a.accountCode, a.employeeId].some((v) => String(v ?? "").trim().toLowerCase() === identifier.id.toLowerCase()));
      }
      if (!account && identifier.email) {
        account = accounts.find((a) => String(a.email ?? "").trim().toLowerCase() === identifier.email.toLowerCase());
      }

      if (!account) {
        sendJson(response, 401, { message: "Account not found. Provide account id or email." });
        return;
      }

      const followers = await readFollowers();
      const key = normalizeAdminTenantId(sellerAdminId, "");
      const list = getFollowersListForAdmin(followers, key);
      const accountId = String(account.id ?? account._id ?? account.accountCode ?? account.email ?? identifier.id ?? identifier.email ?? "").trim();
      if (!key || !accountId) {
        sendJson(response, 400, { message: "Seller and account are required." });
        return;
      }
      const next = list.filter((id) => String(id ?? "").trim() !== accountId);
      followers[key] = next;
      await writeFollowers(followers);
      sendJson(response, 200, { adminId: key, followersCount: next.length, followed: false });
    } catch (error) {
      sendJson(response, 500, { message: error instanceof Error ? error.message : "Unable to unfollow seller." });
    }
  }

  async function handleSellerFollowersCountApi(request, response, sellerAdminId) {
    try {
      if (request.method !== "GET") {
        sendJson(response, 405, { message: "Method not allowed." });
        return;
      }

      const followers = await readFollowers();
      const key = normalizeAdminTenantId(sellerAdminId, "");
      const list = getFollowersListForAdmin(followers, key);
      sendJson(response, 200, { adminId: key, followersCount: list.length });
    } catch (error) {
      sendJson(response, 500, { message: error instanceof Error ? error.message : "Unable to read followers count." });
    }
  }

  async function handleSuperAdminFollowersCountApi(request, response, adminId) {
    try {
      if (request.method !== "GET") {
        sendJson(response, 405, { message: "Method not allowed." });
        return;
      }

      const followers = await readFollowers();
      const key = normalizeAdminTenantId(adminId, "");
      const list = getFollowersListForAdmin(followers, key);
      sendJson(response, 200, { adminId: key, followersCount: list.length });
    } catch (error) {
      sendJson(response, 500, { message: error instanceof Error ? error.message : "Unable to read followers count." });
    }
  }

  async function handleSellerIsFollowedApi(request, response, sellerAdminId) {
    const requestUrl = new URL(request.url, `http://127.0.0.1:${PORT}`);
    try {
      if (request.method !== "GET") {
        sendJson(response, 405, { message: "Method not allowed." });
        return;
      }

      const identifier = getRequestAccountIdentifier(request, requestUrl);
      if (!identifier.id && !identifier.email) {
        sendJson(response, 400, { message: "Provide account id or email as query or header." });
        return;
      }

      const accounts = await readAccounts();
      let account = null;
      if (identifier.id) {
        account = accounts.find((a) => [a.id, a._id, a.accountCode, a.employeeId].some((v) => String(v ?? "").trim().toLowerCase() === identifier.id.toLowerCase()));
      }
      if (!account && identifier.email) {
        account = accounts.find((a) => String(a.email ?? "").trim().toLowerCase() === identifier.email.toLowerCase());
      }

      if (!account) {
        sendJson(response, 200, { followed: false });
        return;
      }

      const followers = await readFollowers();
      const key = normalizeAdminTenantId(sellerAdminId, "");
      const list = getFollowersListForAdmin(followers, key);
      const accountId = String(account.id ?? account._id ?? account.accountCode ?? account.email ?? identifier.id ?? identifier.email ?? "").trim();
      sendJson(response, 200, { followed: list.includes(accountId) });
    } catch (error) {
      sendJson(response, 500, { message: error instanceof Error ? error.message : "Unable to check follow status." });
    }
  }

  async function handleSellerFollowersOverviewApi(request, response) {
    if (!requireSuperAdmin(request, response)) {
      return;
    }

    try {
      const [followers, products, accounts] = await Promise.all([readFollowers(), readProducts(), readAccounts()]);
      const perSeller = Object.keys(followers || {}).map((adminId) => {
        const normalized = normalizeAdminTenantId(adminId, "");
        return {
          adminId: normalized,
          followersCount: Array.isArray(followers[adminId]) ? followers[adminId].length : 0,
          productCount: products.filter((p) => normalizeAdminTenantId(getRecordAdminId(p, p.adminId), "") === normalized).length,
          account: accounts.find((a) => getRecordAdminId(a, a.adminId) === normalized) || null,
        };
      });

      const totalFollowers = perSeller.reduce((sum, s) => sum + Number(s.followersCount || 0), 0);
      sendJson(response, 200, { totalFollowers, perSeller });
    } catch (error) {
      sendJson(response, 500, { message: error instanceof Error ? error.message : "Unable to load followers overview." });
    }
  }

  function serializeSellerSummary(account, products = []) {
    const safeAccount = serializeAdminAccount(account);
    const adminId = getRecordAdminId(safeAccount, safeAccount.adminId);
    const sellerProducts = (Array.isArray(products) ? products : []).filter(
      (product) => getRecordAdminId(product, product?.adminId) === adminId,
    );
    const productCompanyPictureUrl = sellerProducts
      .map((product) => String(product?.companyPictureUrl ?? "").trim())
      .find(Boolean) || "";
    const companyName = [
      safeAccount.companyName,
      safeAccount.storeName,
      safeAccount.businessName,
      safeAccount.displayName,
    ]
      .map((value) => String(value ?? "").replace(/\s+/g, " ").trim())
      .find(Boolean) || "";
    const imageUrl = [
      safeAccount.companyPictureUrl,
      safeAccount.companyProfileImageUrl,
      safeAccount.profileImageUrl,
      safeAccount.logoUrl,
      safeAccount.avatarUrl,
      safeAccount.photoUrl,
      productCompanyPictureUrl,
    ]
      .map((value) => String(value ?? "").trim())
      .find(Boolean) || "";

    return {
      adminId,
      name: companyName || adminId,
      companyName,
      storeName: safeAccount.storeName || companyName,
      businessName: safeAccount.businessName || companyName,
      storeType: safeAccount.storeType || safeAccount.storeTypeName || safeAccount.businessType || "",
      storeTypeName: safeAccount.storeTypeName || safeAccount.storeType || safeAccount.businessType || "",
      businessType: safeAccount.businessType || safeAccount.storeType || safeAccount.storeTypeName || "",
      profileImageUrl: imageUrl,
      companyPictureUrl: imageUrl,
      createdAt: safeAccount.createdAt || "",
      productCount: sellerProducts.length,
    };
  }

  async function handleSellersApi(request, response) {
    if (request.method !== "GET") {
      sendJson(response, 405, { message: "Method not allowed." });
      return;
    }

    try {
      const [accounts, products] = await Promise.all([
        readAccounts(),
        readProducts(),
      ]);
      const normalizedProducts = attachProductsCompanyMetadata(
        products.map(normalizeStoredProductRecord),
        accounts,
      );
      const sellers = accounts
        .filter(isAdminAccount)
        .map((account) => serializeSellerSummary(account, normalizedProducts))
        .filter((seller) => seller.adminId)
        .sort((left, right) => {
          const leftName = String(left.companyName || left.name || "").toLowerCase();
          const rightName = String(right.companyName || right.name || "").toLowerCase();
          return leftName.localeCompare(rightName);
        });

      sendJson(response, 200, {
        sellers,
        total: sellers.length,
      });
    } catch (error) {
      sendJson(response, 500, {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load sellers.",
      });
    }
  }

  // GET /api/sellers/:adminId/profile - Get seller profile info (name, picture, rating)
  async function handleSellerProfileApi(request, response, sellerAdminId) {
    try {
      const [products, accounts, followers, orders] = await Promise.all([
        readProducts(),
        readAccounts(),
        readFollowers(),
        readOrders(),
      ]);
      const normalized = normalizeAdminTenantId(sellerAdminId, "");
      const account = accounts.find((a) => normalizeAdminTenantId(getRecordAdminId(a, a.adminId), "") === normalized);
      const sellerProducts = products.filter((p) => normalizeAdminTenantId(getRecordAdminId(p, p.adminId), "") === normalized);
      const reviewSummary = summarizeProductReviewAggregatesForProducts(
        sellerProducts,
        buildProductReviewAggregates(orders, normalized),
      );

      const followerCount = getFollowersListForAdmin(followers, normalized).length;
      const productCompanyPictureUrl = sellerProducts
        .map((product) => String(product?.companyPictureUrl ?? "").trim())
        .find(Boolean) || "";

      sendJson(response, 200, {
        adminId: normalized,
        name: account?.storeName || account?.companyName || account?.businessName || account?.firstName || normalized,
        profileImageUrl: account?.profileImageUrl || productCompanyPictureUrl || "",
        companyPictureUrl: productCompanyPictureUrl || account?.profileImageUrl || "",
        rating: reviewSummary.rating,
        ratingCount: reviewSummary.ratingCount,
        ratingPoints: reviewSummary.ratingPoints,
        commentCount: reviewSummary.commentCount,
        reviewCount: reviewSummary.reviewCount,
        productCount: sellerProducts.length,
        followerCount,
      });
    } catch (error) {
      sendJson(response, 500, { message: error instanceof Error ? error.message : "Unable to load seller profile." });
    }
  }

  async function handleAdminFollowersCountApi(request, response) {
    try {
      const requestUrl = new URL(request.url, `http://127.0.0.1:${PORT}`);
      const requestAdminId = getRequestAdminId(request, requestUrl);
      const normalized = normalizeAdminTenantId(requestAdminId, "");

      if (!normalized) {
        sendJson(response, 401, { message: "Unauthorized. Admin ID required." });
        return;
      }

      const followers = await readFollowers();
      const followerCount = getFollowersListForAdmin(followers, normalized).length;

      sendJson(response, 200, {
        adminId: normalized,
        followerCount,
        followersCount: followerCount,
      });
    } catch (error) {
      sendJson(response, 500, { message: error instanceof Error ? error.message : "Unable to load followers count." });
    }
  }

async function handleSingleChatSupportApi(request, response, threadId, action = "") {
  const requestUrl = new URL(request.url, `http://127.0.0.1:${PORT}`);
  const requestAdminId = getRequestAdminId(request, requestUrl);
  const normalizedThreadId = String(threadId ?? "").trim();
  if (!normalizedThreadId) {
    sendJson(response, 400, { message: "Thread ID is required." });
    return;
  }

  if (request.method === "GET" && !action) {
    try {
      const threads = await readNormalizedChatThreads(requestAdminId);
      const thread = threads.find((candidate) => candidate.threadId === normalizedThreadId);

      if (!thread) {
        sendJson(response, 404, { message: "Chat thread not found." });
        return;
      }

      sendJson(response, 200, { thread });
    } catch (error) {
      sendJson(response, 500, {
        message: error instanceof Error ? error.message : "Unable to load chat thread.",
      });
    }
    return;
  }

  if (request.method === "DELETE" && !action) {
    try {
      const threads = await readNormalizedChatThreads(requestAdminId);
      const threadIndex = findChatThreadIndex(threads, normalizedThreadId);

      if (threadIndex < 0) {
        sendJson(response, 404, { message: "Chat thread not found." });
        return;
      }

      const nextThreads = threads.filter(
        (thread) => thread.threadId !== normalizedThreadId,
      );
      await writeNormalizedChatThreadsForAdmin(
        requestAdminId,
        sortChatThreadsByUpdatedAt(mergeChatThreadsByCustomer(nextThreads)),
      );
      sendJson(response, 200, {
        deletedId: normalizedThreadId,
        message: "Chat thread deleted.",
      });
    } catch (error) {
      sendJson(response, 500, {
        message: error instanceof Error ? error.message : "Unable to delete chat thread.",
      });
    }
    return;
  }

  if ((request.method === "POST" || request.method === "PUT") && action === "typing") {
    try {
      const payload = await parseRequestBody(request);
      const actor = String(payload?.actor ?? "").trim().toLowerCase();
      if (actor !== "user" && actor !== "employee") {
        sendJson(response, 400, { message: "Typing actor is required." });
        return;
      }

      const threads = await readNormalizedChatThreads(requestAdminId);
      let threadIndex = findChatThreadIndex(threads, normalizedThreadId);

      if (threadIndex < 0) {
        const threadInput =
          payload?.thread && typeof payload.thread === "object"
            ? {
                ...payload.thread,
                threadId: normalizedThreadId,
                adminId: requestAdminId,
              }
            : null;

        if (actor !== "user" || !threadInput) {
          sendJson(response, 404, { message: "Chat thread not found." });
          return;
        }

        try {
          const createdThread = normalizeIncomingChatThread(threadInput, null);
          threads.unshift(createdThread);
          threadIndex = findChatThreadIndex(threads, normalizedThreadId);
        } catch (error) {
          sendJson(response, 404, { message: "Chat thread not found." });
          return;
        }

        if (threadIndex < 0) {
          sendJson(response, 404, { message: "Chat thread not found." });
          return;
        }
      }

      const targetThread = threads[threadIndex];
      const fallbackDisplayName =
        actor === "employee"
          ? "Employee"
          : String(targetThread.customerLabel || "").trim() || "App User";
      const updatedThread = {
        ...targetThread,
        typing: updateChatTypingState(targetThread.typing, actor, {
          isTyping: payload?.isTyping === true,
          isOnline: Object.prototype.hasOwnProperty.call(payload ?? {}, "isOnline")
            ? payload?.isOnline === true
            : undefined,
          displayName:
            String(payload?.displayName ?? payload?.name ?? "").trim() ||
            fallbackDisplayName,
          avatarUrl:
            String(payload?.avatarUrl ?? payload?.profileImageUrl ?? "").trim() ||
            (actor === "user"
              ? String(targetThread.customerAvatarUrl ?? targetThread.profileImageUrl ?? "").trim()
              : ""),
        }),
      };

      threads[threadIndex] = updatedThread;
      const sortedThreads = sortChatThreadsByUpdatedAt(mergeChatThreadsByCustomer(threads));
      await writeNormalizedChatThreadsForAdmin(requestAdminId, sortedThreads);
      sendJson(response, 200, {
        thread: updatedThread,
        message: payload?.isTyping === true ? "Typing state updated." : "Typing state cleared.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message:
          error instanceof Error ? error.message : "Unable to update typing state.",
      });
    }
    return;
  }

  if (request.method === "POST" && action === "reply") {
    try {
      const payload = await parseRequestBody(request);
      const replyText = String(payload?.text ?? "").replace(/\s+/g, " ").trim();
      const replyImageUrl = String(payload?.imageUrl ?? "").trim();
      const replyImageName = String(payload?.imageName ?? "").trim();
      const replyTo = normalizeChatReplyReference(payload?.replyTo);
      if (!replyText && !replyImageUrl) {
        throw new Error("Reply message or attachment is required.");
      }

      const threads = await readNormalizedChatThreads(requestAdminId);
      const threadIndex = findChatThreadIndex(threads, normalizedThreadId);

      if (threadIndex < 0) {
        sendJson(response, 404, { message: "Chat thread not found." });
        return;
      }

      const targetThread = threads[threadIndex];
      const replyMessage = normalizeChatMessage({
        id: createChatMessageId(true),
        text: replyText,
        imageUrl: replyImageUrl,
        imageName: replyImageName,
        isFromSupport: true,
        source: "support",
        timestamp: new Date().toISOString(),
        replyTo,
      });
      if (!replyMessage) {
        throw new Error("Reply message or attachment is required.");
      }

      const updatedThread = normalizeIncomingChatThread(
        {
          ...targetThread,
          messages: [...targetThread.messages, replyMessage],
          updatedAt: replyMessage.timestamp,
          supportReadAt: replyMessage.timestamp,
        },
        targetThread,
      );

      const updatedThreadWithTyping = {
        ...updatedThread,
        typing: updateChatTypingState(updatedThread.typing, "employee", {
          isTyping: false,
        }),
      };

      threads[threadIndex] = updatedThreadWithTyping;
      const sortedThreads = sortChatThreadsByUpdatedAt(mergeChatThreadsByCustomer(threads));
      await writeNormalizedChatThreadsForAdmin(requestAdminId, sortedThreads);
      sendJson(response, 200, {
        thread: updatedThreadWithTyping,
        message: "Reply sent.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : "Unable to send reply.",
      });
  }
      return;
  }

  if (
    (request.method === "PUT" || request.method === "POST") &&
    action === "edit-message"
  ) {
    try {
      const payload = await parseRequestBody(request);
      const messageId = String(payload?.messageId ?? "").trim();
      const nextText = String(payload?.text ?? "").replace(/\s+/g, " ").trim();
      if (!messageId || !nextText) {
        throw new Error("Message ID and updated text are required.");
      }

      const threads = await readNormalizedChatThreads(requestAdminId);
      const threadIndex = findChatThreadIndex(threads, normalizedThreadId);

      if (threadIndex < 0) {
        sendJson(response, 404, { message: "Chat thread not found." });
        return;
      }

      const targetThread = threads[threadIndex];
      const targetMessage = Array.isArray(targetThread.messages)
        ? targetThread.messages.find((message) => String(message?.id || "").trim() === messageId)
        : null;
      if (!targetMessage) {
        sendJson(response, 404, { message: "Chat message not found." });
        return;
      }

      if (String(targetMessage.source || "").trim().toLowerCase() === "ai") {
        sendJson(response, 403, { message: "AI messages cannot be edited." });
        return;
      }

      if (targetMessage.deletedAt) {
        sendJson(response, 403, { message: "Deleted messages cannot be edited." });
        return;
      }

      const targetIsFromSupport = targetMessage.isFromSupport === true;
      const targetSource = String(targetMessage.source || "").trim().toLowerCase() || (
        targetIsFromSupport ? "support" : "user"
      );
      const nextEditedAt = new Date().toISOString();
      const nextMessages = (Array.isArray(targetThread.messages) ? targetThread.messages : [])
        .map((message, index) => {
          const currentMessageId = String(message?.id || "").trim();
          if (currentMessageId === messageId) {
            return normalizeChatMessage(
              {
                ...message,
                id: targetMessage.id,
                text: nextText,
                imageUrl: targetMessage.imageUrl,
                imageName: targetMessage.imageName,
                isFromSupport: targetIsFromSupport,
                source: targetSource,
                timestamp: targetMessage.timestamp,
                editedAt: nextEditedAt,
                replyTo: targetMessage.replyTo,
              },
              index,
            );
          }

          const replyTo = normalizeChatReplyReference(message?.replyTo);
          if (replyTo?.messageId === messageId) {
            return normalizeChatMessage(
              {
                ...message,
                replyTo: {
                  ...replyTo,
                  previewText: nextText,
                },
              },
              index,
            );
          }

          return normalizeChatMessage(message, index);
        })
        .filter(Boolean);

      const updatedThread = normalizeIncomingChatThread(
        {
          ...targetThread,
          messages: nextMessages,
          supportReadAt: targetThread.supportReadAt,
          lastReadAt: targetThread.lastReadAt,
        },
        null,
      );

      const updatedThreadWithTyping = {
        ...updatedThread,
        typing: updateChatTypingState(
          updatedThread.typing,
          targetIsFromSupport ? "employee" : "user",
          {
            isTyping: false,
          },
        ),
      };

      threads[threadIndex] = updatedThreadWithTyping;
      const sortedThreads = sortChatThreadsByUpdatedAt(mergeChatThreadsByCustomer(threads));
      await writeNormalizedChatThreadsForAdmin(requestAdminId, sortedThreads);
      sendJson(response, 200, {
        thread: updatedThreadWithTyping,
        message: "Message updated.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : "Unable to update message.",
      });
    }
    return;
  }

  if (request.method === "POST" && action === "delete-message") {
    try {
      const payload = await parseRequestBody(request);
      const messageId = String(payload?.messageId ?? "").trim();
      const requestCustomerId = getChatThreadCustomerId(payload).toLowerCase();
      if (!messageId) {
        throw new Error("Message ID is required.");
      }

      const threads = await readNormalizedChatThreads(requestAdminId);
      const threadIndex = findChatThreadIndex(threads, normalizedThreadId);

      if (threadIndex < 0) {
        sendJson(response, 404, { message: "Chat thread not found." });
        return;
      }

      const targetThread = threads[threadIndex];
      const targetMessage = Array.isArray(targetThread.messages)
        ? targetThread.messages.find((message) => String(message?.id || "").trim() === messageId)
        : null;
      if (!targetMessage) {
        sendJson(response, 404, { message: "Chat message not found." });
        return;
      }

      if (String(targetMessage.source || "").trim().toLowerCase() === "ai") {
        sendJson(response, 403, { message: "AI messages cannot be deleted." });
        return;
      }

      if (targetMessage.isFromSupport !== true) {
        const threadCustomerId = getChatThreadCustomerId(targetThread).toLowerCase();
        if (!requestCustomerId || requestCustomerId !== threadCustomerId) {
          sendJson(response, 403, {
            message: "Customer messages can only be deleted by the message owner.",
          });
          return;
        }
      }

      if (targetMessage.deletedAt) {
        sendJson(response, 200, {
          thread: targetThread,
          message: "Message already deleted.",
        });
        return;
      }

      const targetIsFromSupport = targetMessage.isFromSupport === true;
      const targetSource = String(targetMessage.source || "").trim().toLowerCase() || (
        targetIsFromSupport ? "support" : "user"
      );
      const nextDeletedAt = new Date().toISOString();
      const nextMessages = (Array.isArray(targetThread.messages) ? targetThread.messages : [])
        .map((message, index) => {
          const currentMessageId = String(message?.id || "").trim();
          if (currentMessageId === messageId) {
            return normalizeChatMessage(
              {
                ...message,
                id: targetMessage.id,
                text: "",
                imageUrl: "",
                imageName: "",
                isFromSupport: targetIsFromSupport,
                source: targetSource,
                timestamp: targetMessage.timestamp,
                editedAt: null,
                deletedAt: nextDeletedAt,
                replyTo: null,
              },
              index,
            );
          }

          const replyTo = normalizeChatReplyReference(message?.replyTo);
          if (replyTo?.messageId === messageId) {
            return normalizeChatMessage(
              {
                ...message,
                replyTo: null,
              },
              index,
            );
          }

          return normalizeChatMessage(message, index);
        })
        .filter(Boolean);

      const updatedThread = normalizeIncomingChatThread(
        {
          ...targetThread,
          messages: nextMessages,
          updatedAt: nextDeletedAt,
          supportReadAt: targetThread.supportReadAt,
          lastReadAt: targetThread.lastReadAt,
        },
        null,
      );

      const updatedThreadWithTyping = {
        ...updatedThread,
        typing: updateChatTypingState(
          updatedThread.typing,
          targetIsFromSupport ? "employee" : "user",
          {
            isTyping: false,
          },
        ),
      };

      threads[threadIndex] = updatedThreadWithTyping;
      const sortedThreads = sortChatThreadsByUpdatedAt(mergeChatThreadsByCustomer(threads));
      await writeNormalizedChatThreadsForAdmin(requestAdminId, sortedThreads);
      sendJson(response, 200, {
        thread: updatedThreadWithTyping,
        message: "Message deleted.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : "Unable to delete message.",
      });
    }
    return;
  }

  if (request.method === "POST" && action === "ai-reply") {
    try {
      const threads = await readNormalizedChatThreads(requestAdminId);
      const threadIndex = findChatThreadIndex(threads, normalizedThreadId);

      if (threadIndex < 0) {
        sendJson(response, 404, { message: "Chat thread not found." });
        return;
      }

      const targetThread = threads[threadIndex];
      const aiReplyText = await requestChatAiReply(targetThread);
      const aiReplyMessage = normalizeChatMessage({
        id: createChatMessageId(true),
        text: aiReplyText,
        isFromSupport: true,
        source: "ai",
        timestamp: new Date().toISOString(),
      });

      const updatedThread = normalizeIncomingChatThread(
        {
          ...targetThread,
          messages: [...targetThread.messages, aiReplyMessage],
          updatedAt: aiReplyMessage.timestamp,
        },
        targetThread,
      );

      threads[threadIndex] = updatedThread;
      const sortedThreads = sortChatThreadsByUpdatedAt(mergeChatThreadsByCustomer(threads));
      await writeNormalizedChatThreadsForAdmin(requestAdminId, sortedThreads);
      sendJson(response, 200, {
        thread: updatedThread,
        message: "AI reply sent.",
      });
    } catch (error) {
      sendJson(response, 503, {
        message: error instanceof Error ? error.message : "Unable to get AI reply.",
      });
    }
    return;
  }

  if (request.method === "POST" && action === "read-support") {
    try {
      const threads = await readNormalizedChatThreads(requestAdminId);
      const threadIndex = findChatThreadIndex(threads, normalizedThreadId);

      if (threadIndex < 0) {
        sendJson(response, 404, { message: "Chat thread not found." });
        return;
      }

      const targetThread = threads[threadIndex];
      const latestSeenTimestamp = targetThread.messages.length
        ? normalizeChatTimestamp(targetThread.messages[targetThread.messages.length - 1].timestamp)
        : normalizeChatTimestamp(targetThread.updatedAt);
      const currentSupportReadAt = normalizeOptionalChatTimestamp(targetThread.supportReadAt);
      const effectiveSupportReadAt =
        currentSupportReadAt && currentSupportReadAt.getTime() > latestSeenTimestamp.getTime()
          ? currentSupportReadAt
          : latestSeenTimestamp;

      const updatedThread = normalizeIncomingChatThread(
        {
          ...targetThread,
          supportReadAt: effectiveSupportReadAt.toISOString(),
        },
        targetThread,
      );

      threads[threadIndex] = updatedThread;
      const sortedThreads = sortChatThreadsByUpdatedAt(mergeChatThreadsByCustomer(threads));
      await writeNormalizedChatThreadsForAdmin(requestAdminId, sortedThreads);
      sendJson(response, 200, {
        thread: updatedThread,
        message: "Chat thread marked as seen by support.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message:
          error instanceof Error
            ? error.message
            : "Unable to mark chat thread as seen by support.",
      });
    }
    return;
  }

  sendJson(response, 405, { message: "Method not allowed." });
}

async function handleProductsApi(request, response) {
  const requestUrl = new URL(request.url, `http://127.0.0.1:${PORT}`);
  const requestAdminId = getExplicitRequestAdminId(request, requestUrl);
  const requestIsAdminScoped = hasRequestAdminScope(request, requestUrl);

  if (request.method === "GET") {
    const requestedApprovalStatus = normalizeProductApprovalStatus(
      requestUrl.searchParams.get("approvalStatus"),
      "",
    );
    const hasApprovalStatusFilter = requestUrl.searchParams.has("approvalStatus");
    const allowPublicApprovedCatalog =
      !requestIsAdminScoped &&
      hasApprovalStatusFilter &&
      requestedApprovalStatus === PRODUCT_APPROVAL_APPROVED;
    if (requestIsAdminScoped && !isUsableProductAdminScope(requestAdminId)) {
      sendProductAdminScopeRequired(response);
      return;
    }

    if (!requestIsAdminScoped && !allowPublicApprovedCatalog) {
      sendProductAdminScopeRequired(response);
      return;
    }

    const [allProducts, accounts, allOrders] = await Promise.all([
      readProducts(),
      readAccounts(),
      readOrders(),
    ]);
    const reviewAggregates = buildProductReviewAggregates(
      allOrders,
      requestIsAdminScoped ? requestAdminId : null,
    );
    let products = (requestIsAdminScoped
      ? filterRecordsByAdminId(allProducts, requestAdminId)
      : allProducts
    ).map(normalizeStoredProductRecord).map((product) =>
      applyProductReviewAggregate(product, reviewAggregates),
    );
    if (hasApprovalStatusFilter) {
      products = products.filter((product) =>
        normalizeProductApprovalStatus(product?.approvalStatus) === requestedApprovalStatus
      );
    }
    sendJson(response, 200, {
      products: attachProductsCompanyMetadata(products, accounts),
    });
    return;
  }

  if (request.method === "POST") {
    try {
      if (!isUsableProductAdminScope(requestAdminId)) {
        sendProductAdminScopeRequired(response);
        return;
      }

      const payload = await parseRequestBody(request);
      const submittedAt = new Date().toISOString();
      let product = applyAdminId(normalizeProduct({
        ...payload,
        adminId: requestAdminId,
        approvalStatus: PRODUCT_APPROVAL_PENDING,
        submittedAt,
        approvedAt: "",
        approvedBy: "",
        approvalUpdatedAt: submittedAt,
      }), requestAdminId);
      product = await validateProductPartnerSelections(product);
      const products = await readProducts();

      // Check for duplicate barcode
      const barcodeValue = String(product.barcode ?? "").trim();
      if (barcodeValue) {
        const duplicateBarcode = products.find((p) =>
          isRecordInAdminScope(p, requestAdminId) &&
          String(p.barcode ?? "").trim() === barcodeValue
        );
        if (duplicateBarcode) {
          throw new Error("Barcode already exists. Please use a different barcode.");
        }
      }

      product = await syncProductVisualSearchFingerprint(product);
      products.unshift(product);
      await writeProducts(products);
      await logActivitySafely(createProductActivityEntry("created", product, payload?.__activityActor));
      const companyMetadataByAdminId = getProductCompanyMetadataByAdminId(await readAccounts());
      sendJson(response, 201, {
        product: attachProductCompanyMetadata(
          normalizeStoredProductRecord(product),
          companyMetadataByAdminId,
        ),
        message: "Product submitted for super admin review.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : "Unable to save product.",
      });
    }
    return;
  }

  sendJson(response, 405, { message: "Method not allowed." });
}

// Super admin: get products by company (adminId)
async function handleSuperAdminProductsApi(request, response, adminId) {
  if (request.method !== "GET") {
    sendJson(response, 405, { message: "Method not allowed." });
    return;
  }

  try {
    const [allProducts, accounts, allOrders] = await Promise.all([
      readProducts(),
      readAccounts(),
      readOrders(),
    ]);

    // Filter products by adminId (company)
    const companyProducts = filterRecordsByAdminId(allProducts, adminId).map(normalizeStoredProductRecord);

    // Get company info
    const companyAccount = accounts.find((acc) => acc.id === adminId);
    const companyName = companyAccount?.companyName || companyAccount?.businessName || "Unknown Company";

    const reviewAggregates = buildProductReviewAggregates(allOrders, adminId);
    const productsWithReviews = companyProducts.map((product) =>
      applyProductReviewAggregate(product, reviewAggregates),
    );

    sendJson(response, 200, {
      products: attachProductsCompanyMetadata(productsWithReviews, accounts),
      companyName,
      companyId: adminId,
    });
  } catch (error) {
    sendJson(response, 500, { message: "Unable to fetch company products." });
  }
}

async function handleProductVisualSearchApi(request, response) {
  const requestUrl = new URL(request.url, `http://127.0.0.1:${PORT}`);
  const requestAdminId = getRequestAdminId(request, requestUrl);

  if (request.method !== "POST") {
    sendJson(response, 405, { message: "Method not allowed." });
    return;
  }

  if (!sharp) {
    sendJson(response, 503, {
      message:
        'Visual product search is unavailable because the "sharp" package is not installed.',
    });
    return;
  }

  try {
    const contentType = String(request.headers["content-type"] ?? "").toLowerCase();
    const sourceFilename = String(request.headers["x-file-name"] ?? "camera.jpg");
    const extension = getUploadExtension(sourceFilename, contentType);
    const isImageUpload = isImageUploadType(contentType, extension);

    if (!isImageUpload) {
      throw new Error("Please send a valid product photo.");
    }

    const fileBuffer = await parseBinaryRequestBody(request);
    if (fileBuffer.length === 0) {
      throw new Error("Product photo is empty.");
    }

    const searchFingerprints = await createVisualSearchQueryFingerprints(fileBuffer);
    const allStoredProducts = await readProducts();
    const storedProducts = filterRecordsByAdminId(allStoredProducts, requestAdminId);
    const matches = [];
    let didUpdateStoredFingerprints = false;

    for (let index = 0; index < storedProducts.length; index += 1) {
      let product = normalizeStoredProductRecord(storedProducts[index]);
      const visualSearchImageUrls = normalizeProductVisualSearchImageUrls(product);
      if (
        !String(product?.name ?? "").trim() ||
        !isProductApprovedForApp(product) ||
        !normalizeProductActiveState(product?.isActive, true) ||
        normalizeOptionalWholeNumber(product?.stock, 0) <= 0 ||
        !visualSearchImageUrls.length
      ) {
        continue;
      }

      let fingerprintEntries = getStoredVisualSearchFingerprintEntries(product);
      if (fingerprintEntries.length < visualSearchImageUrls.length) {
        const nextFingerprintMetas = [...(product.visualSearchFingerprints ?? [])];

        for (const imageUrl of visualSearchImageUrls) {
          const hasFingerprint = fingerprintEntries.some(
            (entry) =>
              String(entry.imageUrl ?? "").trim().toLowerCase() ===
              String(imageUrl ?? "").trim().toLowerCase(),
          );
          if (hasFingerprint) {
            continue;
          }

          const fingerprintMeta = await createProductVisualSearchFingerprintMeta(
            product,
            imageUrl,
          );
          if (fingerprintMeta) {
            nextFingerprintMetas.push(fingerprintMeta);
          }
        }

        product = {
          ...product,
          visualSearchFingerprints: normalizeVisualSearchFingerprintMetaList(
            nextFingerprintMetas,
            visualSearchImageUrls,
          ),
        };
        product.visualSearchFingerprint = product.visualSearchFingerprints[0] ?? null;
        fingerprintEntries = getStoredVisualSearchFingerprintEntries(product);
      }

      if (!fingerprintEntries.length) {
        const fingerprintMeta = await createProductVisualSearchFingerprintMeta(
          product,
          visualSearchImageUrls[0],
        );
        if (!fingerprintMeta) {
          continue;
        }

        product = {
          ...product,
          visualSearchFingerprint: fingerprintMeta,
          visualSearchFingerprints: [fingerprintMeta],
        };
        fingerprintEntries = getStoredVisualSearchFingerprintEntries(product);
      }

      if (!fingerprintEntries.length) {
        continue;
      }

      let bestScore = 0;
      let matchedImageUrl = "";
      for (const entry of fingerprintEntries) {
        for (const searchFingerprint of searchFingerprints) {
          const score = compareVisualSearchFingerprints(
            searchFingerprint,
            entry.fingerprint,
          );
          if (score > bestScore) {
            bestScore = score;
            matchedImageUrl = String(entry.imageUrl ?? "").trim();
          }
        }
      }

      if (JSON.stringify(storedProducts[index]?.visualSearchFingerprints ?? []) !==
        JSON.stringify(product.visualSearchFingerprints ?? [])) {
        storedProducts[index] = {
          ...storedProducts[index],
          visualSearchImageUrl: product.visualSearchImageUrl,
          visualSearchImageUrls: product.visualSearchImageUrls,
          visualSearchImageAngles: product.visualSearchImageAngles,
          visualSearchFingerprint: product.visualSearchFingerprint,
          visualSearchFingerprints: product.visualSearchFingerprints,
        };
        didUpdateStoredFingerprints = true;
      }

      if (bestScore >= VISUAL_SEARCH_MIN_SCORE) {
        matches.push({
          ...product,
          visualSearchScore: Number(bestScore.toFixed(4)),
          visualSearchMatchedImageUrl: matchedImageUrl,
        });
      }
    }

    if (didUpdateStoredFingerprints) {
      const updatedProductsById = new Map(
        storedProducts.map((product) => [String(product?.id ?? "").trim(), product]),
      );
      await writeProducts(
        allStoredProducts.map((product) =>
          updatedProductsById.get(String(product?.id ?? "").trim()) ?? product,
        ),
      );
    }

    matches.sort(
      (first, second) =>
        Number(second.visualSearchScore ?? 0) - Number(first.visualSearchScore ?? 0),
    );

    sendJson(response, 200, {
      products: attachProductsCompanyMetadata(
        matches.slice(0, VISUAL_SEARCH_MAX_RESULTS),
        matches.length ? await readAccounts() : [],
      ),
      total: matches.length,
      message: matches.length
        ? "Visual matches found."
        : "No visual match found.",
    });
  } catch (error) {
    const statusCode =
      Number.isInteger(error?.statusCode) && error.statusCode >= 400
        ? error.statusCode
        : 400;
    sendJson(response, statusCode, {
      message:
        error instanceof Error
          ? error.message
          : "Unable to search products by photo.",
    });
  }
}

async function handleDeliveryPartnersApi(request, response) {
  const requestUrl = new URL(request.url, `http://127.0.0.1:${PORT}`);
  const requestAdminId = getRequestAdminId(request, requestUrl);
  const requestIsSuperAdmin = isSuperAdminAuthorized(request);
  const requestShouldUseAdminScope = !requestIsSuperAdmin;

  if (request.method === "GET") {
    try {
      const storedPartners = await readDeliveryPartners();
      const partners = requestShouldUseAdminScope
        ? filterRecordsByAdminId(storedPartners, requestAdminId)
        : storedPartners;
      sendJson(response, 200, { partners });
    } catch (error) {
      sendJson(response, 500, {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load delivery partners.",
      });
    }
    return;
  }

  if (request.method === "POST") {
    try {
      const payload = await parseRequestBody(request);
      const partner = requestIsSuperAdmin
        ? normalizeDeliveryPartnerRecord(payload)
        : applyAdminId(normalizeDeliveryPartnerRecord(payload), requestAdminId);
      const partners = await readDeliveryPartners();
      partners.unshift(partner);
      await writeDeliveryPartners(partners);
      sendJson(response, 201, {
        partner,
        message: "Delivery partner saved.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message:
          error instanceof Error
            ? error.message
            : "Unable to save delivery partner.",
      });
    }
    return;
  }

  sendJson(response, 405, { message: "Method not allowed." });
}

function normalizeEmployeeLoginId(value) {
  return String(value ?? "").trim().toUpperCase();
}

function normalizeEmployeeLoginIdNumber(value) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 6);
}

function parseEmployeeLoginId(value) {
  const normalized = normalizeEmployeeLoginId(value).replace(/\s+/g, "");
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

  const number = normalizeEmployeeLoginIdNumber(normalized);
  return {
    acronym: "",
    number: number ? number.padStart(6, "0") : "",
    hasAcronym: false,
  };
}

function isEmployeeLoginIdentifierMatch(inputValue, accountValue) {
  const inputId = parseEmployeeLoginId(inputValue);
  const accountId = parseEmployeeLoginId(accountValue);
  if (!inputId.number || !accountId.number) {
    return false;
  }

  if (inputId.hasAcronym) {
    return inputId.acronym === accountId.acronym && inputId.number === accountId.number;
  }

  return inputId.number === accountId.number;
}

function getEmployeeLoginAccountMatches(accounts, employeeId) {
  const normalizedEmployeeId = normalizeEmployeeLoginId(employeeId);
  const employeeAccounts = accounts.filter(
    (candidate) => String(candidate.role ?? "").trim().toLowerCase() === "employee",
  );

  const exactMatches = employeeAccounts.filter((candidate) =>
    normalizeEmployeeLoginId(candidate.employeeId) === normalizedEmployeeId
  );
  const exactMatchSet = new Set(exactMatches);
  const flexibleMatches = employeeAccounts.filter((candidate) =>
    !exactMatchSet.has(candidate) &&
    isEmployeeLoginIdentifierMatch(normalizedEmployeeId, candidate.employeeId)
  );

  return [...exactMatches, ...flexibleMatches];
}

function findEmployeeLoginAccount(accounts, employeeId) {
  return getEmployeeLoginAccountMatches(accounts, employeeId)[0] || null;
}

function findEmployeeLoginAccountWithPassword(accounts, employeeId, password) {
  const normalizedPassword = String(password ?? "").trim();
  return getEmployeeLoginAccountMatches(accounts, employeeId).find((candidate) =>
    String(candidate.password ?? "") === normalizedPassword
  ) || null;
}

function setAdminAccountPresence(account, isOnline) {
  if (!account || typeof account !== "object") {
    return account;
  }

  const now = new Date().toISOString();
  account.isOnline = isOnline === true;
  account.onlineStatus = isOnline === true ? "online" : "offline";
  account.presenceStatus = account.onlineStatus;
  account.presenceUpdatedAt = now;

  if (isOnline === true) {
    account.lastLoginAt = now;
  } else {
    account.lastLogoutAt = now;
  }

  return account;
}

function getAdminPresenceMatchValues(source) {
  return [
    source?.adminId,
    source?.id,
    source?.accountCode,
    source?.email,
  ]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .filter(Boolean);
}

function findAdminPresenceAccount(accounts, source) {
  const matchValues = new Set(getAdminPresenceMatchValues(source));
  if (!matchValues.size) {
    return null;
  }

  return accounts.find((candidate) => {
    if (!isAdminAccount(candidate)) {
      return false;
    }

    return getAdminPresenceMatchValues({
      ...candidate,
      adminId: getRecordAdminId(candidate, candidate?.adminId || candidate?.id),
    }).some((value) => matchValues.has(value));
  }) || null;
}

async function handleAdminLoginApi(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { message: "Method not allowed." });
    return;
  }

  try {
    const payload = await parseRequestBody(request);
    const email = String(payload.email ?? "").trim().toLowerCase();
    const password = String(payload.password ?? "").trim();

    if (!email || !password) {
      sendJson(response, 400, {
        message: "Please enter both the admin email and password.",
      });
      return;
    }

    const accounts = await readAccounts();
    const account = accounts.find((candidate) =>
      isAdminAccount(candidate) &&
      String(candidate.email ?? "").trim().toLowerCase() === email
    );

    if (!account || String(account.password ?? "") !== password) {
      sendJson(response, 401, {
        message: "Admin email or password is incorrect.",
      });
      return;
    }

    const restrictionMessage = getAdminAccountRestrictionMessage(account);
    if (restrictionMessage) {
      sendJson(response, 403, {
        message: restrictionMessage,
      });
      return;
    }

    setAdminAccountPresence(account, true);
    await writeAccounts(accounts);

    sendJson(response, 200, {
      admin: serializeAdminAccount(account),
      redirectPath: "/admin_dashboard.html",
      message: "Admin login verified.",
    });
  } catch (error) {
    sendJson(response, 400, {
      message:
        error instanceof Error
          ? error.message
          : "Unable to verify admin login.",
    });
  }
}

async function handleAdminPresenceApi(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { message: "Method not allowed." });
    return;
  }

  try {
    const payload = await parseRequestBody(request);
    const accounts = await readAccounts();
    const account = findAdminPresenceAccount(accounts, payload);
    if (!account) {
      sendJson(response, 404, { message: "Admin account not found." });
      return;
    }

    setAdminAccountPresence(account, payload?.isOnline === true);
    await writeAccounts(accounts);

    sendJson(response, 200, {
      admin: serializeAdminAccount(account),
      message: account.isOnline ? "Admin is online." : "Admin is offline.",
    });
  } catch (error) {
    sendJson(response, 400, {
      message:
        error instanceof Error
          ? error.message
          : "Unable to update admin presence.",
    });
  }
}

async function handleAppUserLoginApi(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { message: "Method not allowed." });
    return;
  }

  try {
    const payload = await parseRequestBody(request);
    const email = String(payload.email ?? "").trim().toLowerCase();
    const password = String(payload.password ?? "").trim();

    if (!email || !password) {
      sendJson(response, 400, {
        message: "Please enter both email and password.",
      });
      return;
    }

    const accounts = await readAccounts();
    const account = accounts.find((candidate) =>
      !isAdminAccount(candidate) &&
      String(candidate.email ?? "").trim().toLowerCase() === email
    );

    if (!account) {
      sendJson(response, 404, {
        message: "Incorrect Email",
      });
      return;
    }

    if (String(account.password ?? "") !== password) {
      sendJson(response, 401, {
        message: "Incorrect Password",
      });
      return;
    }

    sendJson(response, 200, {
      account: serializeAccountForList(account),
      message: "Login successful.",
    });
  } catch (error) {
    sendJson(response, 400, {
      message:
        error instanceof Error
          ? error.message
          : "Unable to verify login.",
    });
  }
}

function findAdminAccountIndexForRequest(accounts, adminId) {
  const normalizedAdminId = normalizeAdminTenantId(adminId, "");
  if (!normalizedAdminId) {
    return -1;
  }

  return accounts.findIndex((account) =>
    isAdminAccount(account) && isRecordInAdminScope(account, normalizedAdminId),
  );
}

async function handleAdminAccountApi(request, response) {
  const requestUrl = new URL(request.url, `http://127.0.0.1:${PORT}`);
  const requestAdminId = normalizeAdminTenantId(
    request.headers["x-gms-admin-id"] ??
      request.headers["x-admin-id"] ??
      requestUrl.searchParams.get("adminId") ??
      requestUrl.searchParams.get("tenantId") ??
      requestUrl.searchParams.get("workspaceId"),
    "",
  );

  if (!requestAdminId) {
    sendJson(response, 401, { message: "Admin session was not found." });
    return;
  }

  if (request.method === "GET") {
    try {
      const accounts = await readAccounts();
      const accountIndex = findAdminAccountIndexForRequest(accounts, requestAdminId);
      if (accountIndex < 0) {
        sendJson(response, 404, { message: "Admin account was not found." });
        return;
      }

      sendJson(response, 200, {
        admin: serializeAdminAccount(accounts[accountIndex]),
      });
    } catch (error) {
      sendJson(response, 500, {
        message: error instanceof Error ? error.message : "Unable to load admin account.",
      });
    }
    return;
  }

  if (request.method === "PUT") {
    try {
      const payload = await parseRequestBody(request);
      const accounts = await readAccounts();
      const accountIndex = findAdminAccountIndexForRequest(accounts, requestAdminId);
      if (accountIndex < 0) {
        throw new Error("Admin account was not found.");
      }

      const existingAccount = accounts[accountIndex];
      const storeName = String(
        payload.companyName ??
          payload.storeName ??
          existingAccount.companyName ??
          existingAccount.storeName ??
          "",
      ).replace(/\s+/g, " ").trim();
      const firstName = String(payload.firstName ?? existingAccount.firstName ?? "").trim();
      const lastName = String(payload.lastName ?? existingAccount.lastName ?? "").trim();
      const email = String(payload.email ?? existingAccount.email ?? "").trim().toLowerCase();
      const countryCode = String(payload.countryCode ?? existingAccount.countryCode ?? "+63").trim() || "+63";
      const mobileNumber = String(payload.mobileNumber ?? existingAccount.mobileNumber ?? "")
        .replace(/\D/g, "")
        .trim();
      const submittedPassword = String(payload.password ?? "").trim();
      const profileImageUrl = Object.prototype.hasOwnProperty.call(payload, "profileImageUrl")
        ? String(payload.profileImageUrl ?? "").trim()
        : String(existingAccount.profileImageUrl ?? "").trim();

      if (storeName.length < 2) {
        throw new Error("Company name must be at least 2 characters long.");
      }

      if (firstName.length < 2 || lastName.length < 2) {
        throw new Error("First name and last name must be at least 2 characters long.");
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Please enter a valid admin email address.");
      }

      if (countryCode !== "+63") {
        throw new Error("Contact number must use the +63 country code.");
      }

      if (!/^9\d{9}$/.test(mobileNumber)) {
        throw new Error("Contact number must be a valid Philippine mobile number.");
      }

      if (submittedPassword && submittedPassword.length < 6) {
        throw new Error("New password must be at least 6 characters long.");
      }

      const emailTaken = accounts.some((account, index) =>
        index !== accountIndex &&
        isAdminAccount(account) &&
        String(account.email ?? "").trim().toLowerCase() === email,
      );
      if (emailTaken) {
        throw new Error("Admin email is already registered.");
      }

      const mobileTaken = accounts.some((account, index) =>
        index !== accountIndex &&
        isAdminAccount(account) &&
        normalizeAccountPhoneForComparison(account.mobileNumber) ===
          normalizeAccountPhoneForComparison(mobileNumber),
      );
      if (mobileTaken) {
        throw new Error("Contact number is already registered.");
      }

      const normalizedAdmin = normalizeAdminAccountRecord({
        ...existingAccount,
        storeName,
        companyName: storeName,
        businessName: storeName,
        firstName,
        lastName,
        email,
        countryCode,
        mobileNumber,
        password: submittedPassword || existingAccount.password,
        adminId: getRecordAdminId(existingAccount, requestAdminId),
        profileImageUrl,
        createdAt: existingAccount.createdAt,
      }, existingAccount);

      accounts[accountIndex] = normalizedAdmin;
      await writeAccounts(accounts);
      sendJson(response, 200, {
        admin: serializeAdminAccount(normalizedAdmin),
        message: "Admin account updated.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : "Unable to update admin account.",
      });
    }
    return;
  }

  sendJson(response, 405, { message: "Method not allowed." });
}

async function handleSuperAdminLoginApi(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { message: "Method not allowed." });
    return;
  }

  try {
    const payload = await parseRequestBody(request);
    const username = String(payload.username ?? payload.email ?? "").trim();
    const password = String(payload.password ?? "").trim();

    if (username !== SUPER_ADMIN_USERNAME || password !== SUPER_ADMIN_PASSWORD) {
      sendJson(response, 401, {
        message: "Root username or password is incorrect.",
      });
      return;
    }

    sendJson(response, 200, {
      root: {
        username: SUPER_ADMIN_USERNAME,
        role: "super-admin",
      },
      token: SUPER_ADMIN_SESSION_TOKEN,
      redirectPath: "/super_admin.html",
      message: "Root login verified.",
    });
  } catch (error) {
    sendJson(response, 400, {
      message:
        error instanceof Error
          ? error.message
          : "Unable to verify root login.",
    });
  }
}

async function createAdminAccountFromPayload(payload) {
  const accounts = await readAccounts();
  const normalizedAdmin = normalizeAdminAccountRecord(payload);
  const emailTaken = accounts.some((account) =>
    isAdminAccount(account) &&
    String(account.email ?? "").trim().toLowerCase() === normalizedAdmin.email
  );

  if (emailTaken) {
    throw new Error("Admin email is already registered.");
  }

  const mobileTaken = accounts.some((account) =>
    isAdminAccount(account) &&
    normalizeAccountPhoneForComparison(account.mobileNumber) ===
      normalizeAccountPhoneForComparison(normalizedAdmin.mobileNumber),
  );

  if (mobileTaken) {
    throw new Error("Contact number is already registered.");
  }

  accounts.unshift(normalizedAdmin);
  await writeAccounts(accounts);
  return {
    admin: normalizedAdmin,
    accounts,
  };
}

async function handleAdminRegisterApi(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { message: "Method not allowed." });
    return;
  }

  try {
    const payload = await parseRequestBody(request);
    const { admin } = await createAdminAccountFromPayload(payload);
    sendJson(response, 201, {
      admin: serializeAdminAccount(admin),
      redirectPath: "/login.html?role=admin",
      message: "Admin account created.",
    });
  } catch (error) {
    sendJson(response, 400, {
      message:
        error instanceof Error
          ? error.message
          : "Unable to create admin account.",
    });
  }
}

function getAdminWorkspaceCounts(adminId, sources) {
  const normalizedAdminId = normalizeAdminTenantId(adminId, DEFAULT_ADMIN_ID);
  const adminProducts = filterRecordsByAdminId(sources.products, normalizedAdminId);
  const reviewSummary = summarizeProductReviewAggregatesForProducts(
    adminProducts,
    buildProductReviewAggregates(sources.orders, normalizedAdminId),
  );
  return {
    products: adminProducts.length,
    employees: filterRecordsByAdminId(sources.accounts, normalizedAdminId).filter(
      (account) => String(account.role ?? "").trim().toLowerCase() === "employee",
    ).length,
    appUsers: filterRecordsByAdminId(sources.accounts, normalizedAdminId).filter(
      (account) => String(account.role ?? "").trim().toLowerCase() === "user",
    ).length,
    orders: filterRecordsByAdminId(sources.orders, normalizedAdminId).length,
    chatThreads: filterRecordsByAdminId(sources.chatThreads, normalizedAdminId).length,
    deliveryPartners: filterRecordsByAdminId(sources.deliveryPartners, normalizedAdminId).length,
    paymentPartners: filterRecordsByAdminId(sources.paymentPartners, normalizedAdminId).length,
    categories: getAdminCategoryList(sources.categories, sources.products, normalizedAdminId).length,
    rating: reviewSummary.rating,
    ratingCount: reviewSummary.ratingCount,
    ratingsCount: reviewSummary.ratingsCount,
    ratingPoints: reviewSummary.ratingPoints,
    commentCount: reviewSummary.commentCount,
    reviewCount: reviewSummary.reviewCount,
  };
}

async function readAdminWorkspaceSources() {
  const [
    accounts,
    products,
    orders,
    chatThreads,
    deliveryPartners,
    paymentPartners,
    categories,
  ] = await Promise.all([
    readAccounts(),
    readProducts(),
    readOrders(),
    readChatThreads(),
    readDeliveryPartners(),
    readPaymentPartners(),
    readCategories(),
  ]);

  return {
    accounts,
    products,
    orders,
    chatThreads,
    deliveryPartners,
    paymentPartners,
    categories,
  };
}

async function handleSuperAdminAdminsApi(request, response) {
  if (!requireSuperAdmin(request, response)) {
    return;
  }

  if (request.method === "GET") {
    try {
      const sources = await readAdminWorkspaceSources();
      const admins = sources.accounts
        .filter(isAdminAccount)
        .map((admin) =>
          serializeAdminAccount(
            admin,
            getAdminWorkspaceCounts(getRecordAdminId(admin, admin.id), sources),
          ),
        )
        .sort((left, right) =>
          String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? "")),
        );

      sendJson(response, 200, {
        admins,
        total: admins.length,
      });
    } catch (error) {
      sendJson(response, 500, {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load admin accounts.",
      });
    }
    return;
  }

  if (request.method === "POST") {
    try {
      const payload = await parseRequestBody(request);
      const { admin: normalizedAdmin, accounts } = await createAdminAccountFromPayload(payload);
      sendJson(response, 201, {
        admin: serializeAdminAccount(
          normalizedAdmin,
          getAdminWorkspaceCounts(normalizedAdmin.adminId, {
            accounts,
            products: [],
            orders: [],
            chatThreads: [],
            deliveryPartners: [],
            paymentPartners: [],
            categories: [],
          }),
        ),
        message: "Admin account created.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message:
          error instanceof Error
            ? error.message
            : "Unable to create admin account.",
      });
    }
    return;
  }

  sendJson(response, 405, { message: "Method not allowed." });
}

async function handleSuperAdminAdminActionApi(request, response, adminId) {
  if (!requireSuperAdmin(request, response)) {
    return;
  }

  if (request.method !== "PATCH" && request.method !== "POST") {
    sendJson(response, 405, { message: "Method not allowed." });
    return;
  }

  const normalizedAdminId = normalizeAdminTenantId(adminId, "");
  if (!normalizedAdminId) {
    sendJson(response, 400, { message: "Admin ID is required." });
    return;
  }

  try {
    const payload = await parseRequestBody(request);
    const action = String(payload?.action ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");
    const normalizedAction = action === "banned" ? "ban" : action;
    const allowedActions = new Set(["notify", "deactivate", "ban"]);

    if (!allowedActions.has(normalizedAction)) {
      sendJson(response, 400, { message: "Unsupported admin action." });
      return;
    }

    const sources = await readAdminWorkspaceSources();
    const accountIndex = sources.accounts.findIndex((account) =>
      isAdminAccount(account) && getRecordAdminId(account, account.id) === normalizedAdminId
    );

    if (accountIndex === -1) {
      sendJson(response, 404, { message: "Admin account not found." });
      return;
    }

    const now = new Date().toISOString();
    const previousAccount = sources.accounts[accountIndex];
    const updatedAccount = {
      ...previousAccount,
      updatedAt: now,
      superAdminActionUpdatedAt: now,
      superAdminActionUpdatedBy: SUPER_ADMIN_USERNAME,
    };
    let message = "Admin action applied.";

    if (normalizedAction === "notify") {
      updatedAccount.lastSuperAdminNotifiedAt = now;
      updatedAccount.superAdminNotificationCount =
        Math.max(0, Number(updatedAccount.superAdminNotificationCount) || 0) + 1;
      message = "Company notified.";
    } else if (normalizedAction === "deactivate") {
      Object.assign(updatedAccount, {
        status: "deactivated",
        accountStatus: "deactivated",
        accountState: "deactivated",
        isActive: false,
        disabled: true,
        isOnline: false,
        online: false,
        loggedIn: false,
        isLoggedIn: false,
        sessionActive: false,
        presenceStatus: "offline",
        deactivatedAt: now,
        deactivatedBy: SUPER_ADMIN_USERNAME,
      });
      message = "Company deactivated.";
    } else if (normalizedAction === "ban") {
      Object.assign(updatedAccount, {
        status: "banned",
        accountStatus: "banned",
        accountState: "banned",
        isActive: false,
        disabled: true,
        isBanned: true,
        isOnline: false,
        online: false,
        loggedIn: false,
        isLoggedIn: false,
        sessionActive: false,
        presenceStatus: "offline",
        bannedAt: now,
        bannedBy: SUPER_ADMIN_USERNAME,
      });
      message = "Company banned.";
    }

    sources.accounts[accountIndex] = updatedAccount;
    await writeAccounts(sources.accounts);

    sendJson(response, 200, {
      admin: serializeAdminAccount(
        updatedAccount,
        getAdminWorkspaceCounts(normalizedAdminId, sources),
      ),
      action: normalizedAction,
      message,
    });
  } catch (error) {
    sendJson(response, 500, {
      message:
        error instanceof Error
          ? error.message
          : "Unable to update admin account.",
    });
  }
}

async function handleSuperAdminProductRequestsApi(request, response) {
  if (!requireSuperAdmin(request, response)) {
    return;
  }

  if (request.method !== "GET") {
    sendJson(response, 405, { message: "Method not allowed." });
    return;
  }

  try {
    const [products, accounts] = await Promise.all([
      readProducts(),
      readAccounts(),
    ]);
    const pendingProducts = attachProductsCompanyMetadata(
      products
        .map(normalizeStoredProductRecord)
        .filter(isProductPendingApproval)
        .sort((left, right) =>
          String(right.submittedAt ?? right.createdAt ?? "").localeCompare(
            String(left.submittedAt ?? left.createdAt ?? ""),
          ),
        ),
      accounts,
    );

    sendJson(response, 200, {
      products: pendingProducts,
      total: pendingProducts.length,
    });
  } catch (error) {
    sendJson(response, 500, {
      message:
        error instanceof Error
          ? error.message
          : "Unable to load product requests.",
    });
  }
}

async function handleSuperAdminProductApproveApi(request, response, productId) {
  if (!requireSuperAdmin(request, response)) {
    return;
  }

  if (request.method !== "PATCH" && request.method !== "POST") {
    sendJson(response, 405, { message: "Method not allowed." });
    return;
  }

  const normalizedProductId = String(productId ?? "").trim();
  if (!normalizedProductId) {
    sendJson(response, 400, { message: "Product ID is required." });
    return;
  }

  try {
    const [products, accounts] = await Promise.all([
      readProducts(),
      readAccounts(),
    ]);
    const productIndex = products.findIndex((product) =>
      String(product?.id ?? "").trim() === normalizedProductId
    );

    if (productIndex === -1) {
      sendJson(response, 404, { message: "Product request not found." });
      return;
    }

    const previousProduct = products[productIndex];
    const now = new Date().toISOString();
    const approvedProduct = {
      ...previousProduct,
      approvalStatus: PRODUCT_APPROVAL_APPROVED,
      submittedAt: previousProduct.submittedAt || previousProduct.createdAt || now,
      approvedAt: now,
      approvedBy: SUPER_ADMIN_USERNAME,
      approvalUpdatedAt: now,
      updatedAt: now,
    };

    products[productIndex] = approvedProduct;
    await writeProducts(products);

    const companyMetadataByAdminId = getProductCompanyMetadataByAdminId(accounts);
    sendJson(response, 200, {
      product: attachProductCompanyMetadata(
        normalizeStoredProductRecord(approvedProduct),
        companyMetadataByAdminId,
      ),
      message: "Product request approved.",
    });
  } catch (error) {
    sendJson(response, 500, {
      message:
        error instanceof Error
          ? error.message
          : "Unable to approve product request.",
    });
  }
}

async function handleSuperAdminProductCancelApi(request, response, productId) {
  if (!requireSuperAdmin(request, response)) {
    return;
  }

  if (request.method !== "PATCH" && request.method !== "POST" && request.method !== "DELETE") {
    sendJson(response, 405, { message: "Method not allowed." });
    return;
  }

  const normalizedProductId = String(productId ?? "").trim();
  if (!normalizedProductId) {
    sendJson(response, 400, { message: "Product ID is required." });
    return;
  }

  try {
    const products = await readProducts();
    const productIndex = products.findIndex((product) =>
      String(product?.id ?? "").trim() === normalizedProductId
    );

    if (productIndex === -1) {
      sendJson(response, 404, { message: "Product request not found." });
      return;
    }

    const cancelledProduct = products[productIndex];
    if (!isProductPendingApproval(cancelledProduct)) {
      sendJson(response, 409, { message: "Only products in review can be cancelled." });
      return;
    }

    products.splice(productIndex, 1);
    await writeProducts(products);

    sendJson(response, 200, {
      product: normalizeStoredProductRecord(cancelledProduct),
      message: "Product request cancelled.",
    });
  } catch (error) {
    sendJson(response, 500, {
      message:
        error instanceof Error
          ? error.message
          : "Unable to cancel product request.",
    });
  }
}

async function handleSuperAdminClearAdminDataApi(request, response, adminId) {
  if (!requireSuperAdmin(request, response)) {
    return;
  }

  if (request.method !== "DELETE") {
    sendJson(response, 405, { message: "Method not allowed." });
    return;
  }

  const normalizedAdminId = normalizeAdminTenantId(adminId, "");
  if (!normalizedAdminId) {
    sendJson(response, 400, { message: "Admin ID is required." });
    return;
  }

  try {
    const sources = await readAdminWorkspaceSources();
    const targetAdmin = sources.accounts.find((account) =>
      isAdminAccount(account) && getRecordAdminId(account, account.id) === normalizedAdminId
    );
    if (!targetAdmin) {
      sendJson(response, 404, { message: "Admin account not found." });
      return;
    }

    const counts = getAdminWorkspaceCounts(normalizedAdminId, sources);
    await Promise.all([
      writeProducts(sources.products.filter((record) => !isRecordInAdminScope(record, normalizedAdminId))),
      writeOrders(sources.orders.filter((record) => !isRecordInAdminScope(record, normalizedAdminId))),
      writeChatThreads(sources.chatThreads.filter((record) => !isRecordInAdminScope(record, normalizedAdminId))),
      writeDeliveryPartners(sources.deliveryPartners.filter((record) => !isRecordInAdminScope(record, normalizedAdminId))),
      writePaymentPartners(sources.paymentPartners.filter((record) => !isRecordInAdminScope(record, normalizedAdminId))),
      writeActivityLog((await readActivityLog()).filter((record) => !isRecordInAdminScope(record, normalizedAdminId))),
      writeCategories(
        sources.categories.filter((record) => !isCategoryRecordInAdminScope(record, normalizedAdminId)),
      ),
      writeAccounts(
        sources.accounts.filter((record) =>
          isAdminAccount(record) || !isRecordInAdminScope(record, normalizedAdminId),
        ),
      ),
    ]);

    sendJson(response, 200, {
      adminId: normalizedAdminId,
      cleared: counts,
      message: "Admin workspace data cleared.",
    });
  } catch (error) {
    sendJson(response, 500, {
      message:
        error instanceof Error
          ? error.message
          : "Unable to clear admin workspace data.",
    });
  }
}

async function handleSuperAdminCategoriesApi(request, response, requestUrl) {
  if (!requireSuperAdmin(request, response)) {
    return;
  }

  if (request.method === "GET") {
    try {
      const [storedCategories, products] = await Promise.all([
        readCategories(),
        readProducts(),
      ]);
      sendJson(response, 200, {
        categories: getGlobalCategoryList(storedCategories, products),
      });
    } catch (error) {
      sendJson(response, 500, {
        message: error instanceof Error ? error.message : "Unable to load categories.",
      });
    }
    return;
  }

  if (request.method === "POST") {
    try {
      const payload = await parseRequestBody(request);
      const categoryName = normalizeCategoryName(payload.name ?? payload.category);

      if (categoryName.length < 2) {
        throw new Error("Category name must be at least 2 characters long.");
      }

      const [storedCategories, products] = await Promise.all([
        readCategories(),
        readProducts(),
      ]);
      const existingCategories = getGlobalCategoryList(storedCategories, products);
      const alreadyExists = existingCategories.some(
        (category) => category.toLowerCase() === categoryName.toLowerCase(),
      );

      if (alreadyExists) {
        throw new Error("Category already exists.");
      }

      const persistedCategories = [
        ...storedCategories,
        normalizeCategoryRecord({ name: categoryName }, DEFAULT_ADMIN_ID),
      ].filter(Boolean);

      await writeCategories(persistedCategories);
      sendJson(response, 201, {
        category: categoryName,
        categories: getGlobalCategoryList(persistedCategories, products),
        message: "Category added.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : "Unable to add category.",
      });
    }
    return;
  }

  if (request.method === "PUT") {
    try {
      const payload = await parseRequestBody(request);
      const previousCategoryName = normalizeCategoryName(
        payload.oldName ?? payload.currentName ?? payload.previousCategory,
      );
      const nextCategoryName = normalizeCategoryName(payload.name ?? payload.category);

      if (!previousCategoryName) {
        throw new Error("Current category name is required.");
      }

      if (nextCategoryName.length < 2) {
        throw new Error("Category name must be at least 2 characters long.");
      }

      const [storedCategories, products] = await Promise.all([
        readCategories(),
        readProducts(),
      ]);
      const allCategories = getGlobalCategoryList(storedCategories, products);
      const previousCategoryKey = previousCategoryName.toLowerCase();
      const nextCategoryKey = nextCategoryName.toLowerCase();

      const categoryExists = allCategories.some(
        (category) => category.toLowerCase() === previousCategoryKey,
      );

      if (!categoryExists) {
        throw new Error("Category not found.");
      }

      const alreadyExists = allCategories.some((category) => {
        const categoryKey = category.toLowerCase();
        return categoryKey === nextCategoryKey && categoryKey !== previousCategoryKey;
      });

      if (alreadyExists) {
        throw new Error("Category already exists.");
      }

      const nextStoredCategories = [
        ...storedCategories.filter(
          (category) => getCategoryRecordName(category).toLowerCase() !== previousCategoryKey,
        ),
        normalizeCategoryRecord({ name: nextCategoryName }, DEFAULT_ADMIN_ID),
      ].filter(Boolean);

      let updatedProducts = 0;
      const nextProducts = products.map((product) => {
        const productCategories = getProductCategoryList(product);
        if (
          !productCategories.some(
            (category) => category.toLowerCase() === previousCategoryKey,
          )
        ) {
          return product;
        }

        const nextProductCategories = normalizeProductCategoryValues(
          productCategories.map((category) =>
            category.toLowerCase() === previousCategoryKey
              ? nextCategoryName
              : category,
          ),
        );
        updatedProducts += 1;
        return {
          ...product,
          category: nextProductCategories[0] ?? nextCategoryName,
          categories: nextProductCategories,
          adminId: getRecordAdminId(product, DEFAULT_ADMIN_ID),
        };
      });

      await Promise.all([
        writeCategories(nextStoredCategories),
        writeProducts(nextProducts),
      ]);
      sendJson(response, 200, {
        category: nextCategoryName,
        previousCategory: previousCategoryName,
        updatedProducts,
        categories: getGlobalCategoryList(nextStoredCategories, nextProducts),
        message: "Category updated.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : "Unable to update category.",
      });
    }
    return;
  }

  if (request.method === "DELETE") {
    try {
      const categoryName = normalizeCategoryName(requestUrl?.searchParams.get("name"));

      if (!categoryName) {
        throw new Error("Category name is required.");
      }

      const [storedCategories, products] = await Promise.all([
        readCategories(),
        readProducts(),
      ]);
      const allCategories = getGlobalCategoryList(storedCategories, products);
      const categoryKey = categoryName.toLowerCase();
      const categoryExists = allCategories.some(
        (category) => category.toLowerCase() === categoryKey,
      );

      if (!categoryExists) {
        throw new Error("Category not found.");
      }

      const nextCategories = storedCategories.filter(
        (category) => getCategoryRecordName(category).toLowerCase() !== categoryKey,
      );
      const reassignedCategory =
        categoryKey === "general" ? "Uncategorized" : "General";
      let reassignedProducts = 0;
      const nextProducts = products.map((product) => {
        const productCategories = getProductCategoryList(product);
        if (
          !productCategories.some((category) => category.toLowerCase() === categoryKey)
        ) {
          return product;
        }

        const nextProductCategories = normalizeProductCategoryValues(
          productCategories.filter(
            (category) => category.toLowerCase() !== categoryKey,
          ),
        );
        if (!nextProductCategories.length) {
          nextProductCategories.push(reassignedCategory);
        }
        reassignedProducts += 1;
        return {
          ...product,
          category: nextProductCategories[0] ?? reassignedCategory,
          categories: nextProductCategories,
          adminId: getRecordAdminId(product, DEFAULT_ADMIN_ID),
        };
      });

      await Promise.all([
        writeCategories(nextCategories),
        writeProducts(nextProducts),
      ]);
      sendJson(response, 200, {
        categories: getGlobalCategoryList(nextCategories, nextProducts),
        reassignedProducts,
        reassignedCategory,
        message: "Category deleted.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : "Unable to delete category.",
      });
    }
    return;
  }

  sendJson(response, 405, { message: "Method not allowed." });
}

async function handleSuperAdminStoreTypesApi(request, response, requestUrl) {
  if (!requireSuperAdmin(request, response)) {
    return;
  }

  if (request.method === "GET") {
    try {
      const storedStoreTypes = await readStoreTypes();
      sendJson(response, 200, {
        storeTypes: getGlobalStoreTypeList(storedStoreTypes),
      });
    } catch (error) {
      sendJson(response, 500, {
        message: error instanceof Error ? error.message : "Unable to load store types.",
      });
    }
    return;
  }

  if (request.method === "POST") {
    try {
      const payload = await parseRequestBody(request);
      const storeTypeName = normalizeStoreTypeName(payload.name ?? payload.storeType);

      if (storeTypeName.length < 2) {
        throw new Error("Store type name must be at least 2 characters long.");
      }

      const storedStoreTypes = await readStoreTypes();
      const existingStoreTypes = getGlobalStoreTypeList(storedStoreTypes);
      const alreadyExists = existingStoreTypes.some(
        (storeType) => storeType.toLowerCase() === storeTypeName.toLowerCase(),
      );

      if (alreadyExists) {
        throw new Error("Store type already exists.");
      }

      const persistedStoreTypes = [
        ...storedStoreTypes,
        normalizeStoreTypeRecord({ name: storeTypeName }),
      ].filter(Boolean);

      await writeStoreTypes(persistedStoreTypes);
      sendJson(response, 201, {
        storeType: storeTypeName,
        storeTypes: getGlobalStoreTypeList(persistedStoreTypes),
        message: "Store type added.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : "Unable to add store type.",
      });
    }
    return;
  }

  if (request.method === "PUT") {
    try {
      const payload = await parseRequestBody(request);
      const previousStoreTypeName = normalizeStoreTypeName(
        payload.oldName ?? payload.currentName ?? payload.previousStoreType,
      );
      const nextStoreTypeName = normalizeStoreTypeName(payload.name ?? payload.storeType);

      if (!previousStoreTypeName) {
        throw new Error("Current store type name is required.");
      }

      if (nextStoreTypeName.length < 2) {
        throw new Error("Store type name must be at least 2 characters long.");
      }

      const [storedStoreTypes, accounts] = await Promise.all([
        readStoreTypes(),
        readAccounts(),
      ]);
      const allStoreTypes = getGlobalStoreTypeList(storedStoreTypes);
      const previousStoreTypeKey = previousStoreTypeName.toLowerCase();
      const nextStoreTypeKey = nextStoreTypeName.toLowerCase();

      const storeTypeExists = allStoreTypes.some(
        (storeType) => storeType.toLowerCase() === previousStoreTypeKey,
      );

      if (!storeTypeExists) {
        throw new Error("Store type not found.");
      }

      const alreadyExists = allStoreTypes.some((storeType) => {
        const storeTypeKey = storeType.toLowerCase();
        return storeTypeKey === nextStoreTypeKey && storeTypeKey !== previousStoreTypeKey;
      });

      if (alreadyExists) {
        throw new Error("Store type already exists.");
      }

      const nextStoredStoreTypes = [
        ...storedStoreTypes.filter(
          (storeType) => getStoreTypeRecordName(storeType).toLowerCase() !== previousStoreTypeKey,
        ),
        normalizeStoreTypeRecord({ name: nextStoreTypeName }),
      ].filter(Boolean);

      let updatedAdmins = 0;
      const nextAccounts = accounts.map((account) => {
        const currentStoreType = normalizeStoreTypeName(
          account?.storeType ?? account?.storeTypeName ?? account?.businessType,
        );
        if (currentStoreType.toLowerCase() !== previousStoreTypeKey) {
          return account;
        }

        updatedAdmins += 1;
        return {
          ...account,
          storeType: nextStoreTypeName,
          storeTypeName: nextStoreTypeName,
          businessType: nextStoreTypeName,
        };
      });

      await Promise.all([
        writeStoreTypes(nextStoredStoreTypes),
        writeAccounts(nextAccounts),
      ]);
      sendJson(response, 200, {
        storeType: nextStoreTypeName,
        previousStoreType: previousStoreTypeName,
        updatedAdmins,
        storeTypes: getGlobalStoreTypeList(nextStoredStoreTypes),
        message: "Store type updated.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : "Unable to update store type.",
      });
    }
    return;
  }

  if (request.method === "DELETE") {
    try {
      const storeTypeName = normalizeStoreTypeName(requestUrl?.searchParams.get("name"));

      if (!storeTypeName) {
        throw new Error("Store type name is required.");
      }

      const [storedStoreTypes, accounts] = await Promise.all([
        readStoreTypes(),
        readAccounts(),
      ]);
      const allStoreTypes = getGlobalStoreTypeList(storedStoreTypes);
      const storeTypeKey = storeTypeName.toLowerCase();
      const storeTypeExists = allStoreTypes.some(
        (storeType) => storeType.toLowerCase() === storeTypeKey,
      );

      if (!storeTypeExists) {
        throw new Error("Store type not found.");
      }

      const nextStoreTypes = storedStoreTypes.filter(
        (storeType) => getStoreTypeRecordName(storeType).toLowerCase() !== storeTypeKey,
      );
      let clearedAdmins = 0;
      const nextAccounts = accounts.map((account) => {
        const currentStoreType = normalizeStoreTypeName(
          account?.storeType ?? account?.storeTypeName ?? account?.businessType,
        );
        if (currentStoreType.toLowerCase() !== storeTypeKey) {
          return account;
        }

        clearedAdmins += 1;
        return {
          ...account,
          storeType: "",
          storeTypeName: "",
          businessType: "",
        };
      });

      await Promise.all([
        writeStoreTypes(nextStoreTypes),
        writeAccounts(nextAccounts),
      ]);
      sendJson(response, 200, {
        storeTypes: getGlobalStoreTypeList(nextStoreTypes),
        clearedAdmins,
        message: "Store type deleted.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : "Unable to delete store type.",
      });
    }
    return;
  }

  sendJson(response, 405, { message: "Method not allowed." });
}

async function handleStoreTypesApi(request, response) {
  if (request.method === "GET") {
    try {
      const storedStoreTypes = await readStoreTypes();
      sendJson(response, 200, {
        storeTypes: getGlobalStoreTypeList(storedStoreTypes),
      });
    } catch (error) {
      sendJson(response, 500, {
        message: error instanceof Error ? error.message : "Unable to load store types.",
      });
    }
    return;
  }

  sendJson(response, 403, {
    message: "Store type management is available in Super Admin only.",
  });
}

async function handleEmployeeLoginApi(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { message: "Method not allowed." });
    return;
  }

  try {
    const payload = await parseRequestBody(request);
    const employeeId = String(payload.employeeId ?? "").trim();
    const password = String(payload.password ?? "").trim();

    if (!employeeId || !password) {
      sendJson(response, 400, {
        message: "Please enter both the employee ID and password.",
      });
      return;
    }

    const accounts = await readAccounts();
    const account = findEmployeeLoginAccountWithPassword(accounts, employeeId, password);

    if (!account) {
      sendJson(response, 401, {
        message: "Employee ID or password is incorrect.",
      });
      return;
    }

    const faceAttendanceData = await readFaceAttendanceData();
    const serializedAccount = serializeEmployeeAccount(account, faceAttendanceData);
    sendJson(response, 200, {
      account: serializedAccount,
      adminId: serializedAccount.adminId,
      redirectPath: getEmployeeDashboardPath(serializedAccount),
      message: "Employee login verified.",
    });
  } catch (error) {
    sendJson(response, 400, {
      message:
        error instanceof Error
          ? error.message
          : "Unable to verify employee login.",
    });
  }
}

async function handleEmployeeLookupApi(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, { message: "Method not allowed." });
    return;
  }

  try {
    const requestUrl = new URL(request.url, `http://127.0.0.1:${PORT}`);
    const employeeId = String(requestUrl.searchParams.get("employeeId") ?? "").trim();

    if (!employeeId) {
      sendJson(response, 400, { message: "Employee ID is required." });
      return;
    }

    const accounts = await readAccounts();
    const account = findEmployeeLoginAccount(accounts, employeeId);

    if (!account) {
      sendJson(response, 404, { message: "Invalid Employee ID" });
      return;
    }

    sendJson(response, 200, {
      account: {
        employeeId: String(account.employeeId ?? account.accountCode ?? "").trim(),
        accountCode: String(account.accountCode ?? account.employeeId ?? "").trim(),
        role: "employee",
      },
    });
  } catch (error) {
    sendJson(response, 500, {
      message:
        error instanceof Error
          ? error.message
          : "Unable to check employee ID.",
    });
  }
}

async function handleAccountsApi(request, response) {
  const requestUrl = new URL(request.url, `http://127.0.0.1:${PORT}`);
  const requestAdminId = getRequestAdminId(request, requestUrl);
  const requestIsSuperAdmin = isSuperAdminAuthorized(request);
  const requestShouldUseAdminScope = !requestIsSuperAdmin;
  const getAccountRequestId = (payload = {}) =>
    String(
      payload.id
        ?? payload.accountId
        ?? payload.employeeId
        ?? requestUrl.searchParams.get("id")
        ?? requestUrl.searchParams.get("accountId")
        ?? requestUrl.searchParams.get("employeeId")
        ?? "",
    ).trim();
  const findAccountIndexById = (accounts, accountId) => {
    const normalizedAccountId = String(accountId ?? "").trim().toLowerCase();
    if (!normalizedAccountId) {
      return -1;
    }

    return accounts.findIndex((account) =>
      [
        account.id,
        account.accountCode,
        account.employeeId,
      ].some((value) => String(value ?? "").trim().toLowerCase() === normalizedAccountId),
    );
  };

  if (request.method === "GET") {
    try {
      const [accounts, faceAttendanceData] = await Promise.all([
        readAccounts(),
        readFaceAttendanceData(),
      ]);
      const visibleAccounts = accounts
        .filter((account) => !isAdminAccount(account))
        .filter((account) =>
          requestShouldUseAdminScope ? isRecordInAdminScope(account, requestAdminId) : true,
        );
      sendJson(response, 200, {
        accounts: visibleAccounts.map((account) =>
          serializeAccountForList(account, faceAttendanceData),
        ),
      });
    } catch (error) {
      sendJson(response, 500, {
        message: error instanceof Error ? error.message : "Unable to load accounts.",
      });
    }
    return;
  }

  if (request.method === "POST") {
    try {
      const payload = await parseRequestBody(request);
      const accounts = await readAccounts();
      const normalizedAccount = applyAdminId(normalizeAccountRecord({
        ...payload,
        adminId: payload.adminId ?? requestAdminId,
      }), requestAdminId);
      const hasEmployeeId = normalizedAccount.employeeId.trim().length > 0;
      const employeeIdTaken = hasEmployeeId && accounts.some(
        (account) =>
          !isAdminAccount(account) &&
          isRecordInAdminScope(account, requestAdminId) &&
          String(account.employeeId ?? "").toLowerCase() === normalizedAccount.employeeId.toLowerCase(),
      );

      if (employeeIdTaken) {
        throw new Error("Employee ID already exists.");
      }

      const emailTaken = accounts.some(
        (account) =>
          !isAdminAccount(account) &&
          isRecordInAdminScope(account, requestAdminId) &&
          String(account.email ?? "").toLowerCase() === normalizedAccount.email,
      );

      if (emailTaken) {
        throw new Error("Email address is already registered.");
      }

      const applicantNameKey = normalizeAccountApplicantNameForComparison(normalizedAccount);
      const applicantNameTaken = Boolean(applicantNameKey) && accounts.some(
        (account) =>
          !isAdminAccount(account) &&
          isRecordInAdminScope(account, requestAdminId) &&
          normalizeAccountApplicantNameForComparison(account) === applicantNameKey,
      );

      if (applicantNameTaken) {
        throw new Error("This applicant is already existed.");
      }

      const mobileNumberTaken = accounts.some(
        (account) =>
          !isAdminAccount(account) &&
          isRecordInAdminScope(account, requestAdminId) &&
          normalizeAccountPhoneForComparison(account.mobileNumber) ===
          normalizeAccountPhoneForComparison(normalizedAccount.mobileNumber),
      );

      if (mobileNumberTaken) {
        throw new Error("Phone number is already registered.");
      }

      accounts.unshift(normalizedAccount);
      await writeAccounts(accounts);
      const accountActivityActor = createEmployeeRequestActivityActor(payload, normalizedAccount);
      await logActivitySafely(accountActivityActor && {
        title:
          normalizedAccount.source === "app"
            ? "New user registered"
            : "Employee account created",
        actor: accountActivityActor,
        adminId: requestAdminId,
        targetPermission: "employee-data",
        description:
          normalizedAccount.source === "app"
            ? `${normalizedAccount.firstName} ${normalizedAccount.lastName} created an account from the app.`
            : `${normalizedAccount.firstName} ${normalizedAccount.lastName} was registered as an employee account.`,
        createdAt: new Date().toISOString(),
      });
      sendJson(response, 201, {
        account: serializeAccountForList(normalizedAccount),
        message:
          normalizedAccount.source === "app"
            ? "User account created."
            : "Employee account created.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : "Unable to create account.",
      });
    }
    return;
  }

  if (request.method === "PUT") {
    try {
      const payload = await parseRequestBody(request);
      const accounts = await readAccounts();
      const accountId = getAccountRequestId(payload);
      const accountIndex = findAccountIndexById(accounts, accountId);

      if (accountIndex < 0) {
        throw new Error("Employee account was not found.");
      }

      const existingAccount = accounts[accountIndex];
      if (!isRecordInAdminScope(existingAccount, requestAdminId)) {
        throw new Error("Employee account was not found.");
      }
      if (String(existingAccount.source ?? "").trim().toLowerCase() !== "web") {
        throw new Error("Only employee accounts can be edited here.");
      }

      const submittedPassword = String(payload.password ?? "").trim();
      const accountUpdatedAt = new Date().toISOString();
      const passwordWasChanged = Boolean(
        submittedPassword &&
        submittedPassword !== String(existingAccount.password ?? ""),
      );
      const mergedPayload = {
        ...existingAccount,
        ...payload,
        __accessPermissionsWereProvided:
          Object.prototype.hasOwnProperty.call(payload, "accessPermissions")
          || Object.prototype.hasOwnProperty.call(payload, "employeeAccessPermissions"),
        id: existingAccount.id,
        accountCode: existingAccount.accountCode,
        employeeId: existingAccount.employeeId,
        source: "web",
        adminId: getRecordAdminId(existingAccount, requestAdminId),
        password: submittedPassword || existingAccount.password,
        passwordUpdatedAt: passwordWasChanged
          ? accountUpdatedAt
          : existingAccount.passwordUpdatedAt ?? null,
        countryCode: payload.countryCode ?? existingAccount.countryCode ?? "+63",
        eDocument: payload.eDocument ?? existingAccount.eDocument,
        faceVerified: payload.faceVerified ?? existingAccount.faceVerified,
        verifiedAt: payload.verifiedAt ?? existingAccount.verifiedAt,
        createdAt: existingAccount.createdAt,
        updatedAt: accountUpdatedAt,
      };
      const normalizedAccount = applyAdminId(
        normalizeAccountRecord(mergedPayload, existingAccount),
        getRecordAdminId(existingAccount, requestAdminId),
      );

      const applicantNameKey = normalizeAccountApplicantNameForComparison(normalizedAccount);
      const hasDuplicateApplicantName =
        Boolean(applicantNameKey) &&
        accounts.some((account, index) =>
          index !== accountIndex &&
          !isAdminAccount(account) &&
          isRecordInAdminScope(account, requestAdminId) &&
          normalizeAccountApplicantNameForComparison(account) === applicantNameKey,
        );

      if (hasDuplicateApplicantName) {
        throw new Error("This applicant is already existed.");
      }

      const hasDuplicateEmail = accounts.some(
        (account, index) =>
          index !== accountIndex &&
          !isAdminAccount(account) &&
          isRecordInAdminScope(account, requestAdminId) &&
          String(account.email ?? "").toLowerCase() === normalizedAccount.email,
      );

      if (hasDuplicateEmail) {
        throw new Error("Email address is already registered.");
      }

      const hasDuplicateMobileNumber = accounts.some(
        (account, index) =>
          index !== accountIndex &&
          !isAdminAccount(account) &&
          isRecordInAdminScope(account, requestAdminId) &&
          normalizeAccountPhoneForComparison(account.mobileNumber) ===
            normalizeAccountPhoneForComparison(normalizedAccount.mobileNumber),
      );

      if (hasDuplicateMobileNumber) {
        throw new Error("Phone number is already registered.");
      }

      accounts[accountIndex] = normalizedAccount;
      await writeAccounts(accounts);
      const accountActivityActor = createEmployeeRequestActivityActor(payload, normalizedAccount);
      const profileImageWasChanged =
        Object.prototype.hasOwnProperty.call(payload, "profileImageUrl") &&
        getActivityAccountProfileImageUrl(existingAccount) !== getActivityAccountProfileImageUrl(normalizedAccount);
      const accountDisplayName = getActivityAccountDisplayName(normalizedAccount) ||
        `${normalizedAccount.firstName ?? ""} ${normalizedAccount.lastName ?? ""}`.replace(/\s+/g, " ").trim() ||
        "Employee";
      await logActivitySafely(accountActivityActor && {
        id: createActivityLogId(),
        type: "employee-account",
        action: profileImageWasChanged ? "profile-image-updated" : "updated",
        title: profileImageWasChanged ? "Employee profile updated" : "Employee account updated",
        actor: accountActivityActor,
        adminId: requestAdminId,
        targetPermission: "employee-data",
        description: profileImageWasChanged
          ? `${accountDisplayName} updated their profile picture.`
          : `${accountDisplayName} employee account was updated.`,
        createdAt: new Date().toISOString(),
      });
      sendJson(response, 200, {
        account: serializeAccountForList(normalizedAccount),
        message: "Employee account updated.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : "Unable to update account.",
      });
    }
    return;
  }

  if (request.method === "DELETE") {
    try {
      const payload = await parseRequestBody(request).catch(() => ({}));
      const accounts = await readAccounts();
      const accountId = getAccountRequestId(payload);
      const accountIndex = findAccountIndexById(accounts, accountId);

      if (accountIndex < 0) {
        throw new Error("Employee account was not found.");
      }

      if (!isRecordInAdminScope(accounts[accountIndex], requestAdminId)) {
        throw new Error("Employee account was not found.");
      }

      const [deletedAccount] = accounts.splice(accountIndex, 1);
      await writeAccounts(accounts);
      const faceAttendanceCleanup = await removeFaceAttendanceProfileForAccount(
        deletedAccount,
      ).catch((cleanupError) => {
        console.warn("Unable to remove Face Attendance profile.", cleanupError);
        return { removed: false, removedEmployeeIds: [] };
      });
      const accountActivityActor = createEmployeeRequestActivityActor(payload, deletedAccount);
      await logActivitySafely(accountActivityActor && {
        title: "Employee account deleted",
        actor: accountActivityActor,
        adminId: requestAdminId,
        targetPermission: "employee-data",
        description: `${deletedAccount.firstName ?? ""} ${deletedAccount.lastName ?? ""} employee account was deleted.`.trim(),
        createdAt: new Date().toISOString(),
      });
      sendJson(response, 200, {
        account: serializeAccountForList(deletedAccount),
        faceAttendanceProfileRemoved: Boolean(faceAttendanceCleanup.removed),
        message: "Employee account deleted.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : "Unable to delete account.",
      });
    }
    return;
  }

  sendJson(response, 405, { message: "Method not allowed." });
}

async function handleCategoriesApi(request, response, requestUrl) {
  const requestAdminId = getRequestAdminId(request, requestUrl);

  if (request.method === "GET") {
    try {
      const [storedCategories, products] = await Promise.all([
        readCategories(),
        readProducts(),
      ]);
      const categories = getAdminCategoryList(storedCategories, products, requestAdminId);
      sendJson(response, 200, { categories });
    } catch (error) {
      sendJson(response, 500, {
        message: error instanceof Error ? error.message : "Unable to load categories.",
      });
    }
    return;
  }

  sendJson(response, 403, {
    message: "Category management is available in Super Admin only.",
  });
  return;
}

async function handlePaymentPartnersApi(request, response) {
  const requestUrl = new URL(request.url, `http://127.0.0.1:${PORT}`);
  const requestAdminId = getRequestAdminId(request, requestUrl);
  const requestIsSuperAdmin = isSuperAdminAuthorized(request);
  const requestShouldUseAdminScope = !requestIsSuperAdmin && hasRequestAdminScope(request, requestUrl);

  if (request.method === "GET") {
    try {
      const storedPartners = await readPaymentPartners();
      const partners = requestShouldUseAdminScope
        ? filterRecordsByAdminId(storedPartners, requestAdminId)
        : storedPartners;
      sendJson(response, 200, { partners });
    } catch (error) {
      sendJson(response, 500, {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load payment partners.",
      });
    }
    return;
  }

  if (request.method === "POST") {
    try {
      const payload = await parseRequestBody(request);
      const partner = requestIsSuperAdmin
        ? normalizePaymentPartnerRecord(payload)
        : applyAdminId(normalizePaymentPartnerRecord(payload), requestAdminId);
      const partners = await readPaymentPartners();
      partners.unshift(partner);
      await writePaymentPartners(partners);
      sendJson(response, 201, {
        partner,
        message: "Payment partner saved.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message:
          error instanceof Error
            ? error.message
            : "Unable to save payment partner.",
      });
    }
    return;
  }

  sendJson(response, 405, { message: "Method not allowed." });
}

async function handleOrdersApi(request, response) {
  const requestUrl = new URL(request.url, `http://127.0.0.1:${PORT}`);
  const requestAdminId = getRequestAdminId(request, requestUrl);
  const requestIsAdminScoped = hasRequestAdminScope(request, requestUrl);
  const requestAccountId = getRequestAccountIdentifier(request, requestUrl).id;
  const requestShouldUseAdminScope = requestIsAdminScoped && !requestAccountId;
  const incomingAdminScopeId = requestShouldUseAdminScope ? requestAdminId : "";

  if (request.method === "GET") {
    try {
      let orders = await readOrders();
      if (requestShouldUseAdminScope) {
        orders = filterRecordsByAdminId(orders, requestAdminId);
      }
      // Filter by account ID if provided (for user-specific order fetching)
      if (requestAccountId) {
        orders = orders.filter(
          (order) =>
            String(order?.accountId ?? "").trim() === requestAccountId,
        );
      } else if (!requestShouldUseAdminScope) {
        orders = filterRecordsByAdminId(orders, requestAdminId);
      }
      sendJson(response, 200, { orders });
    } catch (error) {
      sendJson(response, 500, {
        message: error instanceof Error ? error.message : "Unable to load orders.",
      });
    }
    return;
  }

  if (request.method === "PUT") {
    try {
      const payload = await parseRequestBody(request);
      const orders = normalizeOrderEntriesPayload(payload, incomingAdminScopeId);
      const existingOrders = await readOrders();
      const nextOrders = requestShouldUseAdminScope
        ? sortStoredOrderEntries([
            ...existingOrders.filter((entry) => !isRecordInAdminScope(entry, requestAdminId)),
            ...orders,
          ])
        : mergeStoredOrderEntries(existingOrders, orders);
      await writeOrders(nextOrders);
      await syncProductReviewCommentCountsFromOrders(
        nextOrders,
        requestShouldUseAdminScope ? requestAdminId : null,
      );
      sendJson(response, 200, {
        orders: requestShouldUseAdminScope ? orders : nextOrders,
        total: requestShouldUseAdminScope ? orders.length : nextOrders.length,
        message: "Orders synced.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : "Unable to save orders.",
      });
    }
    return;
  }

  if (request.method === "POST") {
    try {
      const payload = await parseRequestBody(request);
      const incomingOrders = normalizeOrderEntriesPayload(payload, incomingAdminScopeId);
      const existingOrders = await readOrders();
      const existingScopedOrders = requestShouldUseAdminScope
        ? filterRecordsByAdminId(existingOrders, requestAdminId)
        : existingOrders;
      const mergedOrders = mergeStoredOrderEntries(existingScopedOrders, incomingOrders);
      const nextOrders = requestShouldUseAdminScope
        ? sortStoredOrderEntries([
            ...existingOrders.filter((entry) => !isRecordInAdminScope(entry, requestAdminId)),
            ...mergedOrders,
          ])
        : mergedOrders;
      await writeOrders(nextOrders);
      await syncProductReviewCommentCountsFromOrders(
        nextOrders,
        requestShouldUseAdminScope ? requestAdminId : null,
      );
      sendJson(response, 200, {
        orders: mergedOrders,
        total: mergedOrders.length,
        mergedCount: incomingOrders.length,
        message: "Orders merged.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : "Unable to merge orders.",
      });
    }
    return;
  }

  sendJson(response, 405, { message: "Method not allowed." });
}

async function handlePackOrderGroupApi(request, response, createdAtEpochMs) {
  const requestUrl = new URL(request.url, `http://127.0.0.1:${PORT}`);
  const requestAdminId = getRequestAdminId(request, requestUrl);

  if (request.method !== "POST") {
    sendJson(response, 405, { message: "Method not allowed." });
    return;
  }

  const normalizedCreatedAtEpochMs = Math.trunc(parseFiniteNumber(createdAtEpochMs, NaN));
  if (!Number.isFinite(normalizedCreatedAtEpochMs)) {
    sendJson(response, 400, { message: "Invalid order group id." });
    return;
  }

  try {
    const payload = await parseRequestBody(request);
    const deductInventory = Boolean(payload?.deductInventory);
    const orders = await readOrders();
    const targetEntries = orders.filter(
      (entry) =>
        isRecordInAdminScope(entry, requestAdminId) &&
        Math.trunc(parseFiniteNumber(entry?.createdAtEpochMs, NaN)) ===
        normalizedCreatedAtEpochMs,
    );

    if (!targetEntries.length) {
      sendJson(response, 404, { message: "Order group not found." });
      return;
    }

    const entriesNeedingInventoryDeduction = targetEntries.filter(
      (entry) => !orderEntryHasActiveInventoryDeduction(entry),
    );
    let appliedInventoryMovements = [];
    const packedAtEpochMs = Date.now();

    if (deductInventory && entriesNeedingInventoryDeduction.length) {
      const inventoryMovements = buildInventoryMovementItemsFromOrderEntries(
        entriesNeedingInventoryDeduction,
      );
      const products = await readProducts();
      const scopedProducts = filterRecordsByAdminId(products, requestAdminId);
      const inventoryResult = applyInventoryMovementToProducts(
        scopedProducts,
        inventoryMovements,
        "deduct",
      );
      appliedInventoryMovements = inventoryResult.movements;

      if (inventoryResult.products !== scopedProducts) {
        await writeProducts(
          mergeScopedRecordsById(products, inventoryResult.products, requestAdminId),
        );
      }
    }

    const movementsByEntryId = appliedInventoryMovements.reduce((map, movement) => {
      const orderEntryId = String(movement?.orderEntryId ?? "").trim();
      if (!orderEntryId) {
        return map;
      }

      if (!map.has(orderEntryId)) {
        map.set(orderEntryId, []);
      }
      map.get(orderEntryId).push(movement);
      return map;
    }, new Map());
    let didUpdateOrderGroup = false;

    const nextOrders = orders.map((entry) => {
      if (
        !isRecordInAdminScope(entry, requestAdminId) ||
        Math.trunc(parseFiniteNumber(entry?.createdAtEpochMs, NaN)) !==
        normalizedCreatedAtEpochMs
      ) {
        return entry;
      }

      didUpdateOrderGroup = true;
      const existingMovements = normalizeInventoryMovementItems(entry?.inventoryMovements);
      const entryMovements = movementsByEntryId.get(String(entry?.id ?? "").trim());
      return normalizeStoredOrderEntry({
        ...entry,
        stage: "toShip",
        inventoryDeducted: deductInventory || entry?.inventoryDeducted === true,
        inventoryDeductedAtEpochMs:
          deductInventory
            ? Math.trunc(parseFiniteNumber(entry?.inventoryDeductedAtEpochMs, 0)) ||
              packedAtEpochMs
            : Math.trunc(parseFiniteNumber(entry?.inventoryDeductedAtEpochMs, 0)),
        inventoryRestoredAtEpochMs: 0,
        inventoryMovements: entryMovements || existingMovements,
      });
    });

    await writeOrders(nextOrders);
    sendJson(response, 200, {
      createdAtEpochMs: normalizedCreatedAtEpochMs,
      updatedCount: nextOrders.filter(
        (entry) =>
          isRecordInAdminScope(entry, requestAdminId) &&
          Math.trunc(parseFiniteNumber(entry?.createdAtEpochMs, NaN)) ===
          normalizedCreatedAtEpochMs,
      ).length,
      message: "Order group moved to To Ship.",
    });
  } catch (error) {
    sendJson(response, 500, {
      message:
        error instanceof Error ? error.message : "Unable to mark order group as packed.",
    });
  }
}

async function handleShipOrderGroupApi(request, response, createdAtEpochMs) {
  const requestUrl = new URL(request.url, `http://127.0.0.1:${PORT}`);
  const requestAdminId = getRequestAdminId(request, requestUrl);

  if (request.method !== "POST") {
    sendJson(response, 405, { message: "Method not allowed." });
    return;
  }

  const normalizedCreatedAtEpochMs = Math.trunc(parseFiniteNumber(createdAtEpochMs, NaN));
  if (!Number.isFinite(normalizedCreatedAtEpochMs)) {
    sendJson(response, 400, { message: "Invalid order group id." });
    return;
  }

  try {
    const orders = await readOrders();
    const salesByProductId = new Map();
    let didUpdateOrderGroup = false;

    const nextOrders = orders.map((entry) => {
      if (
        !isRecordInAdminScope(entry, requestAdminId) ||
        Math.trunc(parseFiniteNumber(entry?.createdAtEpochMs, NaN)) !==
        normalizedCreatedAtEpochMs
      ) {
        return entry;
      }

      const previousStage = String(entry?.stage || "").trim();
      if (previousStage !== "toReceive") {
        const productId = String(entry?.productId || "").trim();
        const quantity = Number.isFinite(Number(entry?.quantity))
          ? Math.max(0, Math.trunc(Number(entry.quantity)))
          : 0;

        if (productId && quantity > 0) {
          salesByProductId.set(
            productId,
            (salesByProductId.get(productId) || 0) + quantity,
          );
        }
      }

      didUpdateOrderGroup = true;
      return {
        ...entry,
        stage: "toReceive",
      };
    });

    if (!didUpdateOrderGroup) {
      sendJson(response, 404, { message: "Order group not found." });
      return;
    }

    if (salesByProductId.size > 0) {
      const products = await readProducts();
      let didUpdateProductSales = false;

      const nextProducts = products.map((product) => {
        if (!isRecordInAdminScope(product, requestAdminId)) {
          return product;
        }

        const productId = String(product?.id || "").trim();
        const quantity = salesByProductId.get(productId) || 0;
        if (quantity <= 0) {
          return product;
        }

        const currentSold = Number.isFinite(Number(product?.sold))
          ? Math.max(0, Math.trunc(Number(product.sold)))
          : 0;
        const nextSold = currentSold + quantity;
        if (nextSold === currentSold) {
          return product;
        }

        didUpdateProductSales = true;
        return {
          ...product,
          sold: nextSold,
          updatedAt: new Date().toISOString(),
        };
      });

      if (didUpdateProductSales) {
        await writeProducts(nextProducts);
      }
    }

    await writeOrders(nextOrders);
    sendJson(response, 200, {
      createdAtEpochMs: normalizedCreatedAtEpochMs,
      updatedCount: nextOrders.filter(
        (entry) =>
          isRecordInAdminScope(entry, requestAdminId) &&
          Math.trunc(parseFiniteNumber(entry?.createdAtEpochMs, NaN)) ===
          normalizedCreatedAtEpochMs,
      ).length,
      message: "Order group moved to To Receive.",
    });
  } catch (error) {
    sendJson(response, 500, {
      message:
        error instanceof Error ? error.message : "Unable to mark order group as shipped.",
    });
  }
}

async function handleCancelOrderGroupApi(request, response, createdAtEpochMs) {
  const requestUrl = new URL(request.url, `http://127.0.0.1:${PORT}`);
  const requestAdminId = getRequestAdminId(request, requestUrl);

  if (request.method !== "POST") {
    sendJson(response, 405, { message: "Method not allowed." });
    return;
  }

  const normalizedCreatedAtEpochMs = Math.trunc(
    parseFiniteNumber(createdAtEpochMs, NaN),
  );
  if (!Number.isFinite(normalizedCreatedAtEpochMs)) {
    sendJson(response, 400, { message: "Invalid order group id." });
    return;
  }

  try {
    const orders = await readOrders();
    const targetEntries = orders.filter(
      (entry) =>
        isRecordInAdminScope(entry, requestAdminId) &&
        Math.trunc(parseFiniteNumber(entry?.createdAtEpochMs, NaN)) ===
        normalizedCreatedAtEpochMs,
    );

    if (!targetEntries.length) {
      sendJson(response, 404, { message: "Order group not found." });
      return;
    }

    const restoreMovements = buildInventoryRestoreMovementsForOrderEntries(targetEntries);
    let inventoryRestoredAtEpochMs = 0;
    if (restoreMovements.length) {
      const products = await readProducts();
      const scopedProducts = filterRecordsByAdminId(products, requestAdminId);
      const inventoryResult = applyInventoryMovementToProducts(
        scopedProducts,
        restoreMovements,
        "restore",
      );
      if (inventoryResult.products !== scopedProducts) {
        await writeProducts(
          mergeScopedRecordsById(products, inventoryResult.products, requestAdminId),
        );
      }
      inventoryRestoredAtEpochMs = Date.now();
    }

    const resolvedAtEpochMs = Date.now();
    let didUpdateOrderGroup = false;
    const nextOrders = orders.map((entry) => {
      if (
        !isRecordInAdminScope(entry, requestAdminId) ||
        Math.trunc(parseFiniteNumber(entry?.createdAtEpochMs, NaN)) !==
        normalizedCreatedAtEpochMs
      ) {
        return entry;
      }

      didUpdateOrderGroup = true;
      return normalizeStoredOrderEntry({
        ...entry,
        stage: "cancelled",
        cancelRequestStatus: "accepted",
        cancelRequestResolvedAtEpochMs: resolvedAtEpochMs,
        inventoryDeducted: false,
        inventoryRestoredAtEpochMs:
          inventoryRestoredAtEpochMs ||
          Math.trunc(parseFiniteNumber(entry?.inventoryRestoredAtEpochMs, 0)),
      });
    });

    if (!didUpdateOrderGroup) {
      sendJson(response, 404, { message: "Order group not found." });
      return;
    }

    await writeOrders(nextOrders);
    sendJson(response, 200, {
      createdAtEpochMs: normalizedCreatedAtEpochMs,
      updatedCount: nextOrders.filter(
        (entry) =>
          isRecordInAdminScope(entry, requestAdminId) &&
          Math.trunc(parseFiniteNumber(entry?.createdAtEpochMs, NaN)) ===
          normalizedCreatedAtEpochMs,
      ).length,
      message: "Order group cancelled.",
    });
  } catch (error) {
    sendJson(response, 500, {
      message:
        error instanceof Error ? error.message : "Unable to cancel order group.",
    });
  }
}

async function handleCancelOrderRequestDecisionApi(
  request,
  response,
  createdAtEpochMs,
  decision,
) {
  const requestUrl = new URL(request.url, `http://127.0.0.1:${PORT}`);
  const requestAdminId = getRequestAdminId(request, requestUrl);

  if (request.method !== "POST") {
    sendJson(response, 405, { message: "Method not allowed." });
    return;
  }

  const normalizedCreatedAtEpochMs = Math.trunc(
    parseFiniteNumber(createdAtEpochMs, NaN),
  );
  if (!Number.isFinite(normalizedCreatedAtEpochMs)) {
    sendJson(response, 400, { message: "Invalid order group id." });
    return;
  }

  const normalizedDecision = String(decision ?? "").trim().toLowerCase();
  if (normalizedDecision !== "accept" && normalizedDecision !== "reject") {
    sendJson(response, 400, { message: "Invalid cancel-request action." });
    return;
  }

  try {
    const orders = await readOrders();
    const targetEntries = orders.filter(
      (entry) =>
        isRecordInAdminScope(entry, requestAdminId) &&
        Math.trunc(parseFiniteNumber(entry?.createdAtEpochMs, NaN)) ===
        normalizedCreatedAtEpochMs,
    );

    if (!targetEntries.length) {
      sendJson(response, 404, { message: "Order group not found." });
      return;
    }

    let inventoryRestoredAtEpochMs = 0;
    if (normalizedDecision === "accept") {
      const restoreMovements = buildInventoryRestoreMovementsForOrderEntries(targetEntries);
      if (restoreMovements.length) {
        const products = await readProducts();
        const scopedProducts = filterRecordsByAdminId(products, requestAdminId);
        const inventoryResult = applyInventoryMovementToProducts(
          scopedProducts,
          restoreMovements,
          "restore",
        );
        if (inventoryResult.products !== scopedProducts) {
          await writeProducts(
            mergeScopedRecordsById(products, inventoryResult.products, requestAdminId),
          );
        }
        inventoryRestoredAtEpochMs = Date.now();
      }
    }

    let didUpdateOrderGroup = false;

    const nextOrders = orders.map((entry) => {
      if (
        !isRecordInAdminScope(entry, requestAdminId) ||
        Math.trunc(parseFiniteNumber(entry?.createdAtEpochMs, NaN)) !==
        normalizedCreatedAtEpochMs
      ) {
        return entry;
      }

      didUpdateOrderGroup = true;
      if (normalizedDecision === "accept") {
        const resolvedAtEpochMs = Date.now();
        return normalizeStoredOrderEntry({
          ...entry,
          stage: "cancelled",
          cancelRequestStatus: "accepted",
          cancelRequestResolvedAtEpochMs: resolvedAtEpochMs,
          inventoryDeducted: false,
          inventoryRestoredAtEpochMs:
            inventoryRestoredAtEpochMs ||
            Math.trunc(parseFiniteNumber(entry?.inventoryRestoredAtEpochMs, 0)),
        });
      }

      return normalizeStoredOrderEntry({
        ...entry,
        cancelRequestStatus: "rejected",
        cancelRequestReason: "",
        cancelRequestSubmittedAtEpochMs: 0,
        cancelRequestResolvedAtEpochMs: 0,
      });
    });

    await writeOrders(nextOrders);
    sendJson(response, 200, {
      createdAtEpochMs: normalizedCreatedAtEpochMs,
      updatedCount: nextOrders.filter(
        (entry) =>
          isRecordInAdminScope(entry, requestAdminId) &&
          Math.trunc(parseFiniteNumber(entry?.createdAtEpochMs, NaN)) ===
          normalizedCreatedAtEpochMs,
      ).length,
      decision: normalizedDecision,
      message:
        normalizedDecision === "accept"
          ? "Cancellation request accepted."
          : "Cancellation request rejected.",
    });
  } catch (error) {
    sendJson(response, 500, {
      message:
        error instanceof Error
          ? error.message
          : "Unable to process cancellation request.",
    });
  }
}

async function handleActivityApi(request, response, requestUrl) {
  const requestAdminId = getRequestAdminId(request, requestUrl);

  if (request.method !== "GET") {
    sendJson(response, 405, { message: "Method not allowed." });
    return;
  }

  try {
    const requestedLimit = Number(requestUrl.searchParams.get("limit"));
    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(Math.trunc(requestedLimit), 50)
        : 6;
    const requestViewer = normalizeActivityViewerFromRequestUrl(requestUrl);
    const [activityLog, accounts] = await Promise.all([
      readActivityLog(),
      readAccounts(),
    ]);
    const viewer = enrichActivityViewerFromAccounts(requestViewer, accounts);
    const visibleActivities = filterRecordsByAdminId(activityLog, requestAdminId)
      .map((activity) =>
        formatActivityForViewer(enrichActivityActorFromAccounts(activity, accounts), viewer)
      )
      .filter((activity) => shouldNotifyForViewerActivity(activity, viewer))
      .filter((activity) => canActivityBeSeenByViewer(activity, viewer));
    sendJson(response, 200, {
      activities: visibleActivities.slice(0, limit),
      total: visibleActivities.length,
    });
  } catch (error) {
    sendJson(response, 500, {
      message: error instanceof Error ? error.message : "Unable to load activity log.",
    });
  }
}

async function handleUploadApi(request, response, options = {}) {
  if (request.method !== "POST") {
    sendJson(response, 405, { message: "Method not allowed." });
    return;
  }

  try {
    const isReviewUpload = options?.reviewMedia === true;
    await ensureStoragePaths();
    const contentType = String(request.headers["content-type"] ?? "").toLowerCase();
    const sourceFilename = String(request.headers["x-file-name"] ?? "product-image");
    const extension = getUploadExtension(sourceFilename, contentType);
    const isImageUpload = isImageUploadType(contentType, extension);
    const isModelUpload = isModelUploadType(contentType, extension);
    const isVideoUpload = contentType.startsWith("video/");
    const isRecognizedMediaExtension = Boolean(extension);

    const isSupportedMediaType =
      contentType.startsWith("image/") ||
      contentType.startsWith("video/") ||
      isModelUpload ||
      isRecognizedMediaExtension;
    if (!isSupportedMediaType || !extension) {
      throw new Error("Please upload a valid photo, video, or 3D model file.");
    }
    if (isReviewUpload && !isImageUpload && !isVideoUpload) {
      throw new Error("Please upload a valid review photo or video.");
    }

    const fileBuffer = await parseBinaryRequestBody(request, {
      maxBytes: isReviewUpload && isVideoUpload
        ? MAX_REVIEW_VIDEO_BYTES
        : MAX_UPLOAD_BYTES,
      maxSizeLabel: isReviewUpload && isVideoUpload
        ? MAX_REVIEW_VIDEO_SIZE_LABEL
        : MAX_UPLOAD_SIZE_LABEL,
    });
    if (fileBuffer.length === 0) {
      throw new Error("Uploaded file is empty.");
    }
    if (isReviewUpload && isVideoUpload && fileBuffer.length > MAX_REVIEW_VIDEO_BYTES) {
      throw createHttpError(
        `Uploaded file is too large. Keep uploads under ${MAX_REVIEW_VIDEO_SIZE_LABEL}.`,
        413,
      );
    }

    const shouldPreservePng =
      isImageUpload && shouldStoreUploadedImageAsPng(contentType, extension);
    const storedBuffer = isImageUpload && !shouldPreservePng
      ? await convertUploadedImageToWebp(fileBuffer)
      : fileBuffer;
    const storedExtension = shouldPreservePng
      ? ".png"
      : isImageUpload
        ? ".webp"
        : extension;
    const safeStem =
      sanitizeFileStem(path.basename(sourceFilename, extension)) ||
      (isModelUpload ? "product-model" : "product-image");
    const fileName = `${safeStem}-${Date.now()}${storedExtension}`;
    const filePath = path.join(UPLOADS_DIR, fileName);
    const uploadUrl = `/uploads/${fileName}`;

    await fsPromises.writeFile(filePath, storedBuffer);

    sendJson(response, 201, {
      imageUrl: uploadUrl,
      mediaUrl: uploadUrl,
      type: isVideoUpload ? "video" : "image",
      modelUrl: isModelUpload ? uploadUrl : "",
      fileName,
      contentType: isImageUpload && !shouldPreservePng ? "image/webp" : contentType,
      sizeBytes: storedBuffer.length,
      message: isImageUpload
        ? shouldPreservePng
          ? "PNG image uploaded."
          : "Image uploaded as WebP."
        : isModelUpload
          ? "3D model uploaded."
          : "File uploaded.",
    });
  } catch (error) {
    const statusCode =
      Number.isInteger(error?.statusCode) && error.statusCode >= 400
        ? error.statusCode
        : 400;
    sendJson(response, statusCode, {
      message: error instanceof Error ? error.message : "Unable to upload file.",
    });
  }
}

async function handleProductModelFromFramesApi(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { message: "Method not allowed." });
    return;
  }

  try {
    await ensureStoragePaths();
    const body = await parseRequestBody(request);
    const generatedModel = await createProductModelFromFrameImages(body);
    sendJson(response, 201, {
      ...generatedModel,
      message: "3D model generated from 6 uploaded frames.",
    });
  } catch (error) {
    const statusCode =
      Number.isInteger(error?.statusCode) && error.statusCode >= 400
        ? error.statusCode
        : 400;
    sendJson(response, statusCode, {
      message:
        error instanceof Error
          ? error.message
          : "Unable to generate the 3D model.",
    });
  }
}

async function handleProductModelFromScanApi(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { message: "Method not allowed." });
    return;
  }

  try {
    await ensureStoragePaths();
    const body = await parseRequestBody(request);
    const generatedModel = await createProductModelFromScanImages(body);
    sendJson(response, 201, {
      ...generatedModel,
      message: "Any-shape 3D scan shell generated from uploaded frames.",
    });
  } catch (error) {
    const statusCode =
      Number.isInteger(error?.statusCode) && error.statusCode >= 400
        ? error.statusCode
        : 400;
    sendJson(response, statusCode, {
      message:
        error instanceof Error
          ? error.message
          : "Unable to generate the any-shape scan model.",
    });
  }
}

async function handleDocumentUploadApi(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { message: "Method not allowed." });
    return;
  }

  try {
    await ensureStoragePaths();
    const contentType = String(request.headers["content-type"] ?? "").toLowerCase();
    const sourceFilename = String(request.headers["x-file-name"] ?? "employee-document");
    const extension = getDocumentUploadExtension(sourceFilename, contentType);
    const isSupportedDocumentType =
      [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ].includes(contentType) || Boolean(extension);

    if (!isSupportedDocumentType || !extension) {
      throw new Error("Please upload a valid PDF, DOC, or DOCX document.");
    }

    const fileBuffer = await parseBinaryRequestBody(request);
    if (fileBuffer.length === 0) {
      throw new Error("Uploaded document is empty.");
    }

    const safeStem = sanitizeFileStem(path.basename(sourceFilename, extension)) || "employee-document";
    const fileName = `${safeStem}-${Date.now()}${extension}`;
    const filePath = path.join(UPLOADS_DIR, fileName);

    await fsPromises.writeFile(filePath, fileBuffer);

    sendJson(response, 201, {
      documentUrl: `/uploads/${fileName}`,
      message: "Document uploaded.",
    });
  } catch (error) {
    const statusCode =
      Number.isInteger(error?.statusCode) && error.statusCode >= 400
        ? error.statusCode
        : 400;
    sendJson(response, statusCode, {
      message: error instanceof Error ? error.message : "Unable to upload document.",
    });
  }
}

async function handleSingleProductApi(request, response, productId) {
  const requestUrl = new URL(request.url, `http://127.0.0.1:${PORT}`);
  const requestAdminId = getExplicitRequestAdminId(request, requestUrl);

  if (
    ["DELETE", "PUT", "PATCH"].includes(request.method) &&
    !isUsableProductAdminScope(requestAdminId)
  ) {
    sendProductAdminScopeRequired(response);
    return;
  }

  if (request.method === "DELETE") {
    try {
      const payload = await parseRequestBody(request);
      const products = await readProducts();
      const targetProduct = products.find((product) =>
        product.id === productId && isRecordInAdminScope(product, requestAdminId)
      );

      if (!targetProduct) {
        sendJson(response, 404, { message: "Product not found." });
        return;
      }

      const nextProducts = products.filter((product) =>
        !(product.id === productId && isRecordInAdminScope(product, requestAdminId)),
      );
      await writeProducts(nextProducts);
      await logActivitySafely(createProductActivityEntry("deleted", targetProduct, payload?.__activityActor));
      sendJson(response, 200, {
        message: "Product deleted.",
        deletedId: productId,
      });
    } catch (error) {
      sendJson(response, 500, {
        message: error instanceof Error ? error.message : "Unable to delete product.",
      });
    }
    return;
  }

  if (request.method === "PUT") {
    try {
      const payload = await parseRequestBody(request);
      const products = await readProducts();
      const productIndex = products.findIndex((product) =>
        product.id === productId && isRecordInAdminScope(product, requestAdminId)
      );

      if (productIndex === -1) {
        sendJson(response, 404, { message: "Product not found." });
        return;
      }

      const previousProduct = products[productIndex];
      let updatedProduct = applyAdminId(normalizeProduct({
        ...payload,
        adminId: getRecordAdminId(previousProduct, requestAdminId),
      }, previousProduct), requestAdminId);
      updatedProduct = await validateProductPartnerSelections(updatedProduct);

      // Check for duplicate barcode (excluding current product being edited)
      const barcodeValue = String(updatedProduct.barcode ?? "").trim();
      if (barcodeValue) {
        const duplicateBarcode = products.find((p) =>
          isRecordInAdminScope(p, requestAdminId) &&
          String(p.barcode ?? "").trim() === barcodeValue &&
          p.id !== productId
        );
        if (duplicateBarcode) {
          throw new Error("Barcode already exists. Please use a different barcode.");
        }
      }

      updatedProduct = await syncProductVisualSearchFingerprint(
        updatedProduct,
        previousProduct,
      );
      products[productIndex] = updatedProduct;
      await writeProducts(products);
      await logActivitySafely(
        createProductActivityEntry(
          "updated",
          updatedProduct,
          payload?.__activityActor,
          previousProduct,
          payload,
        ),
      );
      const reviewAggregates = buildProductReviewAggregates(
        await readOrders(),
        requestAdminId,
      );
      sendJson(response, 200, {
        product: applyProductReviewAggregate(
          normalizeStoredProductRecord(updatedProduct),
          reviewAggregates,
        ),
        message: "Product updated.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : "Unable to update product.",
      });
    }
    return;
  }

  if (request.method === "PATCH") {
    try {
      const payload = await parseRequestBody(request);
      const products = await readProducts();
      const productIndex = products.findIndex((product) =>
        product.id === productId && isRecordInAdminScope(product, requestAdminId)
      );

      if (productIndex === -1) {
        sendJson(response, 404, { message: "Product not found." });
        return;
      }

      if (!Object.prototype.hasOwnProperty.call(payload ?? {}, "isActive")) {
        sendJson(response, 400, { message: "Product active state is required." });
        return;
      }

      const previousProduct = products[productIndex];
      if (isProductPendingApproval(previousProduct)) {
        sendJson(response, 409, {
          message: "This product is still pending super admin approval.",
        });
        return;
      }

      const normalizedVisibilityProduct = normalizeProduct({
        ...previousProduct,
        adminId: getRecordAdminId(previousProduct, requestAdminId),
        stock: getNormalizedProductInventoryStock(previousProduct, 0),
        isActive: normalizeProductActiveState(payload?.isActive, true),
      }, previousProduct);
      const updatedProduct = applyAdminId({
        ...normalizedVisibilityProduct,
        approvalStatus: normalizeProductApprovalStatus(
          previousProduct?.approvalStatus,
          PRODUCT_APPROVAL_APPROVED,
        ),
        submittedAt: normalizeOptionalProductDateTime(previousProduct?.submittedAt),
        approvedAt: normalizeOptionalProductDateTime(previousProduct?.approvedAt),
        approvedBy: String(previousProduct?.approvedBy ?? "").trim(),
        approvalUpdatedAt: normalizeOptionalProductDateTime(
          previousProduct?.approvalUpdatedAt,
        ),
      }, requestAdminId);
      products[productIndex] = updatedProduct;
      await writeProducts(products);
      await logActivitySafely(
        createProductActivityEntry(
          "updated",
          updatedProduct,
          payload?.__activityActor,
          previousProduct,
          payload,
        ),
      );
      const reviewAggregates = buildProductReviewAggregates(
        await readOrders(),
        requestAdminId,
      );
      sendJson(response, 200, {
        product: applyProductReviewAggregate(
          normalizeStoredProductRecord(updatedProduct),
          reviewAggregates,
        ),
        message: "Product visibility updated.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message:
          error instanceof Error ? error.message : "Unable to update product visibility.",
      });
    }
    return;
  }

  sendJson(response, 405, { message: "Method not allowed." });
}

function hasPartnerActiveStatePayload(payload) {
  return [
    "isActive",
    "enabled",
    "isEnabled",
    "status",
    "disabled",
  ].some((key) => Object.prototype.hasOwnProperty.call(payload ?? {}, key));
}

function getPartnerActiveStateFromPayload(payload) {
  if (Object.prototype.hasOwnProperty.call(payload ?? {}, "disabled")) {
    return !normalizePartnerEnabledState({ enabled: payload.disabled });
  }
  if (Object.prototype.hasOwnProperty.call(payload ?? {}, "isActive")) {
    return normalizePartnerEnabledState({ enabled: payload.isActive });
  }
  if (Object.prototype.hasOwnProperty.call(payload ?? {}, "enabled")) {
    return normalizePartnerEnabledState({ enabled: payload.enabled });
  }
  if (Object.prototype.hasOwnProperty.call(payload ?? {}, "isEnabled")) {
    return normalizePartnerEnabledState({ enabled: payload.isEnabled });
  }
  return normalizePartnerEnabledState({ status: payload?.status });
}

function applyPartnerActiveState(partner, payload) {
  const isActive = getPartnerActiveStateFromPayload(payload);
  return {
    ...partner,
    isActive,
    enabled: isActive,
    isEnabled: isActive,
    disabled: !isActive,
    status: isActive ? "active" : "inactive",
    updatedAt: new Date().toISOString(),
  };
}

async function handleSingleDeliveryPartnerApi(request, response, partnerId) {
  const requestUrl = new URL(request.url, `http://127.0.0.1:${PORT}`);
  const requestAdminId = getRequestAdminId(request, requestUrl);
  const requestIsSuperAdmin = isSuperAdminAuthorized(request);

  if (request.method === "DELETE") {
    try {
      const partners = await readDeliveryPartners();
      const targetPartner = partners.find(
        (partner) =>
          String(partner.id ?? "").trim() === partnerId &&
          (requestIsSuperAdmin || isRecordInAdminScope(partner, requestAdminId)),
      );

      if (!targetPartner) {
        sendJson(response, 404, { message: "Delivery partner not found." });
        return;
      }

      const nextPartners = partners.filter(
        (partner) =>
          !(
            String(partner.id ?? "").trim() === partnerId &&
            (requestIsSuperAdmin || isRecordInAdminScope(partner, requestAdminId))
          ),
      );
      await writeDeliveryPartners(nextPartners);
      sendJson(response, 200, {
        deletedId: partnerId,
        message: "Delivery partner deleted.",
      });
    } catch (error) {
      sendJson(response, 500, {
        message:
          error instanceof Error
            ? error.message
            : "Unable to delete delivery partner.",
      });
    }
    return;
  }

  if (request.method === "PATCH") {
    try {
      const payload = await parseRequestBody(request);
      if (!hasPartnerActiveStatePayload(payload)) {
        sendJson(response, 400, { message: "Delivery partner active state is required." });
        return;
      }

      const partners = await readDeliveryPartners();
      const partnerIndex = partners.findIndex(
        (partner) =>
          String(partner.id ?? "").trim() === partnerId &&
          (requestIsSuperAdmin || isRecordInAdminScope(partner, requestAdminId)),
      );

      if (partnerIndex === -1) {
        sendJson(response, 404, { message: "Delivery partner not found." });
        return;
      }

      const updatedPartner = applyPartnerActiveState(partners[partnerIndex], payload);
      partners[partnerIndex] = updatedPartner;
      await writeDeliveryPartners(partners);
      sendJson(response, 200, {
        partner: updatedPartner,
        message: `Delivery partner ${updatedPartner.isActive ? "activated" : "deactivated"}.`,
      });
    } catch (error) {
      sendJson(response, 400, {
        message:
          error instanceof Error
            ? error.message
            : "Unable to update delivery partner status.",
      });
    }
    return;
  }

  sendJson(response, 405, { message: "Method not allowed." });
}

async function handleSinglePaymentPartnerApi(request, response, partnerId) {
  const requestUrl = new URL(request.url, `http://127.0.0.1:${PORT}`);
  const requestAdminId = getRequestAdminId(request, requestUrl);
  const requestIsSuperAdmin = isSuperAdminAuthorized(request);

  if (request.method === "DELETE") {
    try {
      const partners = await readPaymentPartners();
      const targetPartner = partners.find(
        (partner) =>
          String(partner.id ?? "").trim() === partnerId &&
          (requestIsSuperAdmin || isRecordInAdminScope(partner, requestAdminId)),
      );

      if (!targetPartner) {
        sendJson(response, 404, { message: "Payment partner not found." });
        return;
      }

      const nextPartners = partners.filter(
        (partner) =>
          !(
            String(partner.id ?? "").trim() === partnerId &&
            (requestIsSuperAdmin || isRecordInAdminScope(partner, requestAdminId))
          ),
      );
      await writePaymentPartners(nextPartners);
      sendJson(response, 200, {
        deletedId: partnerId,
        message: "Payment partner deleted.",
      });
    } catch (error) {
      sendJson(response, 500, {
        message:
          error instanceof Error
            ? error.message
            : "Unable to delete payment partner.",
      });
    }
    return;
  }

  if (request.method === "PATCH") {
    try {
      const payload = await parseRequestBody(request);
      if (!hasPartnerActiveStatePayload(payload)) {
        sendJson(response, 400, { message: "Payment partner active state is required." });
        return;
      }

      const partners = await readPaymentPartners();
      const partnerIndex = partners.findIndex(
        (partner) =>
          String(partner.id ?? "").trim() === partnerId &&
          (requestIsSuperAdmin || isRecordInAdminScope(partner, requestAdminId)),
      );

      if (partnerIndex === -1) {
        sendJson(response, 404, { message: "Payment partner not found." });
        return;
      }

      const updatedPartner = applyPartnerActiveState(partners[partnerIndex], payload);
      partners[partnerIndex] = updatedPartner;
      await writePaymentPartners(partners);
      sendJson(response, 200, {
        partner: updatedPartner,
        message: `Payment partner ${updatedPartner.isActive ? "activated" : "deactivated"}.`,
      });
    } catch (error) {
      sendJson(response, 400, {
        message:
          error instanceof Error
            ? error.message
            : "Unable to update payment partner status.",
      });
    }
    return;
  }

  sendJson(response, 405, { message: "Method not allowed." });
}

async function serveStaticFile(request, requestPath, response) {
  const decodedPath = decodeURIComponent(requestPath);
  const safePath = decodedPath === "/" ? "/index.html" : decodedPath;
  const normalizedPath = path.normalize(safePath).replace(/^(\.\.[/\\])+/, "");
  const relativePath = normalizedPath.replace(/^[/\\]+/, "");
  const filePath = path.join(PUBLIC_DIR, relativePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendText(response, 403, "Forbidden");
    return;
  }

  try {
    const initialStat = await fsPromises.stat(filePath);
    const finalPath = initialStat.isDirectory()
      ? path.join(filePath, "index.html")
      : filePath;
    const stat = await fsPromises.stat(finalPath);
    const extension = path.extname(finalPath).toLowerCase();
    const contentType = MIME_TYPES[extension] ?? "application/octet-stream";
    const fileSize = stat.size;
    const isVideo = contentType.startsWith("video/");
    const rangeHeader = String(request.headers.range ?? "").trim();

    setCorsHeaders(response);

    if (isVideo) {
      response.setHeader("Accept-Ranges", "bytes");
    }

    if (isVideo && rangeHeader.startsWith("bytes=")) {
      const [startPart, endPart] = rangeHeader.replace("bytes=", "").split("-");
      const parsedStart = Number.parseInt(startPart, 10);
      const parsedEnd = Number.parseInt(endPart, 10);
      const start = Number.isFinite(parsedStart) ? parsedStart : 0;
      const end = Number.isFinite(parsedEnd) ? parsedEnd : fileSize - 1;

      if (
        start < 0 ||
        end < start ||
        start >= fileSize ||
        end >= fileSize
      ) {
        response.writeHead(416, {
          "Content-Range": `bytes */${fileSize}`,
        });
        response.end();
        return;
      }

      response.writeHead(206, {
        "Content-Type": contentType,
        "Content-Length": end - start + 1,
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      });
      fs.createReadStream(finalPath, { start, end }).pipe(response);
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": fileSize,
    });
    fs.createReadStream(finalPath).pipe(response);
  } catch (error) {
    sendText(response, 404, "Not Found");
  }
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "OPTIONS") {
    setCorsHeaders(response);
    response.writeHead(204);
    response.end();
    return;
  }

  if (requestUrl.pathname === "/health") {
    sendJson(response, 200, {
      status: "ok",
      message: "GMS Shopping backend is running.",
    });
    return;
  }

  if (requestUrl.pathname === "/api/admin-login") {
    await handleAdminLoginApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/admin-presence") {
    await handleAdminPresenceApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/accounts/login") {
    await handleAppUserLoginApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/admin-account") {
    await handleAdminAccountApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/admin-register") {
    await handleAdminRegisterApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/super-admin-login") {
    await handleSuperAdminLoginApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/super-admin/admins") {
    await handleSuperAdminAdminsApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/super-admin/categories") {
    await handleSuperAdminCategoriesApi(request, response, requestUrl);
    return;
  }

  if (requestUrl.pathname === "/api/super-admin/store-types") {
    await handleSuperAdminStoreTypesApi(request, response, requestUrl);
    return;
  }

  if (requestUrl.pathname === "/api/super-admin/product-requests") {
    await handleSuperAdminProductRequestsApi(request, response);
    return;
  }

  const superAdminAdminActionMatch = requestUrl.pathname.match(
    /^\/api\/super-admin\/admins\/([^/]+)\/action$/,
  );
  if (superAdminAdminActionMatch) {
    await handleSuperAdminAdminActionApi(
      request,
      response,
      decodeURIComponent(superAdminAdminActionMatch[1] ?? ""),
    );
    return;
  }

  const superAdminProductApproveMatch = requestUrl.pathname.match(
    /^\/api\/super-admin\/products\/([^/]+)\/approve$/,
  );
  if (superAdminProductApproveMatch) {
    await handleSuperAdminProductApproveApi(
      request,
      response,
      decodeURIComponent(superAdminProductApproveMatch[1] ?? ""),
    );
    return;
  }

  const superAdminProductCancelMatch = requestUrl.pathname.match(
    /^\/api\/super-admin\/products\/([^/]+)\/cancel$/,
  );
  if (superAdminProductCancelMatch) {
    await handleSuperAdminProductCancelApi(
      request,
      response,
      decodeURIComponent(superAdminProductCancelMatch[1] ?? ""),
    );
    return;
  }

  const superAdminClearDataMatch = requestUrl.pathname.match(
    /^\/api\/super-admin\/admins\/([^/]+)\/data$/,
  );
  if (superAdminClearDataMatch) {
    await handleSuperAdminClearAdminDataApi(
      request,
      response,
      decodeURIComponent(superAdminClearDataMatch[1] ?? ""),
    );
    return;
  }

  if (requestUrl.pathname === "/api/products") {
    await handleProductsApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/products/visual-search") {
    await handleProductVisualSearchApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/product-reviews/reply") {
    await handleProductReviewReplyApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/sellers") {
    await handleSellersApi(request, response);
    return;
  }

  // Seller follower endpoints
  const sellerFollowMatch = requestUrl.pathname.match(/^\/api\/sellers\/([^/]+)\/follow$/);
  if (sellerFollowMatch) {
    await handleSellerFollowApi(request, response, decodeURIComponent(sellerFollowMatch[1] ?? ""));
    return;
  }

  const sellerUnfollowMatch = requestUrl.pathname.match(/^\/api\/sellers\/([^/]+)\/unfollow$/);
  if (sellerUnfollowMatch) {
    await handleSellerUnfollowApi(request, response, decodeURIComponent(sellerUnfollowMatch[1] ?? ""));
    return;
  }

  const sellerFollowersCountMatch = requestUrl.pathname.match(/^\/api\/sellers\/([^/]+)\/followers-count$/);
  if (sellerFollowersCountMatch) {
    await handleSellerFollowersCountApi(request, response, decodeURIComponent(sellerFollowersCountMatch[1] ?? ""));
    return;
  }

  const superAdminFollowersCountMatch = requestUrl.pathname.match(/^\/api\/super-admin\/([^/]+)\/followers-count$/);
  if (superAdminFollowersCountMatch) {
    await handleSuperAdminFollowersCountApi(request, response, decodeURIComponent(superAdminFollowersCountMatch[1] ?? ""));
    return;
  }

  const sellerIsFollowedMatch = requestUrl.pathname.match(/^\/api\/sellers\/([^/]+)\/is-followed$/);
  if (sellerIsFollowedMatch) {
    await handleSellerIsFollowedApi(request, response, decodeURIComponent(sellerIsFollowedMatch[1] ?? ""));
    return;
  }

  if (requestUrl.pathname === "/api/seller-followers/overview") {
    await handleSellerFollowersOverviewApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/admin-followers-count") {
    await handleAdminFollowersCountApi(request, response);
    return;
  }

  const sellerProfileMatch = requestUrl.pathname.match(/^\/api\/sellers\/([^/]+)\/profile$/);
  if (sellerProfileMatch) {
    await handleSellerProfileApi(request, response, decodeURIComponent(sellerProfileMatch[1] ?? ""));
    return;
  }

  if (requestUrl.pathname === "/api/delivery-partners") {
    await handleDeliveryPartnersApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/payment-partners") {
    await handlePaymentPartnersApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/orders") {
    await handleOrdersApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/accounts") {
    await handleAccountsApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/employee-lookup") {
    await handleEmployeeLookupApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/employee-login") {
    await handleEmployeeLoginApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/categories") {
    await handleCategoriesApi(request, response, requestUrl);
    return;
  }

  if (requestUrl.pathname === "/api/store-types") {
    await handleStoreTypesApi(request, response);
    return;
  }

  // Super admin: get products by company (adminId)
  const superAdminProductsMatch = requestUrl.pathname.match(/^\/api\/super-admin\/products\/([^/]+)$/);
  if (superAdminProductsMatch) {
    await handleSuperAdminProductsApi(request, response, superAdminProductsMatch[1]);
    return;
  }

  if (requestUrl.pathname === "/api/chat-support") {
    await handleChatSupportApi(request, response, requestUrl);
    return;
  }

  if (requestUrl.pathname === "/api/activity") {
    await handleActivityApi(request, response, requestUrl);
    return;
  }

  if (requestUrl.pathname === "/api/uploads") {
    await handleUploadApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/review-uploads") {
    await handleUploadApi(request, response, { reviewMedia: true });
    return;
  }

  if (requestUrl.pathname === "/api/product-models/from-frames") {
    await handleProductModelFromFramesApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/product-models/from-scan") {
    await handleProductModelFromScanApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/document-uploads") {
    await handleDocumentUploadApi(request, response);
    return;
  }

  if (requestUrl.pathname.startsWith("/api/products/")) {
    const productId = requestUrl.pathname.replace("/api/products/", "").trim();
    await handleSingleProductApi(request, response, productId);
    return;
  }

  if (requestUrl.pathname.startsWith("/api/delivery-partners/")) {
    const partnerId = requestUrl.pathname
      .replace("/api/delivery-partners/", "")
      .trim();
    await handleSingleDeliveryPartnerApi(request, response, partnerId);
    return;
  }

  if (requestUrl.pathname.startsWith("/api/payment-partners/")) {
    const partnerId = requestUrl.pathname
      .replace("/api/payment-partners/", "")
      .trim();
    await handleSinglePaymentPartnerApi(request, response, partnerId);
    return;
  }

  if (requestUrl.pathname.startsWith("/api/orders/")) {
    const orderPathParts = requestUrl.pathname.split("/").filter(Boolean);
    const createdAtEpochMs = orderPathParts[2] ?? "";
    const action = orderPathParts[3] ?? "";
    const actionDetail = orderPathParts[4] ?? "";

    if (action === "pack") {
      await handlePackOrderGroupApi(request, response, createdAtEpochMs);
      return;
    }

    if (action === "ship") {
      await handleShipOrderGroupApi(request, response, createdAtEpochMs);
      return;
    }

    if (action === "cancel") {
      await handleCancelOrderGroupApi(request, response, createdAtEpochMs);
      return;
    }

    if (action === "cancel-request") {
      await handleCancelOrderRequestDecisionApi(
        request,
        response,
        createdAtEpochMs,
        actionDetail,
      );
      return;
    }
  }

  if (requestUrl.pathname.startsWith("/api/chat-support/")) {
    const pathParts = requestUrl.pathname.split("/").filter(Boolean);
    const threadId = pathParts[2] ?? "";
    const action = pathParts[3] ?? "";
    await handleSingleChatSupportApi(request, response, threadId, action);
    return;
  }

  await serveStaticFile(request, requestUrl.pathname, response);
});

ensureStoragePaths()
  .then(async () => {
    const migratedLegacyGallery = await migrateProductsForImageGallery();

    if (migratedLegacyGallery) {
      console.log("Legacy product image galleries were migrated.");
    }

    if (!CHAT_AI_API_KEY) {
      console.log(CHAT_AI_ENV_HINT);
    } else {
      console.log(`Chat AI enabled with model: ${CHAT_AI_MODEL}`);
    }
  })
  .then(() => {
    server.listen(PORT, () => {
      console.log("GMS Shopping backend running at:");
      for (const url of getServerUrls()) {
        console.log(`- ${url}`);
      }
    });
  })
  .catch((error) => {
    console.error("Failed to start backend:", error);
    process.exitCode = 1;
  });
