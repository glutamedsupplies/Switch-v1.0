"use strict";

const path = require("path");
const crypto = require("crypto");
const fsPromises = require("fs/promises");
const voucherRules = require("./voucherRules");

const VOUCHER_KINDS = new Set([
  "percent",
  "gift",
  "shipping",
  "shopping",
  "loyalty",
  "ticket",
]);
const VOUCHER_STATUSES = new Set([
  "draft",
  "scheduled",
  "active",
  "paused",
  "expired",
  "fully_redeemed",
  "budget_exhausted",
  "cancelled",
  "inactive",
  "used",
]);
const VOUCHER_ACTIONS = new Set(["useNow", "apply", "used", "expired"]);
const VOUCHER_DISCOUNT_TYPES = new Set(["percent", "fixed"]);
const USED_EXPIRED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const PLATFORM_ID_ALL = "all";

const DEFAULT_VOUCHERS = [
  {
    id: "voucher-226c2885c41ee42e",
    status: "active",
    kind: "percent",
    discountType: "percent",
    discountValue: "20",
    freeShipping: true,
    title: "Limited Time",
    subtitle: "20% of total purchase · Free shipping",
    minimumSpend: "99",
    code: "20THANIV",
    badge: "Jolibee",
    date: "Dec 14, 2026 11:59 PM",
    startDate: "Sep 26, 2026 12:00 AM",
    action: "useNow",
    note: "A deal\nfor you!",
    platformId: "all",
    sellerAdminId: "acct-1788607583538",
    createdAt: "2026-09-16T10:04:35.247Z",
    updatedAt: "2026-09-26T06:55:02.821Z",
  },
  {
    id: "voucher-a65e82c99654312c",
    status: "active",
    kind: "percent",
    discountType: "percent",
    discountValue: "20",
    title: "NEW SWITCH",
    subtitle: "20% of total purchase",
    minimumSpend: "199",
    code: "FASION20",
    badge: "Jolibee",
    date: "Dec 31, 2026",
    startDate: "Sep 15, 2026 12:00 AM",
    action: "useNow",
    note: "A deal\nfor you!",
    platformId: "all",
    sellerAdminId: "acct-1788607583538",
    createdAt: "2026-09-15T04:16:54.539Z",
    updatedAt: "2026-09-15T04:16:54.539Z",
  },
  {
    id: "voucher-store-resto-lunch15",
    status: "active",
    kind: "percent",
    discountType: "percent",
    discountValue: "15",
    title: "15% OFF Lunch",
    subtitle: "15% of total purchase",
    minimumSpend: "250",
    code: "LUNCH15",
    badge: "Store voucher",
    date: "Nov 30, 2026 11:59 PM",
    startDate: "Sep 20, 2026 12:00 AM",
    action: "useNow",
    note: "Dine in or takeout.\nValid this month!",
    platformId: "all",
    sellerAdminId: "rank-mock-restaurants-acct-01",
    createdAt: "2026-09-20T02:10:00.000Z",
    updatedAt: "2026-09-20T02:10:00.000Z",
  },
  {
    id: "voucher-store-hotel-stay100",
    status: "active",
    kind: "gift",
    discountType: "fixed",
    discountValue: "100",
    title: "₱100 OFF Stay",
    subtitle: "₱100 off total purchase",
    minimumSpend: "1500",
    code: "STAY100",
    badge: "Store voucher",
    date: "Dec 20, 2026 11:59 PM",
    startDate: "Sep 18, 2026 12:00 AM",
    action: "useNow",
    note: "Book a room.\nSave on stay!",
    platformId: "all",
    sellerAdminId: "rank-mock-hotels-restaurant-acct-01",
    createdAt: "2026-09-18T08:00:00.000Z",
    updatedAt: "2026-09-18T08:00:00.000Z",
  },
  {
    id: "voucher-store-resto-used",
    status: "used",
    kind: "loyalty",
    discountType: "percent",
    discountValue: "10",
    title: "First Order 10%",
    subtitle: "10% of total purchase",
    minimumSpend: "180",
    code: "FIRSTBITE",
    badge: "Store voucher",
    date: "Oct 15, 2026",
    startDate: "Aug 01, 2026 12:00 AM",
    action: "used",
    note: "Thanks for\nyour first order!",
    platformId: "all",
    sellerAdminId: "rank-mock-restaurants-acct-01",
    usedByUserIds: ["buyer-mock-01"],
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-09-12T00:00:00.000Z",
    statusAt: "2026-09-12T00:00:00.000Z",
  },
  {
    id: "voucher-store-jollibee-expired",
    status: "expired",
    kind: "ticket",
    discountType: "fixed",
    discountValue: "50",
    title: "₱50 OFF Bucket",
    subtitle: "₱50 off total purchase",
    minimumSpend: "399",
    code: "BUCKET50",
    badge: "Jolibee",
    date: "Aug 20, 2026",
    startDate: "Jul 01, 2026 12:00 AM",
    action: "expired",
    note: "Family meal\ndeal ended.",
    platformId: "all",
    sellerAdminId: "acct-1788607583538",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-08-20T00:00:00.000Z",
    statusAt: "2026-08-20T00:00:00.000Z",
  },
  {
    id: "voucher-sa-fashion20",
    status: "active",
    kind: "percent",
    discountType: "percent",
    discountValue: "20",
    title: "20% OFF",
    subtitle: "20% of total purchase",
    minimumSpend: "500",
    code: "FASHION20",
    badge: "Sitewide",
    date: "Dec 31, 2026 11:59 PM",
    startDate: "Jan 01, 2026 12:00 AM",
    action: "useNow",
    note: "Look good.\nSpend less!",
    platformId: "shop",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "voucher-sa-welcome100",
    status: "active",
    kind: "gift",
    discountType: "fixed",
    discountValue: "100",
    title: "₱100 OFF",
    subtitle: "₱100 off total purchase",
    minimumSpend: "300",
    code: "WELCOME100",
    badge: "New Users Only",
    date: "Nov 30, 2026 11:59 PM",
    startDate: "Jan 02, 2026 12:00 AM",
    action: "apply",
    note: "A little happiness\nfor you!",
    platformId: "shop",
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
  {
    id: "voucher-sa-freeship",
    status: "active",
    kind: "shipping",
    discountType: "percent",
    discountValue: "",
    freeShipping: true,
    title: "Free Shipping",
    subtitle: "Free shipping on total purchase",
    minimumSpend: "249",
    code: "FREESHIP",
    badge: "Sitewide",
    date: "Dec 15, 2026 11:59 PM",
    startDate: "Jan 03, 2026 12:00 AM",
    action: "useNow",
    note: "Shop more.\nWorry less!",
    platformId: "shop",
    createdAt: "2026-01-03T00:00:00.000Z",
    updatedAt: "2026-01-03T00:00:00.000Z",
  },
  {
    id: "voucher-sa-b1g1",
    status: "active",
    kind: "shopping",
    discountType: "percent",
    discountValue: "10",
    title: "Buy 1 Get 1",
    subtitle: "on selected items",
    minimumSpend: "299",
    code: "B1G1SPECIAL",
    badge: "Limited Time",
    date: "Nov 25, 2026 11:59 PM",
    startDate: "Jan 04, 2026 12:00 AM",
    action: "useNow",
    note: "More to love\nfor less!",
    platformId: "food",
    createdAt: "2026-01-04T00:00:00.000Z",
    updatedAt: "2026-01-04T00:00:00.000Z",
  },
  {
    id: "voucher-sa-grocery12",
    status: "active",
    kind: "percent",
    discountType: "percent",
    discountValue: "12",
    title: "12% OFF Groceries",
    subtitle: "12% of total purchase",
    minimumSpend: "800",
    code: "GROCERY12",
    badge: "Sitewide",
    date: "Dec 10, 2026 11:59 PM",
    startDate: "Sep 01, 2026 12:00 AM",
    action: "useNow",
    note: "Fill the cart.\nSave more!",
    platformId: "groceries",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "voucher-sa-hotel80",
    status: "active",
    kind: "gift",
    discountType: "fixed",
    discountValue: "80",
    title: "₱80 OFF Hotels",
    subtitle: "₱80 off total purchase",
    minimumSpend: "1200",
    code: "HOTEL80",
    badge: "Sitewide",
    date: "Dec 28, 2026 11:59 PM",
    startDate: "Sep 05, 2026 12:00 AM",
    action: "useNow",
    note: "Book now.\nTravel light!",
    platformId: "hotels",
    createdAt: "2026-09-05T00:00:00.000Z",
    updatedAt: "2026-09-05T00:00:00.000Z",
  },
  {
    id: "voucher-sa-newuser",
    status: "active",
    kind: "gift",
    discountType: "fixed",
    discountValue: "150",
    title: "New User ₱150",
    subtitle: "₱150 off total purchase",
    minimumSpend: "199",
    code: "NEWUSER",
    badge: "First Gift",
    date: "Dec 31, 2026",
    startDate: "Sep 13, 2026 12:00 AM",
    action: "useNow",
    note: "Welcome to Switch.\nSpend less!",
    platformId: "all",
    createdAt: "2026-09-13T09:45:34.967Z",
    updatedAt: "2026-09-13T09:45:34.967Z",
  },
  {
    id: "voucher-sa-cod123",
    status: "active",
    kind: "percent",
    discountType: "percent",
    discountValue: "20",
    title: "20% OFF Design",
    subtitle: "20% of total purchase",
    minimumSpend: "200",
    code: "COD123",
    badge: "Sitewide",
    date: "Dec 31, 2026",
    startDate: "Sep 13, 2026 12:00 AM",
    action: "useNow",
    note: "Look good.\nSpend less!",
    platformId: "shop",
    createdAt: "2026-09-13T09:51:12.651Z",
    updatedAt: "2026-09-13T09:51:12.651Z",
  },
  {
    id: "voucher-sa-thankyou10",
    status: "used",
    kind: "loyalty",
    discountType: "percent",
    discountValue: "10",
    title: "10% OFF",
    subtitle: "10% of total purchase",
    minimumSpend: "200",
    code: "THANKYOU10",
    badge: "Order Reward",
    date: "Sep 02, 2026",
    startDate: "Dec 01, 2025 12:00 AM",
    action: "used",
    note: "Thanks for\nshopping!",
    platformId: "shop",
    usedByUserIds: ["buyer-mock-02"],
    createdAt: "2025-12-01T00:00:00.000Z",
    updatedAt: "2026-09-02T00:00:00.000Z",
    statusAt: "2026-09-02T00:00:00.000Z",
  },
  {
    id: "voucher-sa-save50",
    status: "expired",
    kind: "ticket",
    discountType: "fixed",
    discountValue: "50",
    title: "₱50 OFF",
    subtitle: "₱50 off total purchase",
    minimumSpend: "250",
    code: "SAVE50",
    badge: "Sitewide",
    date: "Aug 31, 2026",
    startDate: "Nov 01, 2025 12:00 AM",
    action: "expired",
    note: "A deal for\nevery cart!",
    platformId: "shop",
    createdAt: "2025-11-01T00:00:00.000Z",
    updatedAt: "2026-08-31T00:00:00.000Z",
    statusAt: "2026-08-31T00:00:00.000Z",
  },
];

function createVouchersApi(deps) {
  const {
    DATA_DIR,
    ensureStoragePaths,
    writeJsonFileAtomically,
    requireSuperAdmin,
    getRequestAdminId,
    getExplicitRequestAdminId,
    normalizeAdminTenantId,
    isUsableProductAdminScope,
    readAccounts,
    findAdminAccountByScopeId,
    findCompanyById,
    readStoreTypes,
    readProducts,
    requireAdminRestrictionAllowed,
    persistSuperAdminNotification,
    createPersistentLinkedNotification,
    logActivitySafely,
    notifySellerAdminInboxByAdminId,
    sendJson,
    parseRequestBody,
    getRequestAccountIdentifier,
  } = deps;

  const VOUCHERS_FILE = path.join(DATA_DIR, "vouchers.json");
  const SCHEDULES_FILE = path.join(DATA_DIR, "voucher-schedules.json");
  let voucherMutationTail = Promise.resolve();
  function enqueueVoucherMutation(work) {
    const run = voucherMutationTail.then(work, work);
    voucherMutationTail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
  const STORE_TYPES_FILE = path.join(DATA_DIR, "store_types.json");
  const PLATFORMS_FILE = path.join(DATA_DIR, "platforms.json");
  const normalizeTenantId =
    typeof normalizeAdminTenantId === "function"
      ? normalizeAdminTenantId
      : (value, fallback = "") => {
          const normalized = String(value ?? "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9._-]+/g, "-")
            .replace(/^-+|-+$/g, "");
          return normalized || fallback;
        };

  function nowIso() {
    return new Date().toISOString();
  }

  function newId() {
    return `voucher-${crypto.randomBytes(8).toString("hex")}`;
  }

  function newScheduleId() {
    return `schedule-${crypto.randomBytes(8).toString("hex")}`;
  }

  function isUpcomingStartDate(startDate) {
    const startMs = startDate
      ? displayDateTimeMs(startDate, { endOfDay: false })
      : null;
    return Boolean(startMs && startMs > Date.now());
  }

  function voucherExpireMs(voucher) {
    const raw = String(voucher?.date ?? "").trim();
    if (!raw) return null;
    const expireHasTime = /:\d{2}\s*[AP]M$/i.test(raw);
    return displayDateTimeMs(raw, { endOfDay: !expireHasTime });
  }

  function isComingSoonVoucher(voucher) {
    const status = String(voucher?.status || "").trim().toLowerCase();
    if (status === "expired" || status === "used") return false;
    if (isPastExpiryDate(voucher?.date)) return false;
    return isUpcomingStartDate(voucher?.startDate);
  }

  function isEndingSoonVoucher(voucher, now = Date.now()) {
    const status = String(voucher?.status || "").trim().toLowerCase();
    if (status === "expired" || status === "used") return false;
    if (isUpcomingStartDate(voucher?.startDate)) return false;
    const expireMs = voucherExpireMs(voucher);
    if (!expireMs || expireMs <= now) return false;
    return expireMs - now <= 7 * 24 * 60 * 60 * 1000;
  }

  const WEEKDAY_KEYS = Object.freeze([
    "sun",
    "mon",
    "tue",
    "wed",
    "thu",
    "fri",
    "sat",
  ]);
  const WEEKDAY_ALIASES = Object.freeze({
    sunday: "sun",
    monday: "mon",
    tuesday: "tue",
    wednesday: "wed",
    thursday: "thu",
    thurs: "thu",
    friday: "fri",
    saturday: "sat",
  });

  function weekdayKeyFromLabel(value) {
    const raw = String(value ?? "")
      .trim()
      .toLowerCase();
    if (!raw) return "";
    if (WEEKDAY_KEYS.includes(raw)) return raw;
    const short = raw.slice(0, 3);
    if (WEEKDAY_KEYS.includes(short)) return short;
    return WEEKDAY_ALIASES[raw] || "";
  }

  function normalizeRepeatDays(value) {
    const list = Array.isArray(value)
      ? value
      : String(value || "")
          .split(/[,\s]+/)
          .filter(Boolean);
    const picked = new Set();
    for (const entry of list) {
      const key = weekdayKeyFromLabel(entry);
      if (key) picked.add(key);
    }
    return WEEKDAY_KEYS.filter((day) => picked.has(day));
  }

  function normalizeRepeatTime(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    const hm = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (hm) {
      const hours = Number(hm[1]);
      const minutes = Number(hm[2]);
      if (
        Number.isInteger(hours) &&
        Number.isInteger(minutes) &&
        hours >= 0 &&
        hours <= 23 &&
        minutes >= 0 &&
        minutes <= 59
      ) {
        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      }
    }
    const ampm = raw.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
    if (ampm) {
      const hours =
        (Number(ampm[1]) % 12) + (ampm[3].toUpperCase() === "PM" ? 12 : 0);
      const minutes = Number(ampm[2]);
      if (
        Number.isInteger(hours) &&
        Number.isInteger(minutes) &&
        hours >= 0 &&
        hours <= 23 &&
        minutes >= 0 &&
        minutes <= 59
      ) {
        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      }
    }
    return "";
  }

  function parseRepeatTime(value) {
    const normalized = normalizeRepeatTime(value);
    if (!normalized) return null;
    const [hours, minutes] = normalized.split(":").map(Number);
    return { hours, minutes };
  }

  function addCalendarDay(parts, amount = 1) {
    if (!parts) return null;
    const utc = Date.UTC(parts.year, parts.month - 1, parts.day + amount);
    const next = new Date(utc);
    return {
      year: next.getUTCFullYear(),
      month: next.getUTCMonth() + 1,
      day: next.getUTCDate(),
    };
  }

  function manilaClockParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const read = (type) =>
      parts.find((part) => part.type === type)?.value || "";
    const weekday = weekdayKeyFromLabel(read("weekday"));
    const year = Number(read("year"));
    const month = Number(read("month"));
    const day = Number(read("day"));
    const hours = Number(read("hour"));
    const minutes = Number(read("minute"));
    if (!weekday || !year || !month || !day) return null;
    return { weekday, year, month, day, hours, minutes };
  }

  function isRepeatWeeklyVoucher(voucher) {
    return Boolean(voucher?.repeatWeekly);
  }

  function repeatWindowOnDay(parts, startHm, endHm) {
    if (!parts || !startHm || !endHm) return null;
    const startMs = manilaLocalMs(
      parts.year,
      parts.month,
      parts.day,
      startHm.hours,
      startHm.minutes,
    );
    const wraps = startHm.hours * 60 + startHm.minutes >= endHm.hours * 60 + endHm.minutes;
    const endParts = wraps ? addCalendarDay(parts, 1) : parts;
    const endMs = manilaLocalMs(
      endParts.year,
      endParts.month,
      endParts.day,
      endHm.hours,
      endHm.minutes,
    );
    if (startMs == null || endMs == null) return null;
    return { startMs, endMs };
  }

  function resolveRepeatWindow(voucher, now = Date.now()) {
    if (!isRepeatWeeklyVoucher(voucher)) return null;
    const days = normalizeRepeatDays(voucher.repeatDays);
    const startHm = parseRepeatTime(voucher.repeatStartTime);
    const endHm = parseRepeatTime(voucher.repeatEndTime) || { hours: 0, minutes: 0 };
    if (!days.length || !startHm) return null;
    const clock = manilaClockParts(new Date(now));
    if (!clock) return null;
    let cursor = { year: clock.year, month: clock.month, day: clock.day };
    let weekdayIndex = WEEKDAY_KEYS.indexOf(clock.weekday);
    let open = null;
    let next = null;
    for (let offset = -1; offset <= 8; offset += 1) {
      const dayKey = WEEKDAY_KEYS[(weekdayIndex + offset + 70) % 7];
      const dayParts = addCalendarDay(cursor, offset);
      if (!days.includes(dayKey) || !dayParts) continue;
      const window = repeatWindowOnDay(dayParts, startHm, endHm);
      if (!window) continue;
      if (now >= window.startMs && now < window.endMs) {
        open = window;
        break;
      }
      if (!next && window.startMs > now) next = window;
    }
    if (open) return { open: true, startMs: open.startMs, endMs: open.endMs };
    if (next) return { open: false, startMs: next.startMs, endMs: next.endMs };
    return { open: false, startMs: 0, endMs: 0 };
  }

  function isRepeatWindowOpen(voucher, now = Date.now()) {
    if (!isRepeatWeeklyVoucher(voucher)) return true;
    return Boolean(resolveRepeatWindow(voucher, now)?.open);
  }

  function voucherRecordKey(entry) {
    return String(entry?.id || entry?.scheduleId || "").trim();
  }

  function stripLiveId(entry, scheduleId = "") {
    const next = { ...(entry && typeof entry === "object" ? entry : {}) };
    delete next.id;
    return {
      ...next,
      id: "",
      scheduleId: String(scheduleId || next.scheduleId || newScheduleId()).trim(),
    };
  }

  function liveVoucherFromSchedule(schedule) {
    const stamp = nowIso();
    const { scheduleId: _scheduleId, ...rest } = schedule || {};
    return {
      ...normalizeVoucher({ ...rest, id: newId() }),
      createdAt: schedule?.createdAt || stamp,
      updatedAt: stamp,
    };
  }

  function normalizeTimeHm(value) {
    const match = String(value ?? "").trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return "";
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 23 || minutes > 59) {
      return "";
    }
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  function formatTime12(hours, minutes) {
    const hour12 = hours % 12 || 12;
    const period = hours >= 12 ? "PM" : "AM";
    return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
  }

  function normalizeCardColor(value) {
    const raw = String(value ?? "").trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(raw)) return raw;
    if (/^[0-9a-f]{6}$/.test(raw)) return `#${raw}`;
    return "";
  }

  function normalizeVoucherLogoUrl(value) {
    const raw = String(value ?? "").trim();
    if (!raw || raw.length > 500) return "";
    if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
    if (/^https?:\/\//i.test(raw)) return raw;
    return "";
  }

  function formatDisplayDate(value, timeValue) {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    const extraTime = normalizeTimeHm(timeValue);
    const displayMatch = raw.match(
      /^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*([AP]M))?$/i,
    );
    if (displayMatch) {
      const datePart = `${displayMatch[1]} ${displayMatch[2]}, ${displayMatch[3]}`;
      if (extraTime) {
        const [hours, minutes] = extraTime.split(":").map(Number);
        return `${datePart} ${formatTime12(hours, minutes)}`;
      }
      if (displayMatch[4] && displayMatch[6]) {
        const hours =
          (Number(displayMatch[4]) % 12) +
          (displayMatch[6].toUpperCase() === "PM" ? 12 : 0);
        return `${datePart} ${formatTime12(hours, Number(displayMatch[5]))}`;
      }
      return datePart;
    }
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw.slice(0, 48);
    const dateLabel = parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      timeZone: "Asia/Manila",
    });
    if (!extraTime) return dateLabel;
    const [hours, minutes] = extraTime.split(":").map(Number);
    return `${dateLabel} ${formatTime12(hours, minutes)}`;
  }

  const MONTH_INDEX_BY_SHORT = Object.freeze({
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  });

  function manilaCalendarParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const year = Number(parts.find((part) => part.type === "year")?.value);
    const month = Number(parts.find((part) => part.type === "month")?.value);
    const day = Number(parts.find((part) => part.type === "day")?.value);
    if (!year || !month || !day) return null;
    return { year, month, day };
  }

  function parseExpiryCalendarParts(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return null;
    const displayMatch = raw.match(
      /^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})(?:\s+\d{1,2}:\d{2}\s*[AP]M)?$/i,
    );
    if (displayMatch) {
      const monthIndex = MONTH_INDEX_BY_SHORT[displayMatch[1].toLowerCase()];
      const day = Number(displayMatch[2]);
      const year = Number(displayMatch[3]);
      if (monthIndex == null || !year || !day) return null;
      return { year, month: monthIndex + 1, day };
    }
    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return {
        year: Number(isoMatch[1]),
        month: Number(isoMatch[2]),
        day: Number(isoMatch[3]),
      };
    }
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    return manilaCalendarParts(parsed);
  }

  function compareCalendarParts(left, right) {
    if (!left || !right) return 0;
    if (left.year !== right.year) return left.year - right.year;
    if (left.month !== right.month) return left.month - right.month;
    return left.day - right.day;
  }

  function manilaLocalMs(year, month, day, hours, minutes) {
    const stamp = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00+08:00`;
    const ms = Date.parse(stamp);
    return Number.isNaN(ms) ? null : ms;
  }

  function displayDateTimeMs(value, { endOfDay = false } = {}) {
    const raw = String(value ?? "").trim();
    if (!raw) return null;
    const timedMatch = raw.match(
      /^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*([AP]M)$/i,
    );
    if (timedMatch) {
      const monthIndex = MONTH_INDEX_BY_SHORT[timedMatch[1].toLowerCase()];
      const day = Number(timedMatch[2]);
      const year = Number(timedMatch[3]);
      if (monthIndex == null || !year || !day) return null;
      const hours =
        (Number(timedMatch[4]) % 12) +
        (timedMatch[6].toUpperCase() === "PM" ? 12 : 0);
      return manilaLocalMs(year, monthIndex + 1, day, hours, Number(timedMatch[5]));
    }
    const parts = parseExpiryCalendarParts(raw);
    if (!parts) return null;
    return manilaLocalMs(
      parts.year,
      parts.month,
      parts.day,
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
    );
  }

  function isPastExpiryDate(dateValue, now = new Date()) {
    const raw = String(dateValue ?? "").trim();
    const timedMatch = raw.match(
      /^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*([AP]M)$/i,
    );
    if (timedMatch) {
      const monthIndex = MONTH_INDEX_BY_SHORT[timedMatch[1].toLowerCase()];
      const day = Number(timedMatch[2]);
      const year = Number(timedMatch[3]);
      if (monthIndex == null || !year || !day) return false;
      const hours =
        (Number(timedMatch[4]) % 12) +
        (timedMatch[6].toUpperCase() === "PM" ? 12 : 0);
      const expiryMs = manilaLocalMs(
        year,
        monthIndex + 1,
        day,
        hours,
        Number(timedMatch[5]),
      );
      return expiryMs != null && expiryMs <= now.getTime();
    }
    const expiry = parseExpiryCalendarParts(dateValue);
    const today = manilaCalendarParts(now);
    if (!expiry || !today) return false;
    return compareCalendarParts(expiry, today) < 0;
  }

  function applyExpiryLifecycle(vouchers, { stamp = nowIso() } = {}) {
    let changed = false;
    const next = (Array.isArray(vouchers) ? vouchers : []).map((voucher) => {
      if (!voucher || voucher.status !== "active") return voucher;
      if (isRepeatWeeklyVoucher(voucher) && !String(voucher.date || "").trim()) {
        return voucher;
      }
      if (!isPastExpiryDate(voucher.date)) return voucher;
      changed = true;
      return {
        ...voucher,
        status: "expired",
        action: "expired",
        updatedAt: stamp,
        statusAt: stamp,
      };
    });
    return { vouchers: next, changed };
  }

  function normalizeCode(value) {
    return String(value ?? "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "")
      .slice(0, 32);
  }

  function normalizeNote(value) {
    return String(value ?? "")
      .replace(/\r\n/g, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .trim()
      .slice(0, 80);
  }

  function normalizeMinimumSpend(value) {
    const digits = String(value ?? "")
      .replace(/[^\d.]/g, "")
      .replace(/(\..*)\./g, "$1");
    if (!digits) return "0";
    const amount = Number(digits);
    if (!Number.isFinite(amount) || amount < 0) return "0";
    return String(Math.round(amount));
  }

  function normalizeDiscountType(value, kindHint = "") {
    const raw = String(value ?? "")
      .trim()
      .toLowerCase();
    if (VOUCHER_DISCOUNT_TYPES.has(raw)) return raw;
    const kind = String(kindHint || "")
      .trim()
      .toLowerCase();
    if (kind === "gift" || kind === "fixed") return "fixed";
    return "percent";
  }

  function normalizeDiscountValue(value, discountType) {
    const digits = String(value ?? "")
      .replace(/[^\d.]/g, "")
      .replace(/(\..*)\./g, "$1");
    if (!digits) return "";
    const amount = Number(digits);
    if (!Number.isFinite(amount) || amount <= 0) return "";
    const rounded = Math.round(amount);
    if (discountType === "percent" && rounded > 100) {
      throw new Error("Percent of total purchase cannot exceed 100.");
    }
    return String(rounded);
  }

  function normalizeOptionalMoney(value) {
    const digits = String(value ?? "")
      .replace(/[^\d.]/g, "")
      .replace(/(\..*)\./g, "$1");
    if (!digits) return 0;
    const amount = Number(digits);
    if (!Number.isFinite(amount) || amount < 0) return 0;
    return Math.round(amount);
  }

  function normalizeOptionalCount(value) {
    return voucherRules.unlimitedOrCount(value);
  }

  function normalizeIdList(value, limit = 500) {
    return voucherRules.asIdList(value).slice(0, limit);
  }

  function normalizeCombinationRules(input = {}, existing = null) {
    const src =
      input?.combinationRules && typeof input.combinationRules === "object"
        ? input.combinationRules
        : existing?.combinationRules && typeof existing.combinationRules === "object"
          ? existing.combinationRules
          : {};
    const flag = (value, fallback) => {
      if (value === true || value === "yes" || value === "true" || value === "1") return true;
      if (value === false || value === "no" || value === "false" || value === "0") return false;
      return fallback;
    };
    return {
      combineFlashDeal: flag(
        src.combineFlashDeal ?? input.combineFlashDeal,
        false,
      ),
      combineSellerVoucher: flag(
        src.combineSellerVoucher ?? input.combineSellerVoucher,
        true,
      ),
      combinePlatformVoucher: flag(
        src.combinePlatformVoucher ?? input.combinePlatformVoucher,
        false,
      ),
      combineFreeShipping: flag(
        src.combineFreeShipping ?? input.combineFreeShipping,
        true,
      ),
      combineRewards: flag(src.combineRewards ?? input.combineRewards, true),
    };
  }

  function generateInternalCode() {
    return `SW${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  }

  function defaultDiscountSubtitle(discountType, discountValue) {
    if (discountType === "fixed") {
      return discountValue
        ? `₱${discountValue} off total purchase`
        : "Fixed amount off total purchase";
    }
    return discountValue
      ? `${discountValue}% of total purchase`
      : "Percent of total purchase";
  }

  function defaultDiscountTitle(discountType, discountValue, freeShipping = false) {
    if (discountValue) {
      return discountType === "fixed"
        ? `₱${discountValue} OFF`
        : `${discountValue}% OFF`;
    }
    if (freeShipping) return "Free Shipping";
    return "";
  }

  function normalizeAccountKey(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .slice(0, 160);
  }

  function normalizeUsedByUserIds(value) {
    if (!Array.isArray(value)) return [];
    const seen = new Set();
    const ids = [];
    for (const entry of value) {
      const id = normalizeAccountKey(entry);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
    return ids;
  }

  function normalizeUsedTimes(value, fallback = 0) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) return fallback;
    return Math.trunc(amount);
  }

  const DEFAULT_USES_PER_ACCOUNT = 1;
  const MAX_USES_PER_ACCOUNT = 99;

  function normalizeUsesPerAccount(value) {
    const amount = Math.trunc(Number(value));
    if (!Number.isFinite(amount) || amount < 1) return DEFAULT_USES_PER_ACCOUNT;
    return Math.min(amount, MAX_USES_PER_ACCOUNT);
  }

  function normalizeUsedByUserCounts(value, usedByUserIds = []) {
    const counts = {};
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [key, raw] of Object.entries(value)) {
        const id = normalizeAccountKey(key);
        const times = Math.trunc(Number(raw));
        if (!id || !Number.isFinite(times) || times < 1) continue;
        counts[id] = times;
      }
    }
    for (const id of normalizeUsedByUserIds(usedByUserIds)) {
      if (!counts[id]) counts[id] = 1;
    }
    return counts;
  }

  function usedTimesFromCounts(counts, fallback = 0) {
    const total = Object.values(counts || {}).reduce(
      (sum, amount) => sum + (Number(amount) || 0),
      0,
    );
    return Math.max(total, fallback);
  }

  function accountIdFromRequest(requestUrl) {
    return normalizeAccountKey(
      requestUrl?.searchParams?.get("accountId") ||
        requestUrl?.searchParams?.get("account") ||
        "",
    );
  }

  function normalizePlatformId(value, { required = false } = {}) {
    const raw = String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "")
      .slice(0, 40);
    if (!raw) {
      if (required) {
        throw new Error("Select a buyer platform for this voucher.");
      }
      return PLATFORM_ID_ALL;
    }
    if (raw === PLATFORM_ID_ALL) {
      return PLATFORM_ID_ALL;
    }
    return raw;
  }

  function normalizePlatformIdList(value) {
    const list = Array.isArray(value)
      ? value
      : String(value ?? "")
          .split(",")
          .filter(Boolean);
    const ids = [];
    for (const entry of list) {
      if (!String(entry ?? "").trim()) continue;
      const id = normalizePlatformId(entry);
      if (id === PLATFORM_ID_ALL) return [PLATFORM_ID_ALL];
      if (id && !ids.includes(id)) ids.push(id);
    }
    return ids;
  }

  function voucherPlatformIds(voucher) {
    const ids = normalizePlatformIdList(voucher?.platformIds);
    if (ids.length > 1) return ids;
    const scoped = normalizePlatformId(voucher?.platformId);
    return scoped && scoped !== PLATFORM_ID_ALL ? [scoped] : [];
  }

  function voucherAppliesToPlatform(voucher, platformId) {
    const wanted = normalizePlatformId(platformId);
    if (!wanted || wanted === PLATFORM_ID_ALL) return true;
    const scoped = voucherPlatformIds(voucher);
    return !scoped.length || scoped.includes(wanted);
  }

  function normalizeVoucher(input = {}, existing = null) {
    const statusRaw = String(input.status ?? existing?.status ?? "active")
      .trim()
      .toLowerCase();
    const status = VOUCHER_STATUSES.has(statusRaw) ? statusRaw : "active";
    const discountType = normalizeDiscountType(
      input.discountType ?? existing?.discountType,
      input.kind ?? existing?.kind,
    );
    const creating = !existing;
    const kindRaw = String(
      input.kind ??
        existing?.kind ??
        (discountType === "fixed" ? "gift" : "percent"),
    )
      .trim()
      .toLowerCase();
    const kind = VOUCHER_KINDS.has(kindRaw)
      ? kindRaw
      : discountType === "fixed"
        ? "gift"
        : "percent";
    let action = String(input.action ?? existing?.action ?? "").trim();
    if (!VOUCHER_ACTIONS.has(action)) {
      action =
        status === "active"
          ? "useNow"
          : status === "used"
            ? "used"
            : "expired";
    }

    const discountValue = normalizeDiscountValue(
      input.discountValue ?? existing?.discountValue ?? "",
      discountType,
    );
    const freeShipping = Boolean(
      input.freeShipping ??
        input.isFreeShipping ??
        existing?.freeShipping ??
        existing?.isFreeShipping ??
        kind === "shipping",
    );
    const derivedTitle = defaultDiscountTitle(
      discountType,
      discountValue,
      freeShipping,
    );
    const title = (
      String(input.title ?? existing?.title ?? "").trim() || derivedTitle
    ).slice(0, 48);
    const subtitleRaw = String(input.subtitle ?? existing?.subtitle ?? "").trim();
    const subtitle = (
      subtitleRaw || defaultDiscountSubtitle(discountType, discountValue)
    ).slice(0, 80);
    const redemptionMethod = voucherRules.normalizeRedemptionMethod(
      input.redemptionMethod ?? input.redemption ?? "",
      {
        redemptionMethod: existing?.redemptionMethod,
        passive: input.passive ?? existing?.passive,
        isPassive: input.isPassive ?? existing?.isPassive,
      },
    );
    let code = normalizeCode(input.code ?? existing?.code);
    if (!code) {
      if (redemptionMethod === voucherRules.REDEMPTION_METHODS.ENTER_CODE) {
        throw new Error("Voucher code must be at least 3 characters.");
      }
      code = creating ? generateInternalCode() : normalizeCode(existing?.code) || generateInternalCode();
    }
    if (code.length < 3) {
      throw new Error("Voucher code must be at least 3 characters.");
    }
    if (!/^[A-Z0-9_-]+$/.test(code)) {
      throw new Error("Voucher code can only use letters, numbers, hyphens, and underscores.");
    }
    const badge = String(input.badge ?? existing?.badge ?? "Sitewide")
      .trim()
      .slice(0, 40);
    const note = normalizeNote(input.note ?? existing?.note ?? "A deal\nfor you!");
    const date = formatDisplayDate(
      input.date ?? input.expiresAt ?? existing?.date ?? "",
      input.time ?? input.expiresTime ?? "",
    );
    const startDate = formatDisplayDate(
      input.startDate ?? input.startsAt ?? existing?.startDate ?? "",
      input.startTime ?? input.startsTime ?? "",
    );
    const minimumSpend = normalizeMinimumSpend(
      input.minimumSpend ?? existing?.minimumSpend ?? "0",
    );
    const usesPerAccount = normalizeUsesPerAccount(
      input.usesPerAccount ??
        input.maxUsesPerUser ??
        existing?.usesPerAccount ??
        existing?.maxUsesPerUser ??
        DEFAULT_USES_PER_ACCOUNT,
    );
    const sellerAdminId = normalizeTenantId(
      input.sellerAdminId ?? existing?.sellerAdminId ?? "",
      "",
    );
    const platformSource =
      input.platformId != null && String(input.platformId).trim() !== ""
        ? input.platformId
        : input.platform != null && String(input.platform).trim() !== ""
          ? input.platform
          : existing?.platformId;
    const platformSourceChanged =
      platformSource != null &&
      normalizePlatformId(platformSource) !== normalizePlatformId(existing?.platformId);
    const requestedPlatformIds = input.platformIds !== undefined
      ? normalizePlatformIdList(input.platformIds)
      : platformSourceChanged
        ? []
        : normalizePlatformIdList(existing?.platformIds);
    // Seller store vouchers default to all platforms; scope is sellerAdminId.
    const platformId = normalizePlatformId(
      creating && sellerAdminId && (platformSource == null || String(platformSource).trim() === "")
        ? PLATFORM_ID_ALL
        : requestedPlatformIds.length
          ? requestedPlatformIds[0]
          : platformSource,
      {
        required: creating && !sellerAdminId,
      },
    );
    const platformIds =
      !sellerAdminId && requestedPlatformIds.length > 1 ? requestedPlatformIds : [];

    if (!title) throw new Error("Voucher title is required.");
    const maximumDiscount =
      discountType === "percent"
        ? normalizeOptionalMoney(input.maximumDiscount ?? existing?.maximumDiscount)
        : 0;
    const totalUsageLimit = normalizeOptionalCount(
      input.totalUsageLimit ?? existing?.totalUsageLimit,
    );
    const scopeType = voucherRules.normalizeScopeType(
      input.scopeType ?? existing?.scopeType,
    );
    const includeSellerIds = normalizeIdList(
      input.includeSellerIds ?? existing?.includeSellerIds,
    );
    const includeCategoryIds = normalizeIdList(
      input.includeCategoryIds ?? existing?.includeCategoryIds,
    );
    const includeBusinessTypeIds = normalizeIdList(
      input.includeBusinessTypeIds ?? existing?.includeBusinessTypeIds,
    );
    const includeBrandIds = normalizeIdList(
      input.includeBrandIds ?? existing?.includeBrandIds,
    );
    const includeProductIds = normalizeIdList(
      input.includeProductIds ?? existing?.includeProductIds,
    );
    const includeVariantIds = normalizeIdList(
      input.includeVariantIds ?? existing?.includeVariantIds,
    );
    const excludeSellerIds = normalizeIdList(
      input.excludeSellerIds ?? existing?.excludeSellerIds,
    );
    const excludeCategoryIds = normalizeIdList(
      input.excludeCategoryIds ?? existing?.excludeCategoryIds,
    );
    const excludeBrandIds = normalizeIdList(
      input.excludeBrandIds ?? existing?.excludeBrandIds,
    );
    const excludeProductIds = normalizeIdList(
      input.excludeProductIds ?? existing?.excludeProductIds,
    );
    const excludeVariantIds = normalizeIdList(
      input.excludeVariantIds ?? existing?.excludeVariantIds,
    );
    if (scopeType === voucherRules.SCOPE_TYPES.SELLERS && !includeSellerIds.length) {
      throw new Error("Select at least one seller, or switch scope to Entire platform.");
    }
    if (scopeType === voucherRules.SCOPE_TYPES.CATEGORIES && !includeCategoryIds.length) {
      throw new Error("Select at least one category, or switch scope to Entire platform.");
    }
    if (
      scopeType === voucherRules.SCOPE_TYPES.BUSINESS_TYPES &&
      !includeBusinessTypeIds.length
    ) {
      throw new Error("Select at least one business type, or switch scope to Entire platform.");
    }
    if (scopeType === voucherRules.SCOPE_TYPES.BRANDS && !includeBrandIds.length) {
      throw new Error("Select at least one brand, or switch scope to Entire platform.");
    }
    if (scopeType === voucherRules.SCOPE_TYPES.PRODUCTS && !includeProductIds.length) {
      throw new Error("Add product IDs, or switch scope to Entire platform.");
    }
    if (scopeType === voucherRules.SCOPE_TYPES.VARIANTS && !includeVariantIds.length) {
      throw new Error("Add variant IDs, or switch scope to Entire platform.");
    }
    const shippingDiscountType = voucherRules.normalizeShippingDiscountType(
      input.shippingDiscountType ?? existing?.shippingDiscountType,
    );
    const shippingDiscountCap = freeShipping
      ? normalizeOptionalMoney(
          input.shippingDiscountCap ?? existing?.shippingDiscountCap,
        )
      : 0;
    const shippingMethods = normalizeIdList(
      input.shippingMethods ?? existing?.shippingMethods,
    );
    const shippingLocationType = String(
      input.shippingLocationType ?? existing?.shippingLocationType ?? "nationwide",
    )
      .trim()
      .toLowerCase() || "nationwide";
    const shippingLocationIds = normalizeIdList(
      input.shippingLocationIds ?? existing?.shippingLocationIds,
    );
    const fundingSource = sellerAdminId
      ? voucherRules.normalizeFundingSource(
          input.fundingSource ?? existing?.fundingSource ?? "seller",
        )
      : voucherRules.normalizeFundingSource(
          input.fundingSource ?? existing?.fundingSource ?? "platform",
        );
    let platformSharePct = Math.max(
      0,
      Math.min(100, Number(input.platformSharePct ?? existing?.platformSharePct ?? 100) || 0),
    );
    let sellerSharePct = Math.max(
      0,
      Math.min(100, Number(input.sellerSharePct ?? existing?.sellerSharePct ?? 0) || 0),
    );
    if (fundingSource === voucherRules.FUNDING_SOURCES.SHARED) {
      if (!sellerSharePct && platformSharePct) sellerSharePct = 100 - platformSharePct;
      if (!platformSharePct && sellerSharePct) platformSharePct = 100 - sellerSharePct;
      if (platformSharePct + sellerSharePct !== 100) {
        sellerSharePct = 100 - platformSharePct;
      }
    } else if (fundingSource === voucherRules.FUNDING_SOURCES.SELLER) {
      platformSharePct = 0;
      sellerSharePct = 100;
    } else {
      platformSharePct = 100;
      sellerSharePct = 0;
    }
    const allocatedBudget = normalizeOptionalMoney(
      input.allocatedBudget ?? existing?.allocatedBudget,
    );
    const usedBudget = normalizeOptionalMoney(existing?.usedBudget ?? 0);
    const customerEligibility = voucherRules.normalizeCustomerEligibility(
      input.customerEligibility ?? existing?.customerEligibility,
    );
    const customerSegmentIds = normalizeIdList(
      input.customerSegmentIds ?? existing?.customerSegmentIds,
    );
    const combinationRules = normalizeCombinationRules(input, existing);
    const priority = voucherRules.normalizePriority(input.priority ?? existing?.priority);
    const createdBy = String(input.createdBy ?? existing?.createdBy ?? "super-admin")
      .trim()
      .slice(0, 160);
    const claimedByUserIds = normalizeUsedByUserIds(
      input.claimedByUserIds ?? existing?.claimedByUserIds,
    );
    const claimedCount = Math.max(
      claimedByUserIds.length,
      Number(existing?.claimedCount) || 0,
    );
    const totalDiscountGiven = normalizeOptionalMoney(existing?.totalDiscountGiven);
    const platformSubsidyGiven = normalizeOptionalMoney(existing?.platformSubsidyGiven);
    const sellerSubsidyGiven = normalizeOptionalMoney(existing?.sellerSubsidyGiven);
    const ordersGenerated = Math.max(0, Number(existing?.ordersGenerated) || 0);
    const grossSalesFromVoucher = normalizeOptionalMoney(existing?.grossSalesFromVoucher);
    if (!code || code.length < 3) {
      throw new Error("Voucher code must be at least 3 characters.");
    }
    const repeatWeekly = Boolean(
      input.repeatWeekly ??
        input.repeatDaysEnabled ??
        existing?.repeatWeekly ??
        false,
    );
    const repeatDays = repeatWeekly
      ? normalizeRepeatDays(input.repeatDays ?? existing?.repeatDays)
      : [];
    const repeatStartTime = repeatWeekly
      ? normalizeRepeatTime(
          input.repeatStartTime ?? existing?.repeatStartTime ?? "",
        )
      : "";
    const repeatEndTime = repeatWeekly
      ? normalizeRepeatTime(input.repeatEndTime ?? existing?.repeatEndTime ?? "")
      : "";
    if (repeatWeekly) {
      if (!repeatDays.length) {
        throw new Error("Select at least one weekday for the weekly hours.");
      }
      if (!repeatStartTime) {
        throw new Error("Set the weekly start time.");
      }
      if (repeatEndTime && repeatStartTime === repeatEndTime) {
        throw new Error("Weekly end time must be different from the start time.");
      }
    }
    if (date && !startDate && !sellerAdminId) {
      throw new Error("Set a start date before the expiry date.");
    }
    const startMs = startDate ? displayDateTimeMs(startDate, { endOfDay: false }) : null;
    const expireHasTime = /:\d{2}\s*[AP]M$/i.test(String(date || ""));
    const expireMs = date
      ? displayDateTimeMs(date, { endOfDay: !expireHasTime })
      : null;
    const minDurationMs = 60 * 60 * 1000;
    if (startMs != null && expireMs != null && expireMs < startMs + minDurationMs) {
      throw new Error("Expiry must be at least 1 hour after the start date and time.");
    }
    if (creating && !discountValue) {
      if (!freeShipping) {
        throw new Error(
          discountType === "fixed"
            ? "Enter the fixed price amount off total purchase."
            : "Enter the percent of total purchase.",
        );
      }
    }
    if (creating && !sellerAdminId && !platformId) {
      throw new Error("Select a buyer platform for this voucher.");
    }

    const usedByUserIds = normalizeUsedByUserIds(existing?.usedByUserIds);
    const usedByUserCounts = normalizeUsedByUserCounts(
      existing?.usedByUserCounts,
      usedByUserIds,
    );
    const usedCount = usedByUserIds.length;
    const usedTimes = Math.max(
      normalizeUsedTimes(existing?.usedTimes, usedCount),
      usedTimesFromCounts(usedByUserCounts, usedCount),
      usedCount,
    );
    const id = String(input.id ?? existing?.id ?? newId()).trim() || newId();
    const createdAt = String(existing?.createdAt || input.createdAt || nowIso());
    const updatedAt = String(
      input.updatedAt || existing?.updatedAt || createdAt || nowIso(),
    );
    const previousStatus = String(existing?.status || "").trim().toLowerCase();
    let statusAt = String(input.statusAt || existing?.statusAt || "").trim();
    let nextStatus = status;
    let nextAction = action;
    if (nextStatus === "active" && isPastExpiryDate(date)) {
      nextStatus = "expired";
      nextAction = "expired";
    } else if (
      nextStatus === "expired" &&
      !isPastExpiryDate(date) &&
      String(input.status ?? "").trim().toLowerCase() === "active"
    ) {
      nextStatus = "active";
      nextAction = VOUCHER_ACTIONS.has(String(input.action || "").trim())
        ? String(input.action).trim()
        : "useNow";
    }
    if (
      !["paused", "cancelled", "draft", "inactive"].includes(nextStatus)
    ) {
      const campaignStatus = voucherRules.resolveCampaignStatus(
        {
          status: nextStatus,
          startsAtMs: startMs,
          endsAtMs: expireMs,
          usedTimes,
          totalUsageLimit,
          allocatedBudget,
          usedBudget,
        },
        Date.now(),
      );
      nextStatus = campaignStatus;
      if (campaignStatus === "fully_redeemed" || campaignStatus === "budget_exhausted") {
        nextAction = "used";
      } else if (campaignStatus === "expired") {
        nextAction = "expired";
      } else if (campaignStatus === "scheduled" || campaignStatus === "active") {
        nextAction = VOUCHER_ACTIONS.has(nextAction) ? nextAction : "useNow";
      }
    }

    const inactiveReason = String(
      input.inactiveReason ?? existing?.inactiveReason ?? "",
    )
      .trim()
      .toLowerCase();
    const hiddenWithCompanyBan = Boolean(
      input.hiddenWithCompanyBan ?? existing?.hiddenWithCompanyBan,
    );
    const hiddenWithCompanyRestrict = Boolean(
      input.hiddenWithCompanyRestrict ?? existing?.hiddenWithCompanyRestrict,
    );
    const previousStatusBeforeEnforcement = String(
      input.previousStatusBeforeEnforcement ??
        existing?.previousStatusBeforeEnforcement ??
        "",
    )
      .trim()
      .toLowerCase();
    const companyEnforcementReason = String(
      input.companyEnforcementReason ?? existing?.companyEnforcementReason ?? "",
    ).trim();
    const cardColor = normalizeCardColor(
      input.cardColor ?? existing?.cardColor ?? "",
    );
    const companyLogoUrl = normalizeVoucherLogoUrl(
      input.companyLogoUrl ?? existing?.companyLogoUrl ?? "",
    );

    if (nextStatus === "active") {
      statusAt = "";
    } else if (!statusAt || previousStatus !== nextStatus) {
      if (previousStatus !== nextStatus) {
        statusAt = nowIso();
      } else {
        const fromParts = parseExpiryCalendarParts(date);
        statusAt = fromParts
          ? new Date(
              Date.UTC(fromParts.year, fromParts.month - 1, fromParts.day, 15, 59, 59),
            ).toISOString()
          : updatedAt || createdAt || nowIso();
      }
    }

    return {
      id,
      status: nextStatus,
      kind,
      title,
      subtitle,
      minimumSpend,
      usesPerAccount,
      code,
      badge,
      date,
      ...(startDate ? { startDate } : {}),
      action: nextAction,
      note,
      platformId,
      platformIds,
      discountType,
      discountValue: discountValue || existing?.discountValue || "",
      freeShipping,
      maximumDiscount,
      totalUsageLimit,
      redemptionMethod,
      scopeType,
      includeSellerIds,
      includeCategoryIds,
      includeBusinessTypeIds,
      includeBrandIds,
      includeProductIds,
      includeVariantIds,
      excludeSellerIds,
      excludeCategoryIds,
      excludeBrandIds,
      excludeProductIds,
      excludeVariantIds,
      shippingDiscountType,
      shippingDiscountCap,
      shippingMethods,
      shippingLocationType,
      shippingLocationIds,
      fundingSource,
      platformSharePct,
      sellerSharePct,
      allocatedBudget,
      usedBudget,
      customerEligibility,
      customerSegmentIds,
      combinationRules,
      priority,
      createdBy,
      claimedByUserIds,
      claimedCount,
      totalDiscountGiven,
      platformSubsidyGiven,
      sellerSubsidyGiven,
      ordersGenerated,
      grossSalesFromVoucher,
      startsAtMs: startMs,
      endsAtMs: expireMs,
      ...(cardColor ? { cardColor } : {}),
      ...(companyLogoUrl ? { companyLogoUrl } : {}),
      repeatWeekly,
      ...(repeatWeekly
        ? { repeatDays, repeatStartTime, repeatEndTime }
        : {}),
      passive: redemptionMethod === voucherRules.REDEMPTION_METHODS.AUTO_APPLY,
      createdAt,
      updatedAt,
      usedByUserIds,
      usedByUserCounts,
      usedCount,
      usedTimes,
      ...(sellerAdminId ? { sellerAdminId } : {}),
      ...(statusAt ? { statusAt } : {}),
      ...(nextStatus === "inactive" || hiddenWithCompanyBan || hiddenWithCompanyRestrict
        ? {
            inactiveReason:
              inactiveReason === "company-restricted"
                ? "company-restricted"
                : inactiveReason === "company-banned"
                  ? "company-banned"
                  : hiddenWithCompanyRestrict
                    ? "company-restricted"
                    : "company-banned",
            hiddenWithCompanyBan,
            hiddenWithCompanyRestrict,
            ...(previousStatusBeforeEnforcement
              ? { previousStatusBeforeEnforcement }
              : {}),
            ...(companyEnforcementReason ? { companyEnforcementReason } : {}),
          }
        : {}),
    };
  }

  function resolveSellerCompanyPictureUrl(account) {
    if (!account || typeof account !== "object") return "";
    if (account.businessLogoSkipped === true) return "";
    const blocked = new Set(
      [
        account.googleProfile?.picture,
        account.googlePicture,
        account.google_picture,
        account.avatarUrl,
        account.photoUrl,
        account.profilePhotoUrl,
        account.user?.profileImageUrl,
        account.owner?.profileImageUrl,
      ]
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    );
    return [
      account.profileData?.companyPictureUrl,
      account.profileData?.companyProfileImageUrl,
      account.profileData?.businessLogoUrl,
      account.company?.logoUrl,
      account.company?.companyPictureUrl,
      account.company?.companyProfileImageUrl,
      account.company?.businessLogoUrl,
      account.companyPictureUrl,
      account.companyProfileImageUrl,
      account.businessLogoUrl,
      account.store?.companyPictureUrl,
      account.store?.companyProfileImageUrl,
      account.store?.businessLogoUrl,
      account.profile?.companyPictureUrl,
      account.profile?.companyProfileImageUrl,
    ]
      .map((value) => String(value || "").trim())
      .find((value) => value && !blocked.has(value)) || "";
  }

  function normalizeStoreTypeKey(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  }

  function loosePlatformId(value) {
    const raw = String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "")
      .slice(0, 40);
    if (!raw || raw === PLATFORM_ID_ALL) return "";
    if (raw === "hotel") return "hotels";
    if (raw === "grocery") return "groceries";
    return raw;
  }

  function accountStoreTypeName(account, company = null) {
    if (!account || typeof account !== "object") {
      return String(company?.businessType || company?.storeType || company?.storeTypeName || "").trim();
    }
    const profile =
      account.profileData && typeof account.profileData === "object" ? account.profileData : {};
    const companyProfile =
      company?.profileData && typeof company.profileData === "object" ? company.profileData : {};
    return [
      account.storeType,
      account.storeTypeName,
      account.businessType,
      account.company?.storeType,
      account.company?.storeTypeName,
      account.company?.businessType,
      profile.storeType,
      profile.storeTypeName,
      profile.businessType,
      company?.businessType,
      company?.storeType,
      company?.storeTypeName,
      companyProfile.storeType,
      companyProfile.businessType,
    ]
      .map((value) => String(value || "").trim())
      .find(Boolean) || "";
  }

  function matchStoreTypeRecord(storeTypes, typeName) {
    const key = String(typeName || "").trim().toLowerCase();
    if (!key) return null;
    for (const entry of Array.isArray(storeTypes) ? storeTypes : []) {
      if (!entry) continue;
      if (typeof entry === "string") {
        if (entry.trim().toLowerCase() === key) return { name: entry.trim() };
        continue;
      }
      const names = [
        entry.name,
        entry.storeType,
        entry.storeTypeName,
        entry.businessType,
      ]
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean);
      if (names.includes(key)) return entry;
    }
    return null;
  }

  async function readStoreTypesSafe() {
    if (typeof readStoreTypes === "function") {
      try {
        const fromDb = await readStoreTypes();
        if (Array.isArray(fromDb) && fromDb.length) return fromDb;
      } catch (_error) {
        /* fall through to file */
      }
    }
    try {
      const raw = JSON.parse(await fsPromises.readFile(STORE_TYPES_FILE, "utf8"));
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw?.storeTypes)) return raw.storeTypes;
      if (Array.isArray(raw?.storeTypeDetails)) return raw.storeTypeDetails;
      return [];
    } catch (_error) {
      return [];
    }
  }

  async function readPlatformsSafe() {
    try {
      const raw = JSON.parse(await fsPromises.readFile(PLATFORMS_FILE, "utf8"));
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw?.platforms)) return raw.platforms;
      return [];
    } catch (_error) {
      return [];
    }
  }

  function matchPlatformIdFromText(text, platforms = []) {
    const key = String(text || "").toLowerCase();
    if (!key) return "";
    const list = Array.isArray(platforms) ? platforms : [];
    const named = list.find((entry) => {
      const id = String(entry?.id || entry?.platformId || "").toLowerCase();
      const name = String(entry?.name || "").toLowerCase();
      if (!id && !name) return false;
      return key.includes(id) || (name && key.includes(name));
    });
    if (named) return loosePlatformId(named.id || named.platformId);
    if (
      key.includes("hotel")
      || key.includes("resort")
      || key.includes("restaurant")
      || key.includes("resto")
    ) {
      const hotels = list.find((entry) => {
        const id = String(entry?.id || "").toLowerCase();
        const name = String(entry?.name || "").toLowerCase();
        return id === "hotels" || name.includes("hotel");
      });
      return loosePlatformId(hotels?.id || hotels?.platformId) || "hotels";
    }
    if (key.includes("food") || key.includes("dining") || key.includes("cafe")) {
      return "food";
    }
    if (key.includes("grocery") || key.includes("grocer")) return "groceries";
    if (key.includes("shop") || key.includes("store")) return "shop";
    return "";
  }

  function resolveAccountPlatformId(account, storeTypes = [], platforms = [], extraText = "") {
    const explicit = loosePlatformId(
      account?.platformId ||
        account?.company?.platformId ||
        account?.profile?.platformId,
    );
    if (explicit) return explicit;
    const storeTypeName = accountStoreTypeName(account);
    const wanted = normalizeStoreTypeKey(storeTypeName);
    if (wanted) {
      const match = (Array.isArray(storeTypes) ? storeTypes : []).find((entry) => {
        const names = [entry?.name, entry?.storeType, entry?.storeTypeName, entry?.businessType];
        return names.some((name) => normalizeStoreTypeKey(name) === wanted);
      });
      const fromStoreType = loosePlatformId(
        match?.platformId || match?.platform || match?.buyerPlatform,
      );
      if (fromStoreType) return fromStoreType;
    }
    return matchPlatformIdFromText(
      [storeTypeName, extraText].filter(Boolean).join(" "),
      platforms,
    );
  }

  function isGenericCompanyLabel(value) {
    return /^(store|store promo|store voucher|sitewide|seller store|seller company|company|switch)$/i.test(
      String(value || "").replace(/\s+/g, " ").trim(),
    );
  }

  function isPersonAccountLabel(account, value) {
    const name = String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
    if (!name || !account || typeof account !== "object") return false;
    const person = [
      account.username,
      account.displayName,
      account.email,
      String(account.email || "").split("@")[0],
      [account.firstName, account.lastName].filter(Boolean).join(" "),
    ]
      .map((entry) => String(entry || "").replace(/\s+/g, " ").trim().toLowerCase())
      .filter(Boolean);
    return person.includes(name);
  }

  function pickCompanyLabel(account, candidates, { rejectPerson = false } = {}) {
    for (const raw of candidates) {
      const text = String(raw || "").replace(/\s+/g, " ").trim();
      if (!text || isGenericCompanyLabel(text)) continue;
      if (rejectPerson && isPersonAccountLabel(account, text)) continue;
      return text;
    }
    return "";
  }

  function resolveSellerAccountLabel(account, company = null) {
    const profile =
      account?.profileData && typeof account.profileData === "object" ? account.profileData : {};
    const nested = account?.company && typeof account.company === "object" ? account.company : {};
    const official = pickCompanyLabel(account, [
      company?.name,
      company?.publicName,
      company?.legalName,
      account?.companyOfficialName,
      account?.companyPublicName,
      nested.name,
      nested.publicName,
      nested.companyName,
      profile.companyName,
      profile.publicName,
      profile.name,
    ]);
    if (official) return official;
    return pickCompanyLabel(
      account,
      [account?.companyName, account?.storeName, account?.businessName],
      { rejectPerson: true },
    );
  }

  function requireSellerAdminScope(request, response, requestUrl = null) {
    if (typeof getExplicitRequestAdminId !== "function") {
      sendJson(response, 503, {
        message: "Seller admin voucher routes are unavailable.",
      });
      return "";
    }
    const adminId = normalizeTenantId(
      getExplicitRequestAdminId(request, requestUrl),
      "",
    );
    if (!adminId || !isUsableProductAdminScope(adminId)) {
      sendJson(response, 403, {
        message: "Logged-in seller scope is required to manage store vouchers.",
      });
      return "";
    }
    return adminId;
  }

  function voucherOwnedBySeller(voucher, sellerAdminId) {
    const scopedSeller = normalizeTenantId(voucher?.sellerAdminId || "", "");
    const wanted = normalizeTenantId(sellerAdminId || "", "");
    return Boolean(scopedSeller && wanted && scopedSeller === wanted);
  }

  function getAccountVoucherEnforcement(account) {
    if (!account || typeof account !== "object") return null;
    const companyStatus = String(
      account.companyStatus ?? account.companyEnforcementStatus ?? "",
    )
      .trim()
      .toLowerCase();
    const accountState = String(account.accountState ?? "").trim().toLowerCase();
    const status = String(
      account.status ?? account.accountStatus ?? "",
    )
      .trim()
      .toLowerCase();
    const banned =
      account.isBanned === true ||
      account.banned === true ||
      companyStatus === "banned" ||
      accountState === "banned" ||
      status === "banned";
    if (banned) {
      const detail = String(
        account.banReason ?? account.companyEnforcementReason ?? "",
      ).trim();
      return {
        key: "banned",
        title: "Company is banned",
        detail:
          detail ||
          "Super Admin banned this company. Store vouchers cannot be used until the company is unbanned.",
      };
    }
    const restricted =
      account.isRestricted === true ||
      account.restricted === true ||
      companyStatus === "restricted" ||
      accountState === "restricted" ||
      status === "restricted";
    if (restricted) {
      const detail = String(
        account.restrictionReason ??
          account.restrictReason ??
          account.companyEnforcementReason ??
          "",
      ).trim();
      return {
        key: "restricted",
        title: "Company is restricted",
        detail:
          detail ||
          "Super Admin restricted this company. Store vouchers stay inactive until the restriction ends.",
      };
    }
    return null;
  }

  function persistedInactiveReasons(voucher) {
    const reason = String(voucher?.inactiveReason || "").trim().toLowerCase();
    const detail = String(voucher?.companyEnforcementReason || "").trim();
    if (reason === "company-restricted" || voucher?.hiddenWithCompanyRestrict) {
      return [
        {
          key: "restricted",
          title: "Company is restricted",
          detail:
            detail ||
            "Super Admin restricted this company. Store vouchers stay inactive until the restriction ends.",
        },
      ];
    }
    if (reason === "company-banned" || voucher?.hiddenWithCompanyBan) {
      return [
        {
          key: "banned",
          title: "Company is banned",
          detail:
            detail ||
            "Super Admin banned this company. Store vouchers cannot be used until the company is unbanned.",
        },
      ];
    }
    if (voucher?.status === "inactive") {
      return [
        {
          key: "inactive",
          title: "Voucher is inactive",
          detail: "This store voucher is not available to users.",
        },
      ];
    }
    return [];
  }

  function applyVoucherEnforcement(voucher, account) {
    if (!voucher || typeof voucher !== "object") return voucher;
    const enforcement = getAccountVoucherEnforcement(account);
    if (!enforcement) {
      if (voucher.status !== "inactive") return voucher;
      const reasons = persistedInactiveReasons(voucher);
      return {
        ...voucher,
        inactiveReasons: reasons,
        companyIsBanned: reasons.some((entry) => entry.key === "banned"),
        companyIsRestricted: reasons.some((entry) => entry.key === "restricted"),
      };
    }
    if (voucher.status === "used" || voucher.status === "expired") {
      return voucher;
    }
    return {
      ...voucher,
      status: "inactive",
      action: "expired",
      inactiveReason:
        enforcement.key === "restricted" ? "company-restricted" : "company-banned",
      inactiveReasons: [enforcement],
      companyIsBanned: enforcement.key === "banned",
      companyIsRestricted: enforcement.key === "restricted",
      companyEnforcementReason: enforcement.detail,
    };
  }

  async function decorateVouchers(vouchers) {
    const accounts = typeof readAccounts === "function" ? await readAccounts() : [];
    const storeTypes = await readStoreTypesSafe();
    const platforms = await readPlatformsSafe();
    const bySeller = new Map();
    const byCompany = new Map();
    const decorated = [];
    for (const voucher of Array.isArray(vouchers) ? vouchers : []) {
      const sellerId = normalizeTenantId(voucher?.sellerAdminId || "", "");
      if (!sellerId) {
        decorated.push(applyVoucherEnforcement(voucher, null));
        continue;
      }
      let account = bySeller.get(sellerId);
      if (account === undefined) {
        account =
          typeof findAdminAccountByScopeId === "function"
            ? findAdminAccountByScopeId(accounts, sellerId)
            : null;
        bySeller.set(sellerId, account || null);
      }
      const companyId = String(account?.companyId || "").trim();
      let company = null;
      if (companyId && typeof findCompanyById === "function") {
        if (byCompany.has(companyId)) {
          company = byCompany.get(companyId);
        } else {
          company = await findCompanyById(companyId).catch(() => null);
          byCompany.set(companyId, company);
        }
      }
      const liveLogo = resolveSellerCompanyPictureUrl(account);
      const sellerPlatformId = resolveAccountPlatformId(
        account,
        storeTypes,
        platforms,
        [sellerId, voucher?.badge, voucher?.title].filter(Boolean).join(" "),
      );
      const companyName = resolveSellerAccountLabel(account, company);
      const businessType = accountStoreTypeName(account, company);
      const storeTypeRecord = matchStoreTypeRecord(storeTypes, businessType);
      const next = {
        ...voucher,
        companyLogoUrl: liveLogo,
        companyName,
        businessType,
        businessTypeIconName: String(
          storeTypeRecord?.iconName || storeTypeRecord?.lucideIconName || "",
        ).trim(),
        businessTypeIconUrl: String(
          storeTypeRecord?.iconImageUrl ||
            storeTypeRecord?.iconUrl ||
            storeTypeRecord?.businessTypeIconUrl ||
            "",
        ).trim(),
        ...(sellerPlatformId ? { sellerPlatformId } : {}),
      };
      decorated.push(applyVoucherEnforcement(next, account));
    }
    return decorated;
  }

  async function setSellerVouchersEnforcement(
    sellerAdminId,
    { mode = "ban", reason = "", now = nowIso() } = {},
  ) {
    const wanted = normalizeTenantId(sellerAdminId || "", "");
    if (!wanted) return { changed: 0 };
    const vouchers = await readVouchers({ persistPurge: false });
    const schedules = await readSchedules();
    let changed = 0;
    const applyEnforcement = (voucher) => {
      if (!voucherOwnedBySeller(voucher, wanted)) return voucher;
      if (mode === "restore") {
        const wasEnforced =
          voucher.hiddenWithCompanyBan === true ||
          voucher.hiddenWithCompanyRestrict === true ||
          voucher.status === "inactive";
        if (!wasEnforced) return voucher;
        changed += 1;
        if (voucher.status === "used") {
          return {
            ...voucher,
            hiddenWithCompanyBan: false,
            hiddenWithCompanyRestrict: false,
            inactiveReason: "",
            companyEnforcementReason: "",
            previousStatusBeforeEnforcement: "",
            updatedAt: now,
          };
        }
        const restoreStatus = isPastExpiryDate(voucher.date) ? "expired" : "active";
        return {
          ...voucher,
          status: restoreStatus,
          action: restoreStatus === "active" ? "useNow" : "expired",
          hiddenWithCompanyBan: false,
          hiddenWithCompanyRestrict: false,
          inactiveReason: "",
          companyEnforcementReason: "",
          previousStatusBeforeEnforcement: "",
          statusAt: restoreStatus === "active" ? "" : now,
          updatedAt: now,
        };
      }
      if (voucher.status !== "active") return voucher;
      changed += 1;
      return {
        ...voucher,
        status: "inactive",
        action: "expired",
        previousStatusBeforeEnforcement: "active",
        hiddenWithCompanyBan: mode === "ban",
        hiddenWithCompanyRestrict: mode === "restrict",
        inactiveReason: mode === "restrict" ? "company-restricted" : "company-banned",
        companyEnforcementReason: String(reason || "").trim(),
        statusAt: now,
        updatedAt: now,
      };
    };
    const nextVouchers = vouchers.map(applyEnforcement);
    const nextSchedules = schedules.map(applyEnforcement);
    if (changed > 0) {
      await writeVouchers(nextVouchers);
      await writeSchedules(nextSchedules);
    }
    return { changed };
  }

  async function notifySuperAdminSellerVoucherAction({
    action,
    voucher,
    sellerAdminId,
    request,
  }) {
    if (
      typeof persistSuperAdminNotification !== "function" ||
      typeof createPersistentLinkedNotification !== "function"
    ) {
      return;
    }
    const accounts =
      typeof readAccounts === "function" ? await readAccounts() : [];
    const account =
      typeof findAdminAccountByScopeId === "function"
        ? findAdminAccountByScopeId(accounts, sellerAdminId)
        : null;
    const storeName = resolveSellerAccountLabel(account);
    const code = String(voucher?.code || "").trim().toUpperCase() || "VOUCHER";
    const isDelete = action === "deleted";
    const isScheduled = !isDelete && !String(voucher?.id || "").trim();
    await persistSuperAdminNotification(
      createPersistentLinkedNotification({
        type: isDelete ? "seller-voucher-deleted" : "seller-voucher-created",
        audience: "super_admin",
        title: isDelete
          ? "Seller deleted a voucher"
          : isScheduled
            ? "Seller scheduled a voucher"
            : "Seller created a voucher",
        reason: isDelete
          ? "Store promo removed"
          : isScheduled
            ? "Scheduled store promo"
            : "New store promo",
        message: isDelete
          ? `${storeName} removed store voucher ${code}.`
          : isScheduled
            ? `${storeName} scheduled store voucher ${code}.`
            : `${storeName} published store voucher ${code}.`,
        adminId: sellerAdminId,
        companyName: storeName,
        storeName,
        businessName: storeName,
        createdBy: storeName,
        targetUrl: "/super_admin.html#vouchers",
      }),
    );
    if (typeof logActivitySafely === "function") {
      await logActivitySafely(
        {
          id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: "seller-admin-action",
          source: "seller_admin",
          adminId: sellerAdminId,
          action: isDelete ? "voucher-deleted" : "voucher-created",
          title: isDelete ? "Store voucher deleted" : "Store voucher created",
          description: isDelete
            ? `${storeName} deleted voucher ${code}.`
            : `${storeName} created store voucher ${code}.`,
          actor: {
            role: "seller-admin",
            accountId: sellerAdminId,
            displayName: storeName,
          },
          createdAt: new Date().toISOString(),
          skipLinkedNotification: true,
        },
        request,
      );
    }
  }

  async function notifySellerSaVoucherAction({
    action,
    voucher,
    request,
  }) {
    const sellerAdminId = normalizeTenantId(voucher?.sellerAdminId || "", "");
    if (!sellerAdminId) return;
    if (
      typeof notifySellerAdminInboxByAdminId !== "function" ||
      typeof createPersistentLinkedNotification !== "function"
    ) {
      return;
    }
    const accounts =
      typeof readAccounts === "function" ? await readAccounts() : [];
    const account =
      typeof findAdminAccountByScopeId === "function"
        ? findAdminAccountByScopeId(accounts, sellerAdminId)
        : null;
    const storeName = resolveSellerAccountLabel(account);
    const code = String(voucher?.code || "").trim().toUpperCase() || "VOUCHER";
    const isDelete = action === "deleted";
    await notifySellerAdminInboxByAdminId(
      sellerAdminId,
      createPersistentLinkedNotification({
        type: isDelete ? "sa-store-voucher-deleted" : "sa-store-voucher-updated",
        audience: "seller",
        title: isDelete
          ? "Store voucher removed by Super Admin"
          : "Store voucher updated by Super Admin",
        reason: isDelete ? "Promo removed by Super Admin" : "Promo updated by Super Admin",
        message: isDelete
          ? `Super Admin removed your store voucher ${code}.`
          : `Super Admin updated your store voucher ${code}.`,
        adminId: sellerAdminId,
        companyName: storeName,
        storeName,
        businessName: storeName,
        createdBy: "Super Admin",
        targetUrl: "/main.html#vouchers",
      }),
    );
    if (typeof logActivitySafely === "function") {
      await logActivitySafely(
        {
          id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: "super-admin-action",
          source: "super_admin",
          adminId: sellerAdminId,
          action: isDelete ? "store-voucher-deleted" : "store-voucher-updated",
          title: isDelete
            ? "Super Admin deleted store voucher"
            : "Super Admin updated store voucher",
          description: isDelete
            ? `Super Admin deleted store voucher ${code} for ${storeName}.`
            : `Super Admin updated store voucher ${code} for ${storeName}.`,
          actor: {
            role: "super-admin",
            accountId: "super-admin",
            displayName: "Super Admin",
          },
          createdAt: new Date().toISOString(),
          skipLinkedNotification: true,
        },
        request,
      );
    }
  }

  function platformLabelFromId(platformId) {
    const id = normalizePlatformId(platformId);
    if (!id || id === PLATFORM_ID_ALL) return "store checkout";
    return id.charAt(0).toUpperCase() + id.slice(1);
  }

  function filterVouchersForPublicList(vouchers, requestUrl) {
    const platformFilter = normalizePlatformId(
      requestUrl?.searchParams?.get("platform") ||
        requestUrl?.searchParams?.get("platformId") ||
        "",
    );
    const sellerAdminFilter = normalizeTenantId(
      requestUrl?.searchParams?.get("sellerAdminId") ||
        requestUrl?.searchParams?.get("seller") ||
        "",
      "",
    );
    return vouchers.filter((entry) => {
      if (!String(entry?.id || "").trim()) {
        return false;
      }
      if (isUpcomingStartDate(entry.startDate)) {
        return false;
      }
      if (isRepeatWeeklyVoucher(entry) && !isRepeatWindowOpen(entry)) {
        return false;
      }
      if (
        platformFilter &&
        platformFilter !== PLATFORM_ID_ALL &&
        !voucherAppliesToPlatform(entry, platformFilter)
      ) {
        return false;
      }
      if (entry.status === "inactive") {
        return false;
      }
      const liveStatus = String(entry.status || "").trim().toLowerCase();
      if (
        ["paused", "cancelled", "draft", "fully_redeemed", "budget_exhausted"].includes(
          liveStatus,
        )
      ) {
        return false;
      }
      // Seller-store vouchers stay in the public catalog so search/wallet can
      // show them. Callers scope by sellerAdminId at display/checkout time.
      const scopedSeller = normalizeTenantId(entry?.sellerAdminId || "", "");
      if (scopedSeller && sellerAdminFilter) {
        return scopedSeller === sellerAdminFilter;
      }
      return true;
    });
  }

  function retentionAnchorMs(voucher) {
    if (!voucher || voucher.status === "active") return null;
    const statusAt = Date.parse(voucher.statusAt || "");
    if (!Number.isNaN(statusAt)) return statusAt;
    const displayDate = Date.parse(voucher.date || "");
    if (!Number.isNaN(displayDate)) return displayDate;
    const updatedAt = Date.parse(voucher.updatedAt || "");
    if (!Number.isNaN(updatedAt)) return updatedAt;
    const createdAt = Date.parse(voucher.createdAt || "");
    return Number.isNaN(createdAt) ? null : createdAt;
  }

  function isPastUsedExpiredRetention(voucher) {
    if (!voucher || voucher.status === "active" || voucher.status === "inactive") {
      return false;
    }
    const anchor = retentionAnchorMs(voucher);
    if (anchor == null) return false;
    return Date.now() - anchor >= USED_EXPIRED_RETENTION_MS;
  }

  function sortVouchers(vouchers) {
    return [...vouchers].sort((a, b) => {
      const aTime = Date.parse(a.createdAt || "") || 0;
      const bTime = Date.parse(b.createdAt || "") || 0;
      return bTime - aTime;
    });
  }

  async function ensureVouchersFile() {
    await ensureStoragePaths();
    try {
      await fsPromises.access(VOUCHERS_FILE);
    } catch (_) {
      await writeJsonFileAtomically(VOUCHERS_FILE, DEFAULT_VOUCHERS);
    }
  }

  async function readVouchers({ persistPurge = true } = {}) {
    await ensureVouchersFile();
    try {
      const raw = await fsPromises.readFile(VOUCHERS_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new Error("Voucher storage must contain a JSON array.");
      }
      const normalized = parsed
        .map((entry) => {
          try {
            return normalizeVoucher(entry, entry);
          } catch (_) {
            return null;
          }
        })
        .filter(Boolean);
      const lifecycle = applyExpiryLifecycle(normalized);
      const kept = lifecycle.vouchers.filter(
        (entry) => !isPastUsedExpiredRetention(entry),
      );
      if (
        persistPurge &&
        (lifecycle.changed || kept.length !== lifecycle.vouchers.length)
      ) {
        await writeVouchers(kept);
      }
      return sortVouchers(kept);
    } catch (error) {
      if (error?.code === "ENOENT") {
        await writeJsonFileAtomically(VOUCHERS_FILE, DEFAULT_VOUCHERS);
        return sortVouchers(
          DEFAULT_VOUCHERS.map((entry) => normalizeVoucher(entry, entry)).filter(
            (entry) => !isPastUsedExpiredRetention(entry),
          ),
        );
      }
      throw error;
    }
  }

  async function writeVouchers(vouchers) {
    await writeJsonFileAtomically(
      VOUCHERS_FILE,
      sortVouchers(Array.isArray(vouchers) ? vouchers : []),
    );
  }

  async function ensureSchedulesFile() {
    await ensureStoragePaths();
    try {
      await fsPromises.access(SCHEDULES_FILE);
    } catch (_) {
      await writeJsonFileAtomically(SCHEDULES_FILE, []);
    }
  }

  function normalizeScheduleRecord(entry) {
    if (!entry || typeof entry !== "object") return null;
    const scheduleId = String(entry.scheduleId || newScheduleId()).trim();
    try {
      const voucher = normalizeVoucher(
        { ...entry, id: "pending-schedule" },
        { ...entry, id: "pending-schedule" },
      );
      return stripLiveId(voucher, scheduleId);
    } catch (_) {
      return null;
    }
  }

  async function readSchedules() {
    await ensureSchedulesFile();
    try {
      const raw = await fsPromises.readFile(SCHEDULES_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(normalizeScheduleRecord).filter(Boolean);
    } catch (error) {
      if (error?.code === "ENOENT") {
        await writeJsonFileAtomically(SCHEDULES_FILE, []);
        return [];
      }
      throw error;
    }
  }

  async function writeSchedules(schedules) {
    await writeJsonFileAtomically(
      SCHEDULES_FILE,
      Array.isArray(schedules) ? schedules.map((entry) => stripLiveId(entry, entry.scheduleId)) : [],
    );
  }

  function codeTaken(code, records, exceptKey = "") {
    const needle = String(code || "").toLowerCase();
    const except = String(exceptKey || "");
    return (Array.isArray(records) ? records : []).some((entry) => {
      if (voucherRecordKey(entry) && voucherRecordKey(entry) === except) return false;
      return String(entry?.code || "").toLowerCase() === needle;
    });
  }

  async function migrateUpcomingVouchersToSchedules() {
    const vouchers = await readVouchers({ persistPurge: false });
    const upcoming = [];
    const live = [];
    for (const entry of vouchers) {
      if (isUpcomingStartDate(entry.startDate)) {
        upcoming.push(entry);
      } else {
        live.push(entry);
      }
    }
    if (!upcoming.length) return;
    const schedules = await readSchedules();
    const existingCodes = new Set(
      schedules.map((entry) => String(entry.code || "").toLowerCase()),
    );
    const additions = upcoming
      .filter((entry) => !existingCodes.has(String(entry.code || "").toLowerCase()))
      .map((entry) => stripLiveId(entry, entry.scheduleId || newScheduleId()));
    await writeVouchers(live);
    if (additions.length) {
      await writeSchedules([...additions, ...schedules]);
    }
  }

  async function promoteDueSchedules() {
    const schedules = await readSchedules();
    if (!schedules.length) return;
    const due = [];
    const pending = [];
    for (const entry of schedules) {
      if (isUpcomingStartDate(entry.startDate)) pending.push(entry);
      else due.push(entry);
    }
    if (!due.length) return;
    const vouchers = await readVouchers({ persistPurge: false });
    const promoted = due.map((entry) => liveVoucherFromSchedule(entry));
    await writeVouchers([...promoted, ...vouchers]);
    await writeSchedules(pending);
  }

  let scheduleSyncPromise = null;
  async function syncScheduledVouchers() {
    if (scheduleSyncPromise) return scheduleSyncPromise;
    scheduleSyncPromise = (async () => {
      try {
        await migrateUpcomingVouchersToSchedules();
        await promoteDueSchedules();
      } finally {
        scheduleSyncPromise = null;
      }
    })();
    return scheduleSyncPromise;
  }

  async function decorateMergedVouchers(vouchers, schedules) {
    const decoratedLive = await decorateVouchers(vouchers);
    const decoratedSchedules = await decorateVouchers(
      (Array.isArray(schedules) ? schedules : []).map((entry) => stripLiveId(entry, entry.scheduleId)),
    );
    return sortVouchers([...decoratedSchedules, ...decoratedLive]);
  }

  async function listAdminVouchers() {
    await syncScheduledVouchers();
    return decorateMergedVouchers(await readVouchers(), await readSchedules());
  }

  function voucherScopedPlatformId(voucher) {
    return (
      loosePlatformId(voucher?.platformId) ||
      loosePlatformId(voucher?.sellerPlatformId) ||
      ""
    );
  }

  function buildVoucherSubnav(vouchers) {
    const platformCounts = new Map();
    let companies = 0;
    let percent = 0;
    let fixed = 0;
    let comingSoon = 0;
    let endingSoon = 0;
    let ended = 0;
    for (const voucher of Array.isArray(vouchers) ? vouchers : []) {
      if (String(voucher?.sellerAdminId || "").trim()) companies += 1;
      if (normalizeDiscountType(voucher?.discountType, voucher?.kind) === "fixed") {
        fixed += 1;
      } else {
        percent += 1;
      }
      if (isComingSoonVoucher(voucher)) comingSoon += 1;
      if (isEndingSoonVoucher(voucher)) endingSoon += 1;
      if (String(voucher?.status || "").toLowerCase() === "expired") ended += 1;
      const multiIds = voucherPlatformIds(voucher);
      const countedIds = multiIds.length > 1
        ? multiIds
        : [voucherScopedPlatformId(voucher)].filter(Boolean);
      for (const platformId of countedIds) {
        platformCounts.set(platformId, (platformCounts.get(platformId) || 0) + 1);
      }
    }
    return {
      companies,
      percent,
      fixed,
      comingSoon,
      endingSoon,
      ended,
      platforms: [...platformCounts.entries()].map(([id, count]) => ({ id, count })),
    };
  }

  function filterAdminDirectoryVouchers(vouchers, requestUrl) {
    const search = String(requestUrl?.searchParams?.get("q") || "")
      .trim()
      .toLowerCase();
    const status = String(requestUrl?.searchParams?.get("status") || "")
      .trim()
      .toLowerCase();
    const scope = String(requestUrl?.searchParams?.get("scope") || "")
      .trim()
      .toLowerCase();
    const discountType = String(requestUrl?.searchParams?.get("discountType") || "")
      .trim()
      .toLowerCase();
    const fundingFilter = String(requestUrl?.searchParams?.get("funding") || "")
      .trim()
      .toLowerCase();
    const redemptionFilter = String(
      requestUrl?.searchParams?.get("redemption") ||
        requestUrl?.searchParams?.get("redemptionMethod") ||
        "",
    )
      .trim()
      .toLowerCase();
    const upcoming = ["1", "true", "yes"].includes(
      String(requestUrl?.searchParams?.get("upcoming") || "")
        .trim()
        .toLowerCase(),
    );
    const endingSoon = ["1", "true", "yes"].includes(
      String(requestUrl?.searchParams?.get("endingSoon") || "")
        .trim()
        .toLowerCase(),
    );
    const platformRaw = String(
      requestUrl?.searchParams?.get("platform") ||
        requestUrl?.searchParams?.get("platformId") ||
        "",
    ).trim();
    const platformFilter = platformRaw
      ? normalizePlatformId(platformRaw)
      : "";
    const voucherStatus = String(requestUrl?.searchParams?.get("voucherStatus") || "")
      .trim()
      .toLowerCase();
    const usageFilter = String(requestUrl?.searchParams?.get("usage") || "")
      .trim()
      .toLowerCase();
    const eligibilityFilter = String(requestUrl?.searchParams?.get("eligibility") || "")
      .trim()
      .toLowerCase();
    const minSpendFilter = String(requestUrl?.searchParams?.get("minSpend") || "")
      .trim()
      .toLowerCase();
    return (Array.isArray(vouchers) ? vouchers : []).filter((voucher) => {
      if (status && String(voucher.status || "").toLowerCase() !== status) {
        return false;
      }
      if (voucherStatus && String(voucher.status || "").toLowerCase() !== voucherStatus) {
        return false;
      }
      if (usageFilter) {
        const usageLimit = Number(voucher.totalUsageLimit) || 0;
        const usedTimes = Number(voucher.usedTimes) || 0;
        if (usageFilter === "never-used" && usedTimes > 0) return false;
        if (usageFilter === "almost-full" && !(usageLimit > 0 && usedTimes / usageLimit >= 0.8)) {
          return false;
        }
        if (usageFilter === "unlimited" && usageLimit > 0) return false;
      }
      if (
        eligibilityFilter &&
        voucherRules.normalizeCustomerEligibility(voucher.customerEligibility) !== eligibilityFilter
      ) {
        return false;
      }
      if (minSpendFilter === "required" || minSpendFilter === "none") {
        const minimumSpend = Number(String(voucher.minimumSpend ?? "").replace(/[^\d.]/g, "")) || 0;
        if (minSpendFilter === "required" && minimumSpend <= 0) return false;
        if (minSpendFilter === "none" && minimumSpend > 0) return false;
      }
      if (scope === "store" && !voucher.sellerAdminId) return false;
      if (scope === "platform" && voucher.sellerAdminId) return false;
      if (discountType === "percent" || discountType === "fixed") {
        if (normalizeDiscountType(voucher?.discountType, voucher?.kind) !== discountType) {
          return false;
        }
      }
      if (fundingFilter) {
        if (voucherRules.normalizeFundingSource(voucher?.fundingSource) !== fundingFilter) {
          return false;
        }
      }
      if (redemptionFilter) {
        if (
          voucherRules.normalizeRedemptionMethod(voucher?.redemptionMethod, voucher) !==
          redemptionFilter
        ) {
          return false;
        }
      }
      if (upcoming && !isComingSoonVoucher(voucher)) return false;
      if (endingSoon && !isEndingSoonVoucher(voucher)) return false;
      if (platformFilter) {
        const multiIds = voucherPlatformIds(voucher);
        const voucherPlatform = voucherScopedPlatformId(voucher) || PLATFORM_ID_ALL;
        if (platformFilter === PLATFORM_ID_ALL) {
          if (voucherPlatform !== PLATFORM_ID_ALL) return false;
        } else if (multiIds.length > 1) {
          if (!multiIds.includes(platformFilter)) return false;
        } else if (
          voucherPlatform !== PLATFORM_ID_ALL &&
          voucherPlatform !== platformFilter
        ) {
          return false;
        }
      }
      if (!search) return true;
      const haystack = [
        voucher.id,
        voucher.scheduleId,
        voucher.code,
        voucher.title,
        voucher.subtitle,
        voucher.badge,
        voucher.sellerAdminId,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");
      return haystack.includes(search);
    });
  }

  function paginateAdminDirectoryVouchers(vouchers, requestUrl) {
    const limit = Math.min(
      50,
      Math.max(1, Math.trunc(Number(requestUrl?.searchParams?.get("limit")) || 10)),
    );
    const total = Array.isArray(vouchers) ? vouchers.length : 0;
    const pageCount = Math.max(1, Math.ceil(total / limit) || 1);
    let page = Math.max(1, Math.trunc(Number(requestUrl?.searchParams?.get("page")) || 1));
    if (page > pageCount) page = pageCount;
    const start = (page - 1) * limit;
    return {
      vouchers: (Array.isArray(vouchers) ? vouchers : []).slice(start, start + limit),
      total,
      page,
      limit,
      pageCount,
    };
  }

  function findRecordByKey(records, key) {
    const wanted = String(key || "").trim();
    if (!wanted) return -1;
    return (Array.isArray(records) ? records : []).findIndex(
      (entry) => voucherRecordKey(entry) === wanted,
    );
  }

  function toPublicVoucher(voucher, requestUrl) {
    const usesPerAccount = normalizeUsesPerAccount(voucher?.usesPerAccount);
    const accountId = accountIdFromRequest(requestUrl);
    const usedByUserCounts = normalizeUsedByUserCounts(
      voucher?.usedByUserCounts,
      voucher?.usedByUserIds,
    );
    const usedByAccount = accountId ? usedByUserCounts[accountId] || 0 : 0;
    const remainingUses = accountId
      ? Math.max(0, usesPerAccount - usedByAccount)
      : usesPerAccount;
    const exhausted =
      Boolean(accountId) &&
      usedByAccount >= usesPerAccount &&
      String(voucher?.status || "").trim().toLowerCase() === "active";
    return {
      id: String(voucher.id || "").trim(),
      scheduleId: String(voucher.scheduleId || "").trim(),
      status: exhausted ? "used" : voucher.status,
      kind: voucher.kind,
      title: voucher.title,
      subtitle: voucher.subtitle,
      minimumSpend: voucher.minimumSpend,
      usesPerAccount,
      code: voucher.code,
      badge: voucher.badge,
      date: voucher.date,
      noExpiry: !String(voucher.date || "").trim(),
      startDate: voucher.startDate || "",
      repeatWeekly: Boolean(voucher.repeatWeekly),
      repeatDays: Boolean(voucher.repeatWeekly)
        ? normalizeRepeatDays(voucher.repeatDays)
        : [],
      repeatStartTime: voucher.repeatStartTime || "",
      repeatEndTime: voucher.repeatEndTime || "",
      repeatOpen:
        !Boolean(voucher.repeatWeekly) || isRepeatWindowOpen(voucher),
      nextRepeatStart: Boolean(voucher.repeatWeekly)
        ? resolveRepeatWindow(voucher)?.startMs || 0
        : 0,
      nextRepeatEnd: Boolean(voucher.repeatWeekly)
        ? resolveRepeatWindow(voucher)?.endMs || 0
        : 0,
      action: exhausted ? "used" : voucher.action,
      note: voucher.note,
      platformId: voucher.platformId || PLATFORM_ID_ALL,
      platformIds: voucherPlatformIds(voucher).length > 1 ? voucherPlatformIds(voucher) : [],
      discountType: voucher.discountType || "percent",
      discountValue: voucher.discountValue || "",
      freeShipping: Boolean(voucher.freeShipping),
      maximumDiscount: Number(voucher.maximumDiscount) || 0,
      totalUsageLimit: Number(voucher.totalUsageLimit) || 0,
      redemptionMethod: voucherRules.normalizeRedemptionMethod(
        voucher.redemptionMethod,
        voucher,
      ),
      scopeType: voucherRules.normalizeScopeType(voucher.scopeType),
      includeSellerIds: normalizeIdList(voucher.includeSellerIds),
      includeCategoryIds: normalizeIdList(voucher.includeCategoryIds),
      includeBusinessTypeIds: normalizeIdList(voucher.includeBusinessTypeIds),
      includeBrandIds: normalizeIdList(voucher.includeBrandIds),
      includeProductIds: normalizeIdList(voucher.includeProductIds),
      includeVariantIds: normalizeIdList(voucher.includeVariantIds),
      excludeSellerIds: normalizeIdList(voucher.excludeSellerIds),
      excludeCategoryIds: normalizeIdList(voucher.excludeCategoryIds),
      excludeBrandIds: normalizeIdList(voucher.excludeBrandIds),
      excludeProductIds: normalizeIdList(voucher.excludeProductIds),
      excludeVariantIds: normalizeIdList(voucher.excludeVariantIds),
      shippingDiscountType: voucherRules.normalizeShippingDiscountType(
        voucher.shippingDiscountType,
      ),
      shippingDiscountCap: Number(voucher.shippingDiscountCap) || 0,
      shippingMethods: normalizeIdList(voucher.shippingMethods),
      shippingLocationType: voucher.shippingLocationType || "nationwide",
      shippingLocationIds: normalizeIdList(voucher.shippingLocationIds),
      fundingSource: voucherRules.normalizeFundingSource(voucher.fundingSource),
      platformSharePct: Number(voucher.platformSharePct) || 0,
      sellerSharePct: Number(voucher.sellerSharePct) || 0,
      allocatedBudget: Number(voucher.allocatedBudget) || 0,
      usedBudget: Number(voucher.usedBudget) || 0,
      remainingBudget:
        Number(voucher.allocatedBudget) > 0
          ? Math.max(
              0,
              Number(voucher.allocatedBudget) - Number(voucher.usedBudget || 0),
            )
          : null,
      customerEligibility: voucherRules.normalizeCustomerEligibility(
        voucher.customerEligibility,
      ),
      customerSegmentIds: normalizeIdList(voucher.customerSegmentIds),
      combinationRules: normalizeCombinationRules(voucher, voucher),
      priority: voucherRules.normalizePriority(voucher.priority),
      createdBy: voucher.createdBy || "",
      claimedCount: Number(voucher.claimedCount) || 0,
      claimedByAccount: accountId
        ? normalizeUsedByUserIds(voucher.claimedByUserIds).includes(accountId)
        : false,
      totalDiscountGiven: Number(voucher.totalDiscountGiven) || 0,
      platformSubsidyGiven: Number(voucher.platformSubsidyGiven) || 0,
      sellerSubsidyGiven: Number(voucher.sellerSubsidyGiven) || 0,
      ordersGenerated: Number(voucher.ordersGenerated) || 0,
      grossSalesFromVoucher: Number(voucher.grossSalesFromVoucher) || 0,
      schedulePreview: voucherRules.schedulePreview(voucher),
      passive:
        voucherRules.normalizeRedemptionMethod(voucher.redemptionMethod, voucher) ===
        voucherRules.REDEMPTION_METHODS.AUTO_APPLY,
      cardColor: voucher.cardColor || "",
      companyLogoUrl: voucher.companyLogoUrl || "",
      companyName: voucher.companyName || "",
      businessType: voucher.businessType || "",
      businessTypeIconName: voucher.businessTypeIconName || "",
      businessTypeIconUrl: voucher.businessTypeIconUrl || "",
      sellerAdminId: voucher.sellerAdminId || "",
      sellerPlatformId: voucher.sellerPlatformId || "",
      usedCount: Number(voucher.usedCount) || 0,
      usedTimes: Number(voucher.usedTimes) || 0,
      usedByAccount,
      remainingUses,
      createdAt: voucher.createdAt,
      updatedAt: voucher.updatedAt,
      statusAt: voucher.statusAt || null,
      inactiveReason: voucher.inactiveReason || "",
      inactiveReasons: Array.isArray(voucher.inactiveReasons)
        ? voucher.inactiveReasons
        : [],
      companyIsBanned: Boolean(voucher.companyIsBanned),
      companyIsRestricted: Boolean(voucher.companyIsRestricted),
      companyEnforcementReason: voucher.companyEnforcementReason || "",
    };
  }

  function collectVoucherRefsFromOrders(orders) {
    const ids = new Set();
    const codes = new Set();
    const pushId = (value) => {
      const id = String(value ?? "").trim();
      if (id) ids.add(id);
    };
    const pushCode = (value) => {
      const code = normalizeCode(value);
      if (code) codes.add(code);
    };
    for (const entry of Array.isArray(orders) ? orders : []) {
      if (!entry || typeof entry !== "object") continue;
      pushId(entry.voucherId);
      pushCode(entry.voucherCode);
      pushId(entry.shippingVoucherId);
      pushCode(entry.shippingVoucherCode);
      const extraIds = Array.isArray(entry.appliedVoucherIds)
        ? entry.appliedVoucherIds
        : [];
      const extraCodes = Array.isArray(entry.appliedVoucherCodes)
        ? entry.appliedVoucherCodes
        : [];
      extraIds.forEach(pushId);
      extraCodes.forEach(pushCode);
    }
    return {
      voucherIds: [...ids],
      voucherCodes: [...codes],
    };
  }

  async function recordVoucherUses({
    accountId,
    voucherIds = [],
    voucherCodes = [],
    platformFundedAmount = 0,
    sellerFundedAmount = 0,
    merchandiseDiscount = 0,
    shippingDiscount = 0,
    orderCount = 1,
    grossSales = 0,
  } = {}) {
    return enqueueVoucherMutation(async () => {
      const userId = normalizeAccountKey(accountId);
      const wantedIds = new Set(
        (Array.isArray(voucherIds) ? voucherIds : [])
          .map((value) => String(value ?? "").trim())
          .filter(Boolean),
      );
      const wantedCodes = new Set(
        (Array.isArray(voucherCodes) ? voucherCodes : [])
          .map((value) => normalizeCode(value))
          .filter(Boolean),
      );
      if (!userId || (!wantedIds.size && !wantedCodes.size)) {
        return { changed: false, vouchers: [] };
      }
      const vouchers = await readVouchers({ persistPurge: false });
      const stamp = nowIso();
      let changed = false;
      const next = vouchers.map((voucher) => {
        const matches =
          wantedIds.has(String(voucher?.id || "").trim()) ||
          wantedCodes.has(normalizeCode(voucher?.code));
        if (!matches) return voucher;
        if (["inactive", "paused", "cancelled", "draft"].includes(voucher.status)) {
          return voucher;
        }
        const usedByUserIds = normalizeUsedByUserIds(voucher.usedByUserIds);
        const usedByUserCounts = normalizeUsedByUserCounts(
          voucher.usedByUserCounts,
          usedByUserIds,
        );
        const maxUses = normalizeUsesPerAccount(voucher.usesPerAccount);
        const usedByAccount = usedByUserCounts[userId] || 0;
        if (usedByAccount >= maxUses) return voucher;
        if (voucherRules.remainingTotalUses(voucher) <= 0) return voucher;
        const discountTotal =
          voucherRules.money(merchandiseDiscount) +
          voucherRules.money(shippingDiscount);
        const platformAmount = voucherRules.money(platformFundedAmount);
        if (
          Number(voucher.allocatedBudget) > 0 &&
          platformAmount > voucherRules.remainingBudget(voucher)
        ) {
          return voucher;
        }
        const nextCounts = { ...usedByUserCounts, [userId]: usedByAccount + 1 };
        const nextIds = usedByUserIds.includes(userId)
          ? usedByUserIds
          : [...usedByUserIds, userId];
        const nextUsedTimes = Math.max(
          normalizeUsedTimes(voucher.usedTimes, usedByUserIds.length) + 1,
          usedTimesFromCounts(nextCounts, nextIds.length),
        );
        changed = true;
        const nextRecord = {
          ...voucher,
          usedByUserIds: nextIds,
          usedByUserCounts: nextCounts,
          usedCount: nextIds.length,
          usedTimes: nextUsedTimes,
          usedBudget: voucherRules.money((Number(voucher.usedBudget) || 0) + platformAmount),
          totalDiscountGiven: voucherRules.money(
            (Number(voucher.totalDiscountGiven) || 0) + discountTotal,
          ),
          platformSubsidyGiven: voucherRules.money(
            (Number(voucher.platformSubsidyGiven) || 0) + platformAmount,
          ),
          sellerSubsidyGiven: voucherRules.money(
            (Number(voucher.sellerSubsidyGiven) || 0) +
              voucherRules.money(sellerFundedAmount),
          ),
          ordersGenerated: Math.max(0, Number(voucher.ordersGenerated) || 0) + Math.max(1, orderCount),
          grossSalesFromVoucher: voucherRules.money(
            (Number(voucher.grossSalesFromVoucher) || 0) + voucherRules.money(grossSales),
          ),
          updatedAt: stamp,
        };
        const liveStatus = voucherRules.resolveCampaignStatus(nextRecord, Date.now());
        if (liveStatus !== nextRecord.status) {
          nextRecord.status = liveStatus;
          nextRecord.statusAt = stamp;
          if (liveStatus === "fully_redeemed" || liveStatus === "budget_exhausted") {
            nextRecord.action = "used";
          }
        }
        return nextRecord;
      });
      if (changed) {
        await writeVouchers(next);
      }
      return { changed, vouchers: next };
    });
  }

  function orderLinesFromEntries(orders) {
    return (Array.isArray(orders) ? orders : []).map((entry) => ({
      productId: entry?.productId || entry?.id || "",
      variantId: entry?.variantId || "",
      sellerAdminId: entry?.adminId || entry?.sellerAdminId || "",
      sellerId: entry?.adminId || entry?.sellerAdminId || "",
      categoryId: entry?.categoryId || entry?.category || "",
      category: entry?.categoryId || entry?.category || "",
      categories: Array.isArray(entry?.categories) ? entry.categories : [],
      brandId: entry?.brandId || entry?.brand || "",
      brand: entry?.brandId || entry?.brand || "",
      unitPrice: entry?.unitPrice ?? entry?.finalCustomerPrice ?? 0,
      price: entry?.unitPrice ?? entry?.finalCustomerPrice ?? 0,
      quantity: entry?.quantity || 1,
    }));
  }

  async function enrichLinesWithProductCategories(lines, vouchers) {
    const list = Array.isArray(lines) ? lines : [];
    const voucherList = Array.isArray(vouchers) ? vouchers : [];
    const needsBusinessTypes = voucherList.some(
      (voucher) =>
        voucherRules.normalizeScopeType(voucher?.scopeType) ===
        voucherRules.SCOPE_TYPES.BUSINESS_TYPES,
    );
    const needsCategories =
      needsBusinessTypes ||
      voucherList.some(
        (voucher) =>
          voucherRules.normalizeScopeType(voucher?.scopeType) === voucherRules.SCOPE_TYPES.CATEGORIES ||
          voucherRules.asIdList(voucher?.excludeCategoryIds).length > 0,
      );
    if (!needsCategories) return list;
    const withCategories = await attachProductCategories(list, { withSeller: needsBusinessTypes });
    return needsBusinessTypes ? attachLineBusinessTypes(withCategories) : withCategories;
  }

  async function attachProductCategories(list, { withSeller = false } = {}) {
    if (typeof readProducts !== "function") return list;
    const missing = list.filter(
      (line) =>
        String(line?.productId || "").trim() &&
        (!(Array.isArray(line?.categories) && line.categories.length) ||
          (withSeller && !String(line?.sellerAdminId || line?.sellerId || "").trim())),
    );
    if (!missing.length) return list;
    let products = [];
    try {
      products = await readProducts();
    } catch (_error) {
      return list;
    }
    const byId = new Map(
      (Array.isArray(products) ? products : []).map((product) => [
        String(product?.id || "").trim(),
        product,
      ]),
    );
    return list.map((line) => {
      const product = byId.get(String(line?.productId || "").trim());
      if (!product) return line;
      const sellerId = String(line?.sellerAdminId || line?.sellerId || "").trim() ||
        String(product.adminId || product.sellerAdminId || "").trim();
      const businessType = String(
        line?.businessType || product.businessType || product.storeType || "",
      ).trim();
      if (Array.isArray(line?.categories) && line.categories.length) {
        return { ...line, sellerAdminId: sellerId, businessType };
      }
      const categories = Array.isArray(product.categories)
        ? product.categories.filter(Boolean)
        : [];
      const primary = String(product.category || categories[0] || "").trim();
      return {
        ...line,
        sellerAdminId: sellerId,
        businessType,
        categories: categories.length ? categories : primary ? [primary] : [],
        category: line.category || primary,
        categoryId: line.categoryId || primary,
      };
    });
  }

  function storeTypeRecordKeys(entry) {
    if (!entry) return [];
    if (typeof entry === "string") return [entry.trim().toLowerCase()].filter(Boolean);
    return [entry.id, entry.name, entry.storeType, entry.storeTypeName, entry.businessType]
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean);
  }

  /** Business types come from the line's categories and the seller's own type, so new categories are covered. */
  async function attachLineBusinessTypes(list) {
    const storeTypes = await readStoreTypesSafe();
    const byCategory = new Map();
    for (const entry of storeTypes) {
      if (!entry || typeof entry !== "object") continue;
      const keys = storeTypeRecordKeys(entry);
      const details = Array.isArray(entry.categoryDetails) && entry.categoryDetails.length
        ? entry.categoryDetails.map((detail) => detail?.name)
        : Array.isArray(entry.categories)
          ? entry.categories
          : [];
      for (const name of details) {
        const key = String(name || "").trim().toLowerCase();
        if (!key) continue;
        byCategory.set(key, [...(byCategory.get(key) || []), ...keys]);
      }
    }
    let accounts = null;
    const bySeller = new Map();
    const sellerTypeKeys = async (sellerId) => {
      if (!sellerId) return [];
      if (bySeller.has(sellerId)) return bySeller.get(sellerId);
      if (accounts === null) {
        accounts = typeof readAccounts === "function" ? await readAccounts().catch(() => []) : [];
      }
      const account =
        typeof findAdminAccountByScopeId === "function"
          ? findAdminAccountByScopeId(accounts, sellerId)
          : null;
      const typeName = accountStoreTypeName(account);
      const record = matchStoreTypeRecord(storeTypes, typeName);
      const keys = record ? storeTypeRecordKeys(record) : storeTypeRecordKeys(typeName);
      bySeller.set(sellerId, keys);
      return keys;
    };
    const enriched = [];
    for (const line of list) {
      const keys = new Set(
        [line?.businessTypeId, line?.businessType, line?.storeType]
          .map((value) => String(value || "").trim().toLowerCase())
          .filter(Boolean),
      );
      const direct = matchStoreTypeRecord(storeTypes, line?.businessType || line?.storeType);
      for (const key of storeTypeRecordKeys(direct)) keys.add(key);
      const categories = [line?.categoryId, line?.category, ...(Array.isArray(line?.categories) ? line.categories : [])];
      for (const name of categories) {
        for (const key of byCategory.get(String(name || "").trim().toLowerCase()) || []) keys.add(key);
      }
      const sellerId = String(line?.sellerAdminId || line?.sellerId || "").trim();
      for (const key of await sellerTypeKeys(sellerId)) keys.add(key);
      enriched.push({ ...line, businessTypes: [...keys] });
    }
    return enriched;
  }

  function findVoucherForOrders(vouchers, orders) {
    const ids = new Set();
    const codes = new Set();
    for (const entry of Array.isArray(orders) ? orders : []) {
      const id = String(entry?.voucherId || "").trim();
      const code = normalizeCode(entry?.voucherCode);
      if (id) ids.add(id);
      if (code) codes.add(code);
    }
    return (Array.isArray(vouchers) ? vouchers : []).find((voucher) => {
      if (ids.has(String(voucher?.id || "").trim())) return true;
      return codes.has(normalizeCode(voucher?.code));
    }) || null;
  }

  async function consumeVouchersForOrders(orders, { accountId, customer } = {}) {
    const incoming = Array.isArray(orders) ? orders : [];
    if (!incoming.length) return { orders: incoming };
    return enqueueVoucherMutation(async () => {
      const userId =
        normalizeAccountKey(accountId) ||
        normalizeAccountKey(
          incoming.find((entry) => normalizeAccountKey(entry?.accountId))?.accountId,
        );
      const vouchers = await readVouchers({ persistPurge: false });
      const lines = await enrichLinesWithProductCategories(
        orderLinesFromEntries(incoming),
        vouchers,
      );
      const shippingFee = incoming.reduce(
        (sum, entry) => sum + (Number(entry?.shippingFeeAmount) || 0),
        0,
      );
      const hasFlashDeal = incoming.some(
        (entry) =>
          String(entry?.flashDealId || entry?.appliedFlashDealId || "").trim(),
      );
      const hasFreeShippingVoucher = incoming.some((entry) =>
        String(entry?.shippingVoucherId || entry?.shippingVoucherCode || "").trim(),
      );
      const context = {
        lines,
        shippingFee,
        hasFlashDeal,
        hasSellerVoucher: incoming.some((entry) =>
          String(entry?.sellerVoucherId || "").trim(),
        ),
        hasPlatformVoucher: false,
        hasFreeShippingVoucher,
        hasRewards: incoming.some((entry) => Number(entry?.coinsAmount) > 0),
        customer: { ...(customer || {}), id: userId },
        accountId: userId,
        now: new Date(),
      };
      let voucher = findVoucherForOrders(vouchers, incoming);
      if (!voucher) {
        const autoCandidates = vouchers.filter(
          (entry) =>
            !entry?.sellerAdminId &&
            voucherRules.normalizeRedemptionMethod(entry?.redemptionMethod, entry) ===
              voucherRules.REDEMPTION_METHODS.AUTO_APPLY,
        );
        const picked = voucherRules.pickVoucher(autoCandidates, {
          ...context,
          preferAutoApply: true,
        });
        if (!picked) {
          return {
            orders: incoming.map((entry) => ({
              ...entry,
              voucherDiscountAmount: 0,
              shippingDiscountAmount: 0,
              voucherSnapshot: undefined,
              platformFundedAmount: 0,
              sellerFundedAmount: 0,
            })),
          };
        }
        voucher = picked.voucher;
      }
      const evaluation = voucherRules.evaluateVoucher(voucher, context);
      if (!evaluation.ok) {
        const error = new Error(
          evaluation.reasons[0] || "This voucher cannot be applied to the order.",
        );
        error.statusCode = 400;
        throw error;
      }
      const snapshot = voucherRules.buildOrderSnapshot(voucher, evaluation);
      let remainingShip = evaluation.shippingDiscount;
      const nextOrders = incoming.map((entry, index) => {
        const fee = Number(entry.shippingFeeAmount) || 0;
        const shipCut = Math.min(fee, remainingShip);
        remainingShip = voucherRules.money(remainingShip - shipCut);
        return {
          ...entry,
          voucherId: String(voucher.id || "").trim(),
          voucherCode: String(voucher.code || "").trim(),
          voucherDiscountAmount: index === 0 ? evaluation.merchandiseDiscount : 0,
          shippingDiscountAmount: shipCut,
          shippingFeeAmount: voucherRules.money(Math.max(0, fee - shipCut)),
          voucherSnapshot: snapshot,
          platformFundedAmount: index === 0 ? evaluation.platformFundedAmount : 0,
          sellerFundedAmount: index === 0 ? evaluation.sellerFundedAmount : 0,
        };
      });
      const userKey = userId;
      const stamp = nowIso();
      let changed = false;
      const nextVouchers = vouchers.map((entry) => {
        if (String(entry?.id || "").trim() !== String(voucher.id || "").trim()) {
          return entry;
        }
        const usedByUserIds = normalizeUsedByUserIds(entry.usedByUserIds);
        const usedByUserCounts = normalizeUsedByUserCounts(
          entry.usedByUserCounts,
          usedByUserIds,
        );
        const maxUses = normalizeUsesPerAccount(entry.usesPerAccount);
        const usedByAccount = userKey ? usedByUserCounts[userKey] || 0 : 0;
        if (userKey && usedByAccount >= maxUses) {
          const error = new Error("This account has already used this voucher.");
          error.statusCode = 400;
          throw error;
        }
        if (voucherRules.remainingTotalUses(entry) <= 0) {
          const error = new Error("Voucher is fully redeemed.");
          error.statusCode = 409;
          throw error;
        }
        const platformAmount = voucherRules.money(evaluation.platformFundedAmount);
        if (
          Number(entry.allocatedBudget) > 0 &&
          platformAmount > voucherRules.remainingBudget(entry)
        ) {
          const error = new Error("Campaign budget is exhausted.");
          error.statusCode = 409;
          throw error;
        }
        const nextCounts = userKey
          ? { ...usedByUserCounts, [userKey]: usedByAccount + 1 }
          : usedByUserCounts;
        const nextIds =
          userKey && !usedByUserIds.includes(userKey)
            ? [...usedByUserIds, userKey]
            : usedByUserIds;
        changed = true;
        const nextRecord = {
          ...entry,
          usedByUserIds: nextIds,
          usedByUserCounts: nextCounts,
          usedCount: nextIds.length,
          usedTimes: Math.max(
            normalizeUsedTimes(entry.usedTimes, usedByUserIds.length) + 1,
            usedTimesFromCounts(nextCounts, nextIds.length),
          ),
          usedBudget: voucherRules.money((Number(entry.usedBudget) || 0) + platformAmount),
          totalDiscountGiven: voucherRules.money(
            (Number(entry.totalDiscountGiven) || 0) +
              voucherRules.money(evaluation.totalDiscount),
          ),
          platformSubsidyGiven: voucherRules.money(
            (Number(entry.platformSubsidyGiven) || 0) + platformAmount,
          ),
          sellerSubsidyGiven: voucherRules.money(
            (Number(entry.sellerSubsidyGiven) || 0) +
              voucherRules.money(evaluation.sellerFundedAmount),
          ),
          ordersGenerated: Math.max(0, Number(entry.ordersGenerated) || 0) + incoming.length,
          grossSalesFromVoucher: voucherRules.money(
            (Number(entry.grossSalesFromVoucher) || 0) +
              incoming.reduce(
                (sum, item) =>
                  sum +
                  voucherRules.money(item?.unitPrice) *
                    Math.max(1, Number(item?.quantity) || 1),
                0,
              ),
          ),
          updatedAt: stamp,
        };
        const liveStatus = voucherRules.resolveCampaignStatus(nextRecord, Date.now());
        if (liveStatus !== nextRecord.status) {
          nextRecord.status = liveStatus;
          nextRecord.statusAt = stamp;
          if (liveStatus === "fully_redeemed" || liveStatus === "budget_exhausted") {
            nextRecord.action = "used";
          }
        }
        return nextRecord;
      });
      if (changed) await writeVouchers(nextVouchers);
      return { orders: nextOrders, snapshot, evaluation };
    });
  }

  async function recordVoucherUsesFromOrders(orders, accountId = "") {
    const userId =
      normalizeAccountKey(accountId) ||
      normalizeAccountKey(
        (Array.isArray(orders) ? orders : []).find(
          (entry) => normalizeAccountKey(entry?.accountId),
        )?.accountId,
      );
    const refs = collectVoucherRefsFromOrders(orders);
    return recordVoucherUses({
      accountId: userId,
      voucherIds: refs.voucherIds,
      voucherCodes: refs.voucherCodes,
    });
  }

  /** Validates every payload before writing, so a batch is saved all-or-nothing. */
  async function persistCreatedVouchers(payloads) {
    await syncScheduledVouchers();
    const vouchers = await readVouchers({ persistPurge: false });
    const schedules = await readSchedules();
    const stamp = nowIso();
    const drafts = payloads.map((payload) => ({
      ...normalizeVoucher(payload),
      createdAt: stamp,
      updatedAt: stamp,
    }));
    const known = [...vouchers, ...schedules];
    for (const draft of drafts) {
      if (codeTaken(draft.code, known)) {
        throw new Error(
          drafts.length > 1
            ? `A voucher with code ${draft.code} already exists.`
            : "A voucher with this code already exists.",
        );
      }
      known.push(draft);
    }
    const records = drafts.map((draft) =>
      isUpcomingStartDate(draft.startDate) ? stripLiveId(draft, newScheduleId()) : draft,
    );
    const newSchedules = records.filter((record) => !String(record.id || "").trim());
    const newLive = records.filter((record) => String(record.id || "").trim());
    const nextSchedules = newSchedules.length ? [...newSchedules, ...schedules] : schedules;
    const nextVouchers = newLive.length ? [...newLive, ...vouchers] : vouchers;
    if (newSchedules.length) await writeSchedules(nextSchedules);
    if (newLive.length) await writeVouchers(nextVouchers);
    return {
      records,
      merged: await decorateMergedVouchers(nextVouchers, nextSchedules),
      scheduledCount: newSchedules.length,
    };
  }

  async function persistCreatedVoucher(payload) {
    const saved = await persistCreatedVouchers([payload]);
    return {
      record: saved.records[0],
      merged: saved.merged,
      scheduled: saved.scheduledCount > 0,
    };
  }

  async function handleList(request, response, requestUrl) {
    try {
      await syncScheduledVouchers();
      const vouchers = await decorateVouchers(await readVouchers());
      const platformFilter = normalizePlatformId(
        requestUrl?.searchParams?.get("platform") ||
          requestUrl?.searchParams?.get("platformId") ||
          "",
      );
      const filtered = filterVouchersForPublicList(vouchers, requestUrl);
      sendJson(response, 200, {
        vouchers: filtered.map((entry) => toPublicVoucher(entry, requestUrl)),
        total: filtered.length,
        platformId: platformFilter || PLATFORM_ID_ALL,
      });
    } catch (error) {
      sendJson(response, 500, {
        message: error instanceof Error ? error.message : "Unable to load vouchers.",
      });
    }
  }

  async function handleCreate(request, response) {
    if (!requireSuperAdmin(request, response)) return;
    try {
      const {
        getPlatformSettings,
        isPlatformSettingBlocking,
        buildPlatformBlockedPayload,
      } = require("./platformSettings");
      const platformSettings = await getPlatformSettings();
      if (isPlatformSettingBlocking(platformSettings, "promosAndDiscounts")) {
        sendJson(
          response,
          403,
          buildPlatformBlockedPayload(
            "promosAndDiscounts",
            "Promos and discounts are currently disabled by Super Admin.",
          ),
        );
        return;
      }
      const body = await parseRequestBody(request);
      const batch = Array.isArray(body?.vouchers) ? body.vouchers : null;
      if (batch && (!batch.length || batch.length > 50)) {
        throw new Error("Send between 1 and 50 vouchers at a time.");
      }
      const payloads = (batch || [body]).map((entry) =>
        entry && typeof entry === "object" ? { ...entry } : {},
      );
      if (typeof getRequestAdminId === "function") {
        const actor = String(getRequestAdminId(request) || "").trim();
        if (actor) payloads.forEach((payload) => { payload.createdBy = actor; });
      }
      const saved = await persistCreatedVouchers(payloads);
      for (const record of saved.records) {
        if (
          record?.scopeType !== voucherRules.SCOPE_TYPES.SELLERS ||
          !Array.isArray(record.includeSellerIds)
        ) {
          continue;
        }
        for (const sellerId of record.includeSellerIds) {
          await notifySellerSaVoucherAction({
            action: "updated",
            voucher: { ...record, sellerAdminId: sellerId },
            request,
          });
        }
      }
      const count = saved.records.length;
      const noun = count === 1 ? "Voucher" : `${count} vouchers`;
      sendJson(response, 201, {
        voucher: toPublicVoucher(saved.records[0]),
        createdVouchers: saved.records.map(toPublicVoucher),
        vouchers: saved.merged.map(toPublicVoucher),
        message:
          saved.scheduledCount === count
            ? `${noun} scheduled.`
            : `${noun} created.`,
      });
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : "Unable to create voucher.",
      });
    }
  }

  async function handleUpdate(request, response, voucherId) {
    if (!requireSuperAdmin(request, response)) return;
    try {
      const payload = await parseRequestBody(request);
      await syncScheduledVouchers();
      const vouchers = await readVouchers({ persistPurge: false });
      const schedules = await readSchedules();
      const liveIndex = findRecordByKey(vouchers, voucherId);
      const schedIndex = findRecordByKey(schedules, voucherId);
      const existing =
        liveIndex >= 0
          ? vouchers[liveIndex]
          : schedIndex >= 0
            ? schedules[schedIndex]
            : null;
      if (!existing) {
        sendJson(response, 404, { message: "Voucher not found." });
        return;
      }
      if (String(existing.sellerAdminId || "").trim()) {
        sendJson(response, 403, {
          message: "Seller-created vouchers cannot be edited by Super Admin.",
        });
        return;
      }
      const existingForNormalize = {
        ...existing,
        id: existing.id || "pending-schedule",
      };
      const next = {
        ...normalizeVoucher(
          {
            ...payload,
            // Preserve store ownership; SA cannot reassign seller scope here.
            sellerAdminId: existing.sellerAdminId || payload?.sellerAdminId || "",
            platformId: existing.sellerAdminId
              ? PLATFORM_ID_ALL
              : payload?.platformId ?? existing.platformId,
          },
          existingForNormalize,
        ),
        createdAt: existing.createdAt || nowIso(),
        updatedAt: nowIso(),
      };
      if (codeTaken(next.code, [...vouchers, ...schedules], voucherRecordKey(existing))) {
        throw new Error("A voucher with this code already exists.");
      }
      let record = next;
      let nextVouchers = [...vouchers];
      let nextSchedules = [...schedules];
      if (isUpcomingStartDate(next.startDate)) {
        record = stripLiveId(next, existing.scheduleId || newScheduleId());
        if (schedIndex >= 0) nextSchedules[schedIndex] = record;
        else nextSchedules = [record, ...nextSchedules];
        if (liveIndex >= 0) nextVouchers.splice(liveIndex, 1);
      } else {
        const liveId =
          String(existing.id || "").trim() && existing.id !== "pending-schedule"
            ? existing.id
            : newId();
        record = { ...next, id: liveId };
        delete record.scheduleId;
        if (liveIndex >= 0) nextVouchers[liveIndex] = record;
        else nextVouchers = [record, ...nextVouchers];
        if (schedIndex >= 0) nextSchedules.splice(schedIndex, 1);
      }
      await writeVouchers(nextVouchers);
      await writeSchedules(nextSchedules);
      const merged = await decorateMergedVouchers(nextVouchers, nextSchedules);
      if (existing.sellerAdminId) {
        await notifySellerSaVoucherAction({
          action: "updated",
          voucher: record,
          request,
        });
      }
      sendJson(response, 200, {
        voucher: toPublicVoucher(record),
        vouchers: merged.map(toPublicVoucher),
        message: isUpcomingStartDate(record.startDate)
          ? "Voucher schedule updated."
          : "Voucher updated.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : "Unable to update voucher.",
      });
    }
  }

  async function handleSellerList(request, response, requestUrl) {
    const sellerAdminId = requireSellerAdminScope(request, response, requestUrl);
    if (!sellerAdminId) return;
    try {
      const vouchers = await listAdminVouchers();
      const scoped = vouchers.filter((entry) =>
        voucherOwnedBySeller(entry, sellerAdminId),
      );
      sendJson(response, 200, {
        vouchers: scoped.map(toPublicVoucher),
        total: scoped.length,
        sellerAdminId,
      });
    } catch (error) {
      sendJson(response, 500, {
        message:
          error instanceof Error ? error.message : "Unable to load store vouchers.",
      });
    }
  }

  async function handleSellerCreate(request, response, requestUrl) {
    const sellerAdminId = requireSellerAdminScope(request, response, requestUrl);
    if (!sellerAdminId) return;
    if (
      typeof requireAdminRestrictionAllowed === "function" &&
      !(await requireAdminRestrictionAllowed(
        request,
        response,
        requestUrl,
        "create_promos",
        sellerAdminId,
      ))
    ) {
      return;
    }
    try {
      const payload = await parseRequestBody(request);
      const accounts =
        typeof readAccounts === "function" ? await readAccounts() : [];
      const account =
        typeof findAdminAccountByScopeId === "function"
          ? findAdminAccountByScopeId(accounts, sellerAdminId)
          : null;
      const enforcement = getAccountVoucherEnforcement(account);
      if (enforcement) {
        sendJson(response, 403, {
          message:
            enforcement.key === "banned"
              ? "Store vouchers cannot be created while the company is banned."
              : "Store vouchers cannot be created while the company is restricted.",
        });
        return;
      }
      const storeName = resolveSellerAccountLabel(account);
      const saved = await persistCreatedVoucher({
        ...payload,
        // Seller cannot choose platform — voucher is store-scoped only.
        platformId: PLATFORM_ID_ALL,
        sellerAdminId,
        badge: String(payload?.badge || storeName).trim() || storeName,
        companyLogoUrl: resolveSellerCompanyPictureUrl(account),
      });
      saved.record.sellerAdminId = sellerAdminId;
      saved.record.platformId = PLATFORM_ID_ALL;
      await notifySuperAdminSellerVoucherAction({
        action: "created",
        voucher: saved.record,
        sellerAdminId,
        request,
      });
      const scoped = saved.merged.filter((entry) =>
        voucherOwnedBySeller(entry, sellerAdminId),
      );
      sendJson(response, 201, {
        voucher: toPublicVoucher(saved.record),
        vouchers: scoped.map(toPublicVoucher),
        message: saved.scheduled
          ? "Store voucher scheduled."
          : "Store voucher created.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message:
          error instanceof Error ? error.message : "Unable to create store voucher.",
      });
    }
  }

  async function handleSellerDelete(request, response, requestUrl, voucherId) {
    const sellerAdminId = requireSellerAdminScope(request, response, requestUrl);
    if (!sellerAdminId) return;
    if (
      typeof requireAdminRestrictionAllowed === "function" &&
      !(await requireAdminRestrictionAllowed(
        request,
        response,
        requestUrl,
        "create_promos",
        sellerAdminId,
      ))
    ) {
      return;
    }
    try {
      await syncScheduledVouchers();
      const vouchers = await readVouchers({ persistPurge: false });
      const schedules = await readSchedules();
      const liveIndex = findRecordByKey(vouchers, voucherId);
      const schedIndex = findRecordByKey(schedules, voucherId);
      const target =
        liveIndex >= 0
          ? vouchers[liveIndex]
          : schedIndex >= 0
            ? schedules[schedIndex]
            : null;
      if (!target || !voucherOwnedBySeller(target, sellerAdminId)) {
        sendJson(response, 404, { message: "Store voucher not found." });
        return;
      }
      const nextVouchers =
        liveIndex >= 0 ? vouchers.filter((_, index) => index !== liveIndex) : vouchers;
      const nextSchedules =
        schedIndex >= 0
          ? schedules.filter((_, index) => index !== schedIndex)
          : schedules;
      if (liveIndex >= 0) await writeVouchers(nextVouchers);
      if (schedIndex >= 0) await writeSchedules(nextSchedules);
      await notifySuperAdminSellerVoucherAction({
        action: "deleted",
        voucher: target,
        sellerAdminId,
        request,
      });
      const merged = await decorateMergedVouchers(nextVouchers, nextSchedules);
      const scoped = merged.filter((entry) =>
        voucherOwnedBySeller(entry, sellerAdminId),
      );
      sendJson(response, 200, {
        vouchers: scoped.map(toPublicVoucher),
        message: "Store voucher deleted.",
      });
    } catch (error) {
      sendJson(response, 500, {
        message:
          error instanceof Error ? error.message : "Unable to delete store voucher.",
      });
    }
  }

  async function handleDelete(request, response, voucherId) {
    if (!requireSuperAdmin(request, response)) return;
    try {
      await syncScheduledVouchers();
      const vouchers = await readVouchers({ persistPurge: false });
      const schedules = await readSchedules();
      const liveIndex = findRecordByKey(vouchers, voucherId);
      const schedIndex = findRecordByKey(schedules, voucherId);
      const target =
        liveIndex >= 0
          ? vouchers[liveIndex]
          : schedIndex >= 0
            ? schedules[schedIndex]
            : null;
      if (!target) {
        sendJson(response, 404, { message: "Voucher not found." });
        return;
      }
      const usedTimes = Math.max(0, Number(target.usedTimes) || 0);
      if (usedTimes > 0 || (Array.isArray(target.usedByUserIds) && target.usedByUserIds.length)) {
        const cancelled = {
          ...target,
          status: "cancelled",
          action: "expired",
          updatedAt: nowIso(),
          statusAt: nowIso(),
        };
        if (liveIndex >= 0) {
          const nextVouchers = [...vouchers];
          nextVouchers[liveIndex] = cancelled;
          await writeVouchers(nextVouchers);
        }
        if (schedIndex >= 0) {
          const nextSchedules = [...schedules];
          nextSchedules[schedIndex] = cancelled;
          await writeSchedules(nextSchedules);
        }
        if (target.sellerAdminId) {
          await notifySellerSaVoucherAction({
            action: "updated",
            voucher: cancelled,
            request,
          });
        }
        const merged = await decorateMergedVouchers(
          liveIndex >= 0
            ? vouchers.map((entry, index) => (index === liveIndex ? cancelled : entry))
            : vouchers,
          schedIndex >= 0
            ? schedules.map((entry, index) => (index === schedIndex ? cancelled : entry))
            : schedules,
        );
        sendJson(response, 200, {
          voucher: toPublicVoucher(cancelled),
          vouchers: merged.map(toPublicVoucher),
          message: "Voucher cancelled because it already has redemptions.",
        });
        return;
      }
      const nextVouchers =
        liveIndex >= 0 ? vouchers.filter((_, index) => index !== liveIndex) : vouchers;
      const nextSchedules =
        schedIndex >= 0
          ? schedules.filter((_, index) => index !== schedIndex)
          : schedules;
      if (liveIndex >= 0) await writeVouchers(nextVouchers);
      if (schedIndex >= 0) await writeSchedules(nextSchedules);
      if (target.sellerAdminId) {
        await notifySellerSaVoucherAction({
          action: "deleted",
          voucher: target,
          request,
        });
      }
      const merged = await decorateMergedVouchers(nextVouchers, nextSchedules);
      sendJson(response, 200, {
        vouchers: merged.map(toPublicVoucher),
        message: "Voucher deleted.",
      });
    } catch (error) {
      sendJson(response, 500, {
        message: error instanceof Error ? error.message : "Unable to delete voucher.",
      });
    }
  }

  async function persistLifecycleStatus(voucherId, nextStatus) {
    await syncScheduledVouchers();
    const vouchers = await readVouchers({ persistPurge: false });
    const schedules = await readSchedules();
    const liveIndex = findRecordByKey(vouchers, voucherId);
    const schedIndex = findRecordByKey(schedules, voucherId);
    const existing =
      liveIndex >= 0
        ? vouchers[liveIndex]
        : schedIndex >= 0
          ? schedules[schedIndex]
          : null;
    if (!existing) return null;
    const stamp = nowIso();
    const record = {
      ...existing,
      status: nextStatus,
      action:
        nextStatus === "active" || nextStatus === "scheduled"
          ? "useNow"
          : "expired",
      updatedAt: stamp,
      statusAt: stamp,
    };
    const nextVouchers = [...vouchers];
    const nextSchedules = [...schedules];
    if (liveIndex >= 0) nextVouchers[liveIndex] = record;
    if (schedIndex >= 0) nextSchedules[schedIndex] = record;
    if (liveIndex >= 0) await writeVouchers(nextVouchers);
    if (schedIndex >= 0) await writeSchedules(nextSchedules);
    return {
      record,
      merged: await decorateMergedVouchers(nextVouchers, nextSchedules),
    };
  }

  async function handleLifecycle(request, response, voucherId, nextStatus) {
    if (!requireSuperAdmin(request, response)) return;
    try {
      const saved = await persistLifecycleStatus(voucherId, nextStatus);
      if (!saved) {
        sendJson(response, 404, { message: "Voucher not found." });
        return;
      }
      sendJson(response, 200, {
        voucher: toPublicVoucher(saved.record),
        vouchers: saved.merged.map(toPublicVoucher),
        message:
          nextStatus === "paused"
            ? "Voucher paused."
            : nextStatus === "active"
              ? "Voucher resumed."
              : nextStatus === "cancelled"
                ? "Voucher cancelled."
                : "Voucher updated.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : "Unable to update voucher.",
      });
    }
  }

  async function handleDuplicate(request, response, voucherId) {
    if (!requireSuperAdmin(request, response)) return;
    try {
      await syncScheduledVouchers();
      const vouchers = await readVouchers({ persistPurge: false });
      const schedules = await readSchedules();
      const existing =
        vouchers.find((entry) => voucherRecordKey(entry) === voucherId) ||
        schedules.find((entry) => voucherRecordKey(entry) === voucherId);
      if (!existing) {
        sendJson(response, 404, { message: "Voucher not found." });
        return;
      }
      const baseCode = String(existing.code || "COPY").replace(/[^A-Z0-9_-]/gi, "").slice(0, 24);
      let nextCode = `${baseCode}X`;
      let guard = 0;
      while (codeTaken(nextCode, [...vouchers, ...schedules]) && guard < 8) {
        nextCode = `${baseCode}${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
        guard += 1;
      }
      const saved = await persistCreatedVoucher({
        ...existing,
        id: undefined,
        scheduleId: undefined,
        code: nextCode,
        title: String(existing.title || "").trim() || nextCode,
        status: "active",
        usedByUserIds: [],
        usedByUserCounts: {},
        usedTimes: 0,
        usedCount: 0,
        usedBudget: 0,
        claimedByUserIds: [],
        claimedCount: 0,
        totalDiscountGiven: 0,
        platformSubsidyGiven: 0,
        sellerSubsidyGiven: 0,
        ordersGenerated: 0,
        grossSalesFromVoucher: 0,
      });
      sendJson(response, 201, {
        voucher: toPublicVoucher(saved.record),
        vouchers: saved.merged.map(toPublicVoucher),
        message: "Voucher duplicated.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : "Unable to duplicate voucher.",
      });
    }
  }

  async function handleClaim(request, response, requestUrl, voucherId) {
    try {
      const body =
        request.method === "POST" ? await parseRequestBody(request).catch(() => ({})) : {};
      const userId = normalizeAccountKey(
        (typeof getRequestAccountIdentifier === "function"
          ? getRequestAccountIdentifier(request, requestUrl)?.id
          : "") ||
          requestUrl?.searchParams?.get("accountId") ||
          body?.accountId,
      );
      if (!userId) {
        sendJson(response, 401, { message: "Sign in to claim this voucher." });
        return;
      }
      const saved = await enqueueVoucherMutation(async () => {
        const vouchers = await readVouchers({ persistPurge: false });
        const index = findRecordByKey(vouchers, voucherId);
        if (index < 0) return null;
        const voucher = vouchers[index];
        const method = voucherRules.normalizeRedemptionMethod(
          voucher.redemptionMethod,
          voucher,
        );
        if (method !== voucherRules.REDEMPTION_METHODS.CLAIM) {
          throw new Error("This voucher is not a claim voucher.");
        }
        const claimedByUserIds = normalizeUsedByUserIds(voucher.claimedByUserIds);
        if (claimedByUserIds.includes(userId)) {
          return voucher;
        }
        const next = {
          ...voucher,
          claimedByUserIds: [...claimedByUserIds, userId],
          claimedCount: Math.max(claimedByUserIds.length + 1, Number(voucher.claimedCount) || 0),
          updatedAt: nowIso(),
        };
        const nextVouchers = [...vouchers];
        nextVouchers[index] = next;
        await writeVouchers(nextVouchers);
        return next;
      });
      if (!saved) {
        sendJson(response, 404, { message: "Voucher not found." });
        return;
      }
      sendJson(response, 200, {
        voucher: toPublicVoucher(saved, requestUrl),
        message: "Voucher claimed.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : "Unable to claim voucher.",
      });
    }
  }

  async function handleEvaluate(request, response, requestUrl) {
    try {
      const payload = await parseRequestBody(request);
      const vouchers = await readVouchers({ persistPurge: false });
      const voucher =
        vouchers.find(
          (entry) => String(entry.id || "").trim() === String(payload?.voucherId || "").trim(),
        ) ||
        vouchers.find(
          (entry) => normalizeCode(entry.code) === normalizeCode(payload?.voucherCode),
        );
      if (!voucher) {
        sendJson(response, 404, { message: "Voucher not found." });
        return;
      }
      const accountId = normalizeAccountKey(
        payload?.accountId ||
          (typeof getRequestAccountIdentifier === "function"
            ? getRequestAccountIdentifier(request, requestUrl)?.id
            : ""),
      );
      const lines = await enrichLinesWithProductCategories(
        Array.isArray(payload?.lines) ? payload.lines : [],
        [voucher],
      );
      const result = voucherRules.evaluateVoucher(voucher, {
        lines,
        shippingFee: payload?.shippingFee,
        hasFlashDeal: Boolean(payload?.hasFlashDeal),
        hasSellerVoucher: Boolean(payload?.hasSellerVoucher),
        hasPlatformVoucher: Boolean(payload?.hasPlatformVoucher),
        hasFreeShippingVoucher: Boolean(payload?.hasFreeShippingVoucher),
        hasRewards: Boolean(payload?.hasRewards),
        customer: payload?.customer || {},
        accountId,
        enteredCode: payload?.enteredCode || payload?.voucherCode,
        requireEnteredCode: Boolean(payload?.requireEnteredCode),
      });
      sendJson(response, 200, {
        ok: result.ok,
        result,
        snapshot: result.ok ? voucherRules.buildOrderSnapshot(voucher, result) : null,
      });
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : "Unable to evaluate voucher.",
      });
    }
  }

  async function tryHandleVoucherRoutes(request, response, requestUrl) {
    const pathname = requestUrl.pathname;

    if (pathname === "/api/vouchers/evaluate") {
      if (request.method === "POST") {
        await handleEvaluate(request, response, requestUrl);
        return true;
      }
      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

    if (pathname === "/api/vouchers") {
      if (request.method === "GET") {
        await handleList(request, response, requestUrl);
        return true;
      }
      if (request.method === "POST") {
        await handleCreate(request, response);
        return true;
      }
      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

    if (pathname === "/api/admin/vouchers") {
      if (request.method === "GET") {
        await handleSellerList(request, response, requestUrl);
        return true;
      }
      if (request.method === "POST") {
        await handleSellerCreate(request, response, requestUrl);
        return true;
      }
      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

    if (pathname === "/api/super-admin/vouchers") {
      if (request.method === "GET") {
        if (!requireSuperAdmin(request, response)) return true;
        try {
          const allVouchers = await listAdminVouchers();
          const vouchers = filterAdminDirectoryVouchers(allVouchers, requestUrl);
          const paged = paginateAdminDirectoryVouchers(vouchers, requestUrl);
          sendJson(response, 200, {
            vouchers: paged.vouchers.map(toPublicVoucher),
            total: paged.total,
            page: paged.page,
            limit: paged.limit,
            pageCount: paged.pageCount,
            platformId: PLATFORM_ID_ALL,
            subnav: buildVoucherSubnav(allVouchers),
          });
        } catch (error) {
          sendJson(response, 500, {
            message:
              error instanceof Error ? error.message : "Unable to load vouchers.",
          });
        }
        return true;
      }
      if (request.method === "POST") {
        await handleCreate(request, response);
        return true;
      }
      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

    const claimMatch = pathname.match(/^\/api\/vouchers\/([^/]+)\/claim$/);
    if (claimMatch) {
      if (request.method === "POST") {
        await handleClaim(
          request,
          response,
          requestUrl,
          decodeURIComponent(claimMatch[1] || "").trim(),
        );
        return true;
      }
      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

    const lifecycleMatch = pathname.match(
      /^\/api\/super-admin\/vouchers\/([^/]+)\/(pause|resume|cancel|duplicate)$/,
    );
    if (lifecycleMatch) {
      const voucherId = decodeURIComponent(lifecycleMatch[1] || "").trim();
      const action = lifecycleMatch[2];
      if (request.method !== "POST") {
        sendJson(response, 405, { message: "Method not allowed." });
        return true;
      }
      if (action === "duplicate") {
        await handleDuplicate(request, response, voucherId);
        return true;
      }
      const nextStatus =
        action === "pause" ? "paused" : action === "resume" ? "active" : "cancelled";
      await handleLifecycle(request, response, voucherId, nextStatus);
      return true;
    }

    const adminItemMatch = pathname.match(/^\/api\/admin\/vouchers\/([^/]+)$/);
    if (adminItemMatch) {
      const voucherId = decodeURIComponent(adminItemMatch[1] || "").trim();
      if (!voucherId) {
        sendJson(response, 400, { message: "Voucher id is required." });
        return true;
      }
      if (request.method === "DELETE") {
        await handleSellerDelete(request, response, requestUrl, voucherId);
        return true;
      }
      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

    const itemMatch = pathname.match(/^\/api\/(?:super-admin\/)?vouchers\/([^/]+)$/);
    if (itemMatch) {
      const voucherId = decodeURIComponent(itemMatch[1] || "").trim();
      if (!voucherId) {
        sendJson(response, 400, { message: "Voucher id is required." });
        return true;
      }
      if (request.method === "PUT" || request.method === "PATCH") {
        await handleUpdate(request, response, voucherId);
        return true;
      }
      if (request.method === "DELETE") {
        await handleDelete(request, response, voucherId);
        return true;
      }
      if (request.method === "GET") {
        try {
          await syncScheduledVouchers();
          const isSuperAdminPath = pathname.startsWith("/api/super-admin/");
          const vouchers = isSuperAdminPath
            ? await decorateMergedVouchers(
                await readVouchers(),
                await readSchedules(),
              )
            : await decorateVouchers(await readVouchers());
          const voucher = vouchers.find(
            (entry) => voucherRecordKey(entry) === voucherId,
          );
          if (
            !voucher ||
            (!isSuperAdminPath &&
              (!String(voucher.id || "").trim() ||
                isUpcomingStartDate(voucher.startDate) ||
                (isRepeatWeeklyVoucher(voucher) &&
                  !isRepeatWindowOpen(voucher))))
          ) {
            sendJson(response, 404, { message: "Voucher not found." });
            return true;
          }
          sendJson(response, 200, {
            voucher: toPublicVoucher(voucher, requestUrl),
          });
        } catch (error) {
          sendJson(response, 500, {
            message:
              error instanceof Error ? error.message : "Unable to load voucher.",
          });
        }
        return true;
      }
      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

    return false;
  }

  return {
    tryHandleVoucherRoutes,
    readVouchers,
    recordVoucherUses,
    recordVoucherUsesFromOrders,
    consumeVouchersForOrders,
    setSellerVouchersEnforcement,
  };
}

module.exports = {
  createVouchersApi,
};
