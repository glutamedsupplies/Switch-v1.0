"use strict";

const path = require("path");
const crypto = require("crypto");
const fsPromises = require("fs/promises");
const { createRateLimiter } = require("../security/rateLimit");
const {
  REASON_CATEGORIES,
  REVIEW_DECISIONS,
  DEFAULT_WARNING_THRESHOLD,
  DEFAULT_MAJORITY_RATIO,
  DEFAULT_MAJORITY_MIN_REPORTERS,
  normalizeReasonCategory,
  reasonCategoryLabel,
  sanitizeReasonText,
  sanitizeEvidenceUrls,
  computeCompanyReportRisk,
  canBuyerFileReport,
  hasOpenReportFromBuyer,
  publicReportForBuyer,
  adminReportView,
  pickCompanyLogoUrl,
  allocateReportId,
  assignPublicReportIds,
  getPublicReportId,
  reportMatchesPublicId,
} = require("./companyReports");
const { normalizeListingReasonCategory } = require("./listingReports");

const MAX_COMPANY_REPORTS = 10_000;
const BUYER_REPORTS_PER_DAY = 5;
const REPORT_RESOLUTION_ACTIONS = new Set(["warning", "restrict", "ban"]);
const REPORT_RESOLUTION_STATES = new Set(["pending", "applied", "failed"]);
const REPORT_RESTRICTION_LIMIT_LABELS = new Map([
  ["post_products", "Post products"],
  ["edit_products", "Edit products"],
  ["manage_inventory", "Manage inventory"],
  ["process_orders", "Process orders"],
  ["create_promos", "Create promos"],
  ["update_store_profile", "Update store profile"],
  ["manage_employees", "Manage employees"],
  ["access_payouts", "Access payouts"],
]);

function createCompanyReportsApi(deps) {
  const {
    DATA_DIR,
    ensureStoragePaths,
    writeJsonFileAtomically,
    enqueueSerializedMutation,
    requireSuperAdmin,
    sendJson,
    parseRequestBody,
    createHttpError,
    persistSuperAdminNotification,
    createPersistentLinkedNotification,
    notifySellerAdminInboxByAdminId,
    findCompanyById,
    logActivitySafely,
    readAccounts,
    writeAccounts,
    readProducts,
    readOrders,
    findAdminAccountByScopeId,
    applySuperAdminSellerNotifyAction,
    getRecordAdminId,
    SUPER_ADMIN_USERNAME = "super-admin",
    getRequestClientIp,
    resolveSaNotificationUserActor,
  } = deps;

  const REPORTS_FILE = path.join(DATA_DIR, "company_reports.json");
  const warningThreshold = Math.max(
    2,
    Number(process.env.COMPANY_REPORT_WARNING_THRESHOLD) || DEFAULT_WARNING_THRESHOLD,
  );
  const buyerLimiter = createRateLimiter({
    max: BUYER_REPORTS_PER_DAY,
    windowMs: 24 * 60 * 60 * 1000,
  });
  const ipLimiter = createRateLimiter({
    max: 20,
    windowMs: 24 * 60 * 60 * 1000,
  });

  function nowIso() {
    return new Date().toISOString();
  }

  function compactText(value, maxLength = 500) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
  }

  function normalizeResolutionAction(value) {
    const token = String(value || "").trim().toLowerCase().replace(/[\s_]+/g, "-");
    const normalized = token === "warn" || token === "warning"
      ? "warning"
      : token === "restricted"
        ? "restrict"
        : token === "banned"
          ? "ban"
          : token;
    return REPORT_RESOLUTION_ACTIONS.has(normalized) ? normalized : "";
  }

  function normalizeResolutionState(value) {
    const state = String(value || "").trim().toLowerCase();
    return REPORT_RESOLUTION_STATES.has(state) ? state : "";
  }

  function reportResolutionError(message, statusCode, code) {
    const error = fail(message, statusCode);
    error.code = code;
    return error;
  }

  function sanitizeResolutionEnforcement(action, input = {}) {
    const source = input && typeof input === "object" ? input : {};
    if (action === "warning") {
      return {};
    }
    if (action === "ban") {
      const banReason = compactText(source.banReason ?? source.reason, 500);
      const banDescription = compactText(
        source.banDescription ?? source.description ?? source.banDetails,
        500,
      );
      if (!banReason) {
        throw reportResolutionError("Ban reason is required.", 400, "BAN_REASON_REQUIRED");
      }
      return {
        banType: "permanent",
        banReason,
        banDescription,
      };
    }

    const restrictionReason = compactText(
      source.restrictionReason ?? source.restrictReason ?? source.reasonForRestriction ?? source.reason,
      500,
    );
    const restrictionDescription = compactText(
      source.restrictionDescription ?? source.restrictDescription ?? source.description,
      500,
    );
    const restrictDurationValue = Math.trunc(Number(
      source.restrictDurationValue ?? source.durationValue ?? source.duration ?? 0,
    ));
    const restrictDurationUnit = String(
      source.restrictDurationUnit ?? source.durationUnit ?? "hours",
    ).trim().toLowerCase() === "days" ? "days" : "hours";
    const rawLimits = Array.isArray(source.restrictionLimits)
      ? source.restrictionLimits
      : Array.isArray(source.restrictLimits)
        ? source.restrictLimits
        : String(source.restrictionLimits ?? source.restrictLimits ?? "").split(",");
    const restrictionLimits = [...new Set(rawLimits
      .map((value) => String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_"))
      .filter((value) => REPORT_RESTRICTION_LIMIT_LABELS.has(value)))]
      .slice(0, 4);

    if (!restrictionReason) {
      throw reportResolutionError(
        "Restriction reason is required.",
        400,
        "RESTRICTION_REASON_REQUIRED",
      );
    }
    if (!Number.isFinite(restrictDurationValue) || restrictDurationValue < 1) {
      throw reportResolutionError(
        "Restriction duration is required.",
        400,
        "RESTRICTION_DURATION_REQUIRED",
      );
    }
    if (!restrictionLimits.length) {
      throw reportResolutionError(
        "Select at least one access limit.",
        400,
        "RESTRICTION_LIMIT_REQUIRED",
      );
    }

    return {
      restrictionReason,
      restrictionDescription,
      restrictDurationValue,
      restrictDurationUnit,
      restrictionLimits,
      restrictionLimitLabels: restrictionLimits.map(
        (value) => REPORT_RESTRICTION_LIMIT_LABELS.get(value) || value,
      ),
    };
  }

  function accountHasReportWarning(account, reportId) {
    const wanted = String(reportId || "").trim().toLowerCase();
    if (!wanted || !account || typeof account !== "object") {
      return false;
    }
    const notifications = Array.isArray(account.sellerNotifications)
      ? account.sellerNotifications
      : [];
    return notifications.some((notification) =>
      String(notification?.type || "").trim().toLowerCase() === "warning"
      && String(notification?.reportId || "").trim().toLowerCase() === wanted
    );
  }

  function newReportId() {
    return `cr_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
  }

  async function readReports() {
    await ensureStoragePaths();
    try {
      await fsPromises.access(REPORTS_FILE);
    } catch (_) {
      await writeJsonFileAtomically(REPORTS_FILE, []);
      return [];
    }
    try {
      const raw = await fsPromises.readFile(REPORTS_FILE, "utf8");
      const decoded = JSON.parse(raw);
      const assigned = assignPublicReportIds(Array.isArray(decoded) ? decoded : []);
      if (assigned.changed) {
        await writeReports(assigned.reports);
      }
      return assigned.reports;
    } catch (_) {
      return [];
    }
  }

  async function writeReports(reports) {
    const list = Array.isArray(reports) ? reports.slice() : [];
    if (list.length > MAX_COMPANY_REPORTS) {
      const keep = [];
      const overflow = [];
      for (const report of list) {
        if (String(report?.status || "").toLowerCase() === "dismissed") {
          overflow.push(report);
        } else {
          keep.push(report);
        }
      }
      const room = Math.max(0, MAX_COMPANY_REPORTS - keep.length);
      overflow.sort((left, right) => String(right?.createdAt || "").localeCompare(String(left?.createdAt || "")));
      await writeJsonFileAtomically(REPORTS_FILE, [...keep, ...overflow.slice(0, room)]);
      return;
    }
    await writeJsonFileAtomically(REPORTS_FILE, list);
  }

  function companyKeysFromAdmin(admin) {
    return [
      admin?.companyId,
      admin?.company_id,
      admin?.adminId,
      admin?.id,
      admin?.accountId,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);
  }

  function reportMatchesKeys(report, keys) {
    const set = new Set((keys || []).map((value) => String(value || "").trim().toLowerCase()).filter(Boolean));
    if (!set.size) {
      return false;
    }
    return set.has(String(report?.companyId || "").trim().toLowerCase())
      || set.has(String(report?.adminId || "").trim().toLowerCase());
  }

  function reportsForKeys(reports, keys) {
    return (Array.isArray(reports) ? reports : []).filter((report) => reportMatchesKeys(report, keys));
  }

  function uniqueBuyerCountForCompany(orders, keys) {
    const set = new Set((keys || []).map((value) => String(value || "").trim().toLowerCase()).filter(Boolean));
    const buyers = new Set();
    if (!set.size) {
      return 0;
    }
    for (const order of Array.isArray(orders) ? orders : []) {
      const companyHit = [
        order?.companyId,
        order?.company_id,
        order?.adminId,
        order?.sellerAdminId,
        order?.sellerId,
      ]
        .map((value) => String(value || "").trim().toLowerCase())
        .some((value) => value && set.has(value));
      if (!companyHit) {
        continue;
      }
      const buyer = String(
        order?.accountId || order?.buyerId || order?.customerId || order?.userId || "",
      )
        .trim()
        .toLowerCase();
      if (buyer) {
        buyers.add(buyer);
      }
    }
    return buyers.size;
  }

  function orderSellerKeys(order) {
    return [
      order?.companyId,
      order?.company_id,
      order?.adminId,
      order?.sellerAdminId,
      order?.sellerId,
    ]
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean);
  }

  function orderReferenceIds(order) {
    return [order?.orderGroupId, order?.orderId, order?.id]
      .map((value) => String(value || "").trim())
      .filter(Boolean);
  }

  async function findBuyerOrdersForCompany(accountId, target) {
    const buyer = String(accountId || "").trim().toLowerCase();
    if (!buyer || typeof readOrders !== "function") {
      return [];
    }
    const sellerKeys = new Set(
      [
        ...(target?.keys || []),
        ...(target?.sellerCompanyIds || []),
        ...(target?.sellerAccountIds || []),
      ]
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean),
    );
    if (!sellerKeys.size) {
      return [];
    }
    const orders = await readOrders({ accountId }).catch(() => []);
    return (Array.isArray(orders) ? orders : []).filter((order) => {
      const orderBuyer = String(
        order?.accountId || order?.buyerId || order?.customerId || order?.userId || "",
      )
        .trim()
        .toLowerCase();
      return orderBuyer === buyer
        && orderSellerKeys(order).some((key) => sellerKeys.has(key));
    });
  }

  function resolveReportOrderId(buyerOrders, requestedOrderId) {
    const requested = String(requestedOrderId || "").trim();
    const wanted = requested.toLowerCase();
    if (wanted && buyerOrders.some((order) =>
      orderReferenceIds(order).some((id) => id.toLowerCase() === wanted))) {
      return requested;
    }
    return orderReferenceIds(buyerOrders[0] || {})[0] || "";
  }

  function buildSummary(reports, keys, uniqueBuyerCount = 0) {
    const scoped = reportsForKeys(reports, keys);
    const risk = computeCompanyReportRisk({
      reports: scoped,
      uniqueBuyerCount,
      warningThreshold,
      majorityRatio: DEFAULT_MAJORITY_RATIO,
      majorityMinReporters: DEFAULT_MAJORITY_MIN_REPORTERS,
    });
    return {
      ...risk,
      reportCount: risk.openCount,
      reports: risk.openCount,
      warningThreshold,
    };
  }

  async function getSummariesByCompanyKeys(admins) {
    const reports = await readReports();
    const orders = typeof readOrders === "function" ? await readOrders().catch(() => []) : [];
    const map = new Map();
    for (const admin of Array.isArray(admins) ? admins : []) {
      const keys = companyKeysFromAdmin(admin);
      const summary = buildSummary(reports, keys, uniqueBuyerCountForCompany(orders, keys));
      const primary = String(admin?.adminId || admin?.id || admin?.companyId || "").trim();
      if (primary) {
        map.set(primary, summary);
      }
      for (const key of keys) {
        map.set(key, summary);
      }
    }
    return map;
  }

  async function attachSummaries(admins) {
    const summaries = await getSummariesByCompanyKeys(admins);
    return (Array.isArray(admins) ? admins : []).map((admin) => {
      const key = String(admin?.adminId || admin?.id || admin?.companyId || "").trim();
      const summary = summaries.get(key) || buildSummary([], companyKeysFromAdmin(admin), 0);
      return {
        ...admin,
        reportSummary: summary,
        reports: summary.openCount,
        reportCount: summary.openCount,
        needsWarning: summary.needsWarning === true,
      };
    });
  }

  async function resolveCompanyTarget({ companyId, adminId, productId }) {
    let nextCompanyId = String(companyId || "").trim();
    let nextAdminId = String(adminId || "").trim();
    let productName = "";

    if (productId && typeof readProducts === "function") {
      const products = await readProducts().catch(() => []);
      const product = (Array.isArray(products) ? products : []).find(
        (item) => String(item?.id || "").trim() === String(productId).trim(),
      );
      if (product) {
        nextCompanyId = nextCompanyId || String(product.companyId || product.company_id || "").trim();
        nextAdminId = nextAdminId || String(product.adminId || "").trim();
        productName = String(product.name || "").trim();
      }
    }

    let company = null;
    if (typeof findCompanyById === "function") {
      if (nextCompanyId) {
        company = await findCompanyById(nextCompanyId).catch(() => null);
      }
      if (!company && nextAdminId) {
        company = await findCompanyById(nextAdminId).catch(() => null);
      }
    }

    let account = null;
    if (typeof findAdminAccountByScopeId === "function" && typeof readAccounts === "function") {
      const accounts = await readAccounts().catch(() => []);
      if (nextAdminId) {
        account = findAdminAccountByScopeId(accounts, nextAdminId) || null;
      }
      if (!account && nextCompanyId) {
        account = (accounts || []).find((entry) =>
          String(entry?.companyId || entry?.company_id || "").trim() === nextCompanyId,
        ) || null;
      }
    }

    if (!company && !account) {
      return null;
    }

    const resolvedCompanyId = String(
      company?.id || account?.companyId || account?.company_id || nextCompanyId || "",
    ).trim();
    const resolvedAdminId = String(
      (typeof getRecordAdminId === "function" && account
        ? getRecordAdminId(account, account.adminId || account.id)
        : "")
      || account?.adminId
      || account?.id
      || nextAdminId
      || "",
    ).trim();
    const companyName = String(
      company?.name
      || company?.publicName
      || account?.companyName
      || account?.storeName
      || account?.businessName
      || "Company",
    ).trim() || "Company";

    const userPhoto = String(
      account?.profileImageUrl || account?.avatarUrl || account?.photoUrl || "",
    ).trim();
    return {
      company,
      account,
      companyId: resolvedCompanyId,
      adminId: resolvedAdminId,
      companyName,
      productName,
      sellerAccountIds: [
        company?.sourceAccountId,
        company?.source_account_id,
        account?.id,
        account?.accountId,
        account?.adminId,
        resolvedAdminId,
      ],
      sellerEmails: [
        company?.email,
        account?.email,
      ],
      sellerCompanyIds: [
        resolvedCompanyId,
        company?.id,
        account?.companyId,
        account?.company_id,
      ],
      companyPictureUrl: pickCompanyLogoUrl(company, userPhoto) || pickCompanyLogoUrl(account, userPhoto),
      keys: [resolvedCompanyId, resolvedAdminId].filter(Boolean),
    };
  }

  async function persistSaInbox(input) {
    if (typeof persistSuperAdminNotification !== "function" || typeof createPersistentLinkedNotification !== "function") {
      return null;
    }
    return persistSuperAdminNotification(createPersistentLinkedNotification(input));
  }

  async function maybeNotifyNeedsWarning({ target, reports, previousNeedsWarning }) {
    const orders = typeof readOrders === "function" ? await readOrders().catch(() => []) : [];
    const summary = buildSummary(
      reports,
      target.keys,
      uniqueBuyerCountForCompany(orders, target.keys),
    );
    if (!summary.needsWarning || previousNeedsWarning) {
      return summary;
    }

    await persistSaInbox({
      type: "company-needs-warning",
      category: "sellers",
      priority: "high",
      title: "This company needs warning",
      reason: summary.majorityTrigger
        ? "A majority of recent buyers reported this company"
        : `${summary.uniqueReporterCount} buyers reported this company`,
      message: `${target.companyName} has enough distinct buyer reports to need a Super Admin warning review. One report is not enough — review the cases first.`,
      adminId: target.adminId,
      companyId: target.companyId,
      companyName: target.companyName,
      companyPictureUrl: target.companyPictureUrl,
      actorType: "company",
      targetUrl: `/super_admin.html#companies?reports=1&adminId=${encodeURIComponent(target.adminId || target.companyId)}`,
      createdBy: "system",
    });

    if (target.adminId && typeof notifySellerAdminInboxByAdminId === "function") {
      await notifySellerAdminInboxByAdminId(target.adminId, {
        id: `seller-report-threshold-${target.adminId}-${Date.now()}`,
        type: "company-report-threshold",
        audience: "seller",
        title: "Buyer reports are under review",
        reason: "Multiple buyers reported this store",
        message:
          "Several buyers reported your company. Super Admin is reviewing the cases. This is not a punishment yet — one report is never enough to warn or restrict your store.",
        adminId: target.adminId,
        companyId: target.companyId,
        companyName: target.companyName,
        status: "unread",
        createdAt: nowIso(),
        createdBy: "system",
      });
    }

    if (typeof logActivitySafely === "function") {
      await logActivitySafely({
        id: `activity-company-needs-warning-${Date.now()}`,
        type: "company-needs-warning",
        action: "needs-warning",
        adminId: target.adminId,
        companyId: target.companyId,
        companyName: target.companyName,
        reason: summary.reason,
        uniqueReporterCount: summary.uniqueReporterCount,
        createdAt: nowIso(),
        createdBy: "system",
        skipLinkedNotification: true,
      });
    }

    return summary;
  }

  function requireBuyerSession(request) {
    const session = request?.authSession;
    const accountId = String(session?.accountId || "").trim();
    if (!session || !accountId) {
      throw fail("Sign in to report this company.", 401);
    }
    return {
      accountId,
      email: String(session.email || "").trim().toLowerCase(),
      name: String(session.displayName || session.username || "").trim(),
    };
  }

  function fail(message, statusCode = 400) {
    if (typeof createHttpError === "function") {
      return createHttpError(message, statusCode);
    }
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }

  function eligibilityError(result) {
    const error = fail(result.message, result.statusCode || 403);
    error.code = result.code || "";
    return error;
  }

  async function evaluateBuyerEligibility(session, input = {}) {
    const target = await resolveCompanyTarget({
      companyId: input?.companyId,
      adminId: input?.adminId,
      productId: input?.productId,
    });
    if (!target?.companyId && !target?.adminId) {
      return {
        eligible: false,
        statusCode: 404,
        code: "COMPANY_NOT_FOUND",
        message: "Company not found.",
      };
    }

    const accounts = typeof readAccounts === "function" ? await readAccounts().catch(() => []) : [];
    const reporterRecords = (Array.isArray(accounts) ? accounts : []).filter((account) => {
      const accountId = String(account?.id || account?.accountId || "").trim().toLowerCase();
      const email = String(account?.email || "").trim().toLowerCase();
      return accountId === session.accountId.toLowerCase()
        || (session.email && email === session.email);
    });
    const reporterCompanyIds = reporterRecords.flatMap((account) => [
      account?.companyId,
      account?.company_id,
    ]);

    const ownership = canBuyerFileReport({
      reporterAccountId: session.accountId,
      reporterEmail: session.email,
      reporterCompanyIds,
      sellerAccountIds: target.sellerAccountIds,
      sellerEmails: target.sellerEmails,
      sellerCompanyIds: target.sellerCompanyIds,
    });
    if (!ownership.ok) {
      return {
        eligible: false,
        statusCode: 403,
        code: "OWN_COMPANY",
        message: ownership.message,
      };
    }

    const buyerOrders = await findBuyerOrdersForCompany(session.accountId, target);
    if (!buyerOrders.length) {
      return {
        eligible: false,
        statusCode: 403,
        code: "REPORT_REQUIRES_ORDER",
        message: "You can only report a store you have ordered from. Place an order with this store first.",
      };
    }

    return { eligible: true, target, buyerOrders };
  }

  async function handleBuyerEligibility(request, response, requestUrl) {
    const session = requireBuyerSession(request);
    const params = requestUrl.searchParams;
    const result = await evaluateBuyerEligibility(session, {
      companyId: params.get("companyId"),
      adminId: params.get("adminId"),
      productId: params.get("productId"),
    });
    if (!result.eligible) {
      sendJson(response, 200, {
        eligible: false,
        code: result.code,
        message: result.message,
      });
      return;
    }
    const reports = await readReports();
    if (hasOpenReportFromBuyer(reports, session.accountId, result.target.keys)) {
      sendJson(response, 200, {
        eligible: false,
        code: "REPORT_ALREADY_OPEN",
        message: "You already have an open report on this company. Super Admin is still reviewing it.",
      });
      return;
    }
    sendJson(response, 200, { eligible: true, code: "", message: "" });
  }

  async function handleBuyerCreate(request, response) {
    const session = requireBuyerSession(request);
    const payload = await parseRequestBody(request);
    const requestedCategory = payload?.reasonCategory || payload?.category;
    const reasonCategory = normalizeReasonCategory(requestedCategory);
    if (!reasonCategory) {
      if (normalizeListingReasonCategory(requestedCategory)) {
        throw fail("That reason is for a listing report. Use Report this listing for product issues.", 400);
      }
      throw fail("Choose a valid store report reason.", 400);
    }
    const reason = sanitizeReasonText(payload?.reasonText || payload?.reason || payload?.details);
    if (!reason.ok) {
      throw fail(reason.message, 400);
    }

    const eligibility = await evaluateBuyerEligibility(session, payload);
    if (!eligibility.eligible) {
      throw eligibilityError(eligibility);
    }
    const { target, buyerOrders } = eligibility;

    const ip = typeof getRequestClientIp === "function"
      ? getRequestClientIp(request)
      : String(request?.socket?.remoteAddress || "unknown");
    const accountGate = buyerLimiter.consume(session.accountId);
    if (!accountGate.ok) {
      throw fail("You already sent several reports today. Try again tomorrow.", 429);
    }
    const ipGate = ipLimiter.consume(ip || "unknown");
    if (!ipGate.ok) {
      buyerLimiter.reset(session.accountId);
      throw fail("Too many reports from this network. Try again later.", 429);
    }

    const created = await enqueueSerializedMutation("company-reports", async () => {
      const reports = await readReports();
      if (hasOpenReportFromBuyer(reports, session.accountId, target.keys)) {
        throw fail("You already have an open report on this company. Super Admin is still reviewing it.", 409);
      }

      const previousNeedsWarning = buildSummary(reports, target.keys).needsWarning;
      const reporterActor = typeof resolveSaNotificationUserActor === "function"
        ? await resolveSaNotificationUserActor({
            accountId: session.accountId,
            payload: session,
            fallback: "Buyer",
          })
        : {
            actorType: "user",
            userId: session.accountId,
            username: session.name || "Buyer",
            userDisplayName: session.name || "Buyer",
            profileImageUrl: "",
          };

      const createdAt = nowIso();
      const reportId = allocateReportId(reports, createdAt);
      let reporterUserId = String(session.accountCode || session.account_code || "").trim();
      if (!reporterUserId && typeof readAccounts === "function") {
        try {
          const accounts = await readAccounts();
          const matched = (Array.isArray(accounts) ? accounts : []).find((account) => {
            const id = String(session.accountId || "").trim();
            const email = String(session.email || "").trim().toLowerCase();
            return [
              account?.id,
              account?.accountId,
            ].some((value) => String(value || "").trim() === id)
              || (email && String(account?.email || "").trim().toLowerCase() === email);
          });
          reporterUserId = String(matched?.accountCode || matched?.account_code || "").trim();
        } catch (_) {
          reporterUserId = "";
        }
      }
      const report = {
        id: newReportId(),
        reportId,
        scope: "company",
        companyId: target.companyId,
        adminId: target.adminId,
        companyName: target.companyName,
        companyPictureUrl: target.companyPictureUrl,
        reporterAccountId: session.accountId,
        reporterUserId: reporterUserId || session.accountId,
        reporterEmail: session.email,
        reporterName: reporterActor.userDisplayName || session.name || "Buyer",
        reporterAvatarUrl: String(reporterActor.profileImageUrl || "").trim(),
        reasonCategory,
        reasonText: reason.value,
        evidenceUrls: sanitizeEvidenceUrls(payload?.evidenceUrls || payload?.evidence),
        productId: String(payload?.productId || "").trim(),
        productName: target.productName || String(payload?.productName || "").trim(),
        orderId: resolveReportOrderId(buyerOrders, payload?.orderId),
        status: "pending",
        reviewNote: "",
        reviewedBy: "",
        reviewedAt: "",
        source: "buyer-gateway",
        createdAt,
        updatedAt: createdAt,
      };
      reports.unshift(report);
      await writeReports(reports);

      await persistSaInbox({
        type: "company-buyer-report",
        category: "sellers",
        priority: "high",
        title: "Buyer reported a company",
        reason: reasonCategoryLabel(reasonCategory),
        message: `${reporterActor.userDisplayName || "A buyer"} reported the company ${target.companyName} (${report.reportId}). This case is about the store, not a product. One report is not enough to warn the seller.`,
        adminId: target.adminId,
        companyId: target.companyId,
        companyName: target.companyName,
        companyPictureUrl: target.companyPictureUrl,
        productId: report.productId,
        productName: report.productName,
        reportId: report.reportId,
        targetUrl: `/super_admin.html#companies?reports=1&adminId=${encodeURIComponent(target.adminId || target.companyId)}&reportId=${encodeURIComponent(report.reportId)}`,
        createdBy: reporterActor.username || "Buyer",
        ...reporterActor,
      });

      if (typeof logActivitySafely === "function") {
        await logActivitySafely({
          id: `activity-${report.id}`,
          type: "company-buyer-report",
          action: "buyer-report",
          adminId: target.adminId,
          companyId: target.companyId,
          companyName: target.companyName,
          productId: report.productId,
          reportId: report.reportId,
          reason: report.reasonText,
          createdAt: report.createdAt,
          createdBy: reporterActor.username || "Buyer",
          skipLinkedNotification: true,
        }, request);
      }

      const summary = await maybeNotifyNeedsWarning({
        target,
        reports,
        previousNeedsWarning,
      });
      return { report, summary };
    });

    sendJson(response, 201, {
      ok: true,
      message: `Company report submitted. Your Report ID is ${created.report.reportId}. Super Admin will review this store. One report does not punish the seller.`,
      reportId: created.report.reportId,
      report: publicReportForBuyer(created.report),
      summary: {
        needsWarning: created.summary.needsWarning === true,
      },
    });
  }

  async function handleBuyerList(request, response) {
    const session = requireBuyerSession(request);
    const reports = await readReports();
    const mine = reports
      .filter((report) => String(report?.reporterAccountId || "").trim() === session.accountId)
      .map(publicReportForBuyer)
      .filter(Boolean);
    sendJson(response, 200, { reports: mine, total: mine.length });
  }

  async function handleSuperAdminList(request, response, requestUrl) {
    if (!requireSuperAdmin(request, response)) {
      return;
    }
    const storedReports = await readReports();
    const adminId = String(requestUrl.searchParams.get("adminId") || "").trim();
    const companyId = String(requestUrl.searchParams.get("companyId") || "").trim();
    const reportId = String(requestUrl.searchParams.get("reportId") || "").trim();
    const keys = [adminId, companyId].filter(Boolean);
    const scoped = keys.length ? reportsForKeys(storedReports, keys) : storedReports;
    const target = keys.length
      ? await resolveCompanyTarget({ companyId, adminId })
      : null;
    const orders = typeof readOrders === "function" ? await readOrders().catch(() => []) : [];
    const summary = buildSummary(
      storedReports,
      target?.keys || keys,
      uniqueBuyerCountForCompany(orders, target?.keys || keys),
    );
    const accounts = typeof readAccounts === "function" ? await readAccounts().catch(() => []) : [];
    const logoByCompanyId = new Map();
    const logoByAdminId = new Map();
    const accountPhotoById = new Map();
    const accountPhotoByEmail = new Map();
    const accountById = new Map();
    const accountByEmail = new Map();
    for (const account of Array.isArray(accounts) ? accounts : []) {
      const userPhoto = String(
        account?.profileImageUrl
        || account?.avatarUrl
        || account?.photoUrl
        || account?.profile?.profileImageUrl
        || account?.user?.profileImageUrl
        || "",
      ).trim();
      for (const key of [
        account?.id,
        account?.accountId,
        account?.userId,
        account?.buyerId,
        account?.uid,
      ]) {
        const accountKey = String(key || "").trim();
        if (!accountKey) {
          continue;
        }
        accountById.set(accountKey, account);
        if (userPhoto) {
          accountPhotoById.set(accountKey, userPhoto);
        }
      }
      const emailKey = String(account?.email || "").trim().toLowerCase();
      if (emailKey) {
        accountByEmail.set(emailKey, account);
        if (userPhoto) {
          accountPhotoByEmail.set(emailKey, userPhoto);
        }
      }
      const logo = pickCompanyLogoUrl(account, userPhoto);
      if (!logo) {
        continue;
      }
      const companyKey = String(account?.companyId || account?.company_id || "").trim();
      const adminKey = String(
        (typeof getRecordAdminId === "function"
          ? getRecordAdminId(account, account.adminId || account.id)
          : "")
        || account?.adminId
        || "",
      ).trim();
      if (companyKey) {
        logoByCompanyId.set(companyKey, logo);
      }
      if (adminKey) {
        logoByAdminId.set(adminKey, logo);
      }
    }

    function findReporterAccount(report) {
      const reporterId = String(report?.reporterAccountId || report?.reporterUserId || "").trim();
      const reporterEmail = String(report?.reporterEmail || "").trim().toLowerCase();
      return (reporterId && accountById.get(reporterId))
        || (reporterEmail && accountByEmail.get(reporterEmail))
        || null;
    }

    function resolveReporterPublicUserId(report, matchedAccount = null) {
      const account = matchedAccount || findReporterAccount(report);
      const accountCode = String(
        account?.accountCode
        || account?.account_code
        || report?.reporterUserId
        || report?.reporterAccountCode
        || report?.accountCode
        || "",
      ).trim();
      if (accountCode && !/^sample-buyer-/i.test(accountCode)) {
        return accountCode;
      }
      const fallbackId = String(report?.reporterAccountId || account?.id || "").trim();
      if (fallbackId && !/^sample-buyer-/i.test(fallbackId)) {
        return fallbackId;
      }
      return accountCode || fallbackId || "";
    }
    const targetCache = new Map();
    async function resolveReportTarget(report) {
      const cacheKey = `${String(report?.companyId || "").trim()}|${String(report?.adminId || "").trim()}`;
      if (!targetCache.has(cacheKey)) {
        targetCache.set(
          cacheKey,
          await resolveCompanyTarget({
            companyId: report?.companyId,
            adminId: report?.adminId,
          }).catch(() => null),
        );
      }
      return targetCache.get(cacheKey);
    }
    const reporterAvatarCache = new Map();
    async function resolveReporterAvatar(report) {
      const reporterId = String(report?.reporterAccountId || report?.reporterUserId || "").trim();
      const reporterEmail = String(report?.reporterEmail || "").trim().toLowerCase();
      const cacheKey = reporterId || reporterEmail || String(report?.id || "");
      if (!cacheKey) {
        return String(
          report?.reporterAvatarUrl
          || report?.reporterProfileImageUrl
          || report?.reporterPhotoUrl
          || "",
        ).trim();
      }
      if (reporterAvatarCache.has(cacheKey)) {
        return reporterAvatarCache.get(cacheKey);
      }
      let avatarUrl = (reporterId && accountPhotoById.get(reporterId))
        || (reporterEmail && accountPhotoByEmail.get(reporterEmail))
        || "";
      if (!avatarUrl && typeof resolveSaNotificationUserActor === "function") {
        try {
          const actor = await resolveSaNotificationUserActor({
            accountId: reporterId,
            payload: {
              accountId: reporterId,
              email: report?.reporterEmail,
              name: report?.reporterName,
            },
            fallback: report?.reporterName || "Buyer",
          });
          avatarUrl = String(actor?.profileImageUrl || "").trim();
        } catch (_) {
          avatarUrl = "";
        }
      }
      if (!avatarUrl) {
        avatarUrl = String(
          report?.reporterAvatarUrl
          || report?.reporterProfileImageUrl
          || report?.reporterPhotoUrl
          || "",
        ).trim();
      }
      reporterAvatarCache.set(cacheKey, avatarUrl);
      return avatarUrl;
    }
    const reports = [];
    for (const report of scoped) {
      const view = adminReportView(report);
      if (!view) {
        continue;
      }
      const target = await resolveReportTarget(report);
      const companyKey = String(view.companyId || target?.companyId || "").trim();
      const adminKey = String(view.adminId || target?.adminId || "").trim();
      const reporterAvatarUrl = await resolveReporterAvatar(report);
      const matchedAccount = findReporterAccount(report);
      const reporterUserId = resolveReporterPublicUserId(report, matchedAccount);
      reports.push({
        ...view,
        companyId: companyKey || view.companyId,
        adminId: adminKey || view.adminId,
        companyName: target?.companyName || view.companyName,
        companyPictureUrl: (() => {
          const userPhoto = String(
            target?.account?.profileImageUrl
            || target?.account?.avatarUrl
            || target?.account?.photoUrl
            || accountPhotoById.get(adminKey)
            || "",
          ).trim();
          return pickCompanyLogoUrl({
            logoUrl: target?.companyPictureUrl
              || logoByCompanyId.get(companyKey)
              || logoByAdminId.get(adminKey)
              || view.companyPictureUrl
              || "",
            companyPictureUrl: target?.companyPictureUrl
              || logoByCompanyId.get(companyKey)
              || logoByAdminId.get(adminKey)
              || view.companyPictureUrl
              || "",
          }, userPhoto);
        })(),
        reporterAccountId: String(
          matchedAccount?.id
          || matchedAccount?.accountId
          || view.reporterAccountId
          || report?.reporterAccountId
          || "",
        ).trim(),
        reporterUserId,
        reporterLabel: reporterUserId || view.reporterLabel,
        reporterName: String(
          view.reporterName
          || matchedAccount?.name
          || [matchedAccount?.firstName, matchedAccount?.lastName].filter(Boolean).join(" ")
          || matchedAccount?.displayName
          || matchedAccount?.username
          || "",
        ).trim(),
        reporterEmail: String(view.reporterEmail || matchedAccount?.email || "").trim(),
        reporterAvatarUrl,
        reporterProfileImageUrl: reporterAvatarUrl,
        reporterPhotoUrl: reporterAvatarUrl,
        companyEmail: String(target?.account?.email || target?.company?.email || "").trim(),
        businessType: String(target?.company?.businessType || "").trim(),
      });
    }
    sendJson(response, 200, {
      reports,
      summary,
      focusReportId: reportId,
      categories: REASON_CATEGORIES,
    });
  }

  async function handleSuperAdminReview(request, response, reportId) {
    if (!requireSuperAdmin(request, response)) {
      return;
    }
    const payload = await parseRequestBody(request);
    const decision = String(payload?.decision || payload?.action || "").trim().toLowerCase();
    const nextStatus = REVIEW_DECISIONS[decision];
    if (!nextStatus) {
      throw fail("Choose dismiss, uphold, or warn.", 400);
    }
    const reviewNote = String(payload?.reviewNote || payload?.note || "").replace(/\s+/g, " ").trim().slice(0, 800);

    const result = await enqueueSerializedMutation("company-reports", async () => {
      const reports = await readReports();
      const index = reports.findIndex((item) => reportMatchesPublicId(item, reportId));
      if (index < 0) {
        throw fail("Report not found.", 404);
      }
      const current = reports[index];
      const now = nowIso();
      const resolutionAction = decision === "warn"
        ? (normalizeResolutionAction(payload.resolutionAction || payload.actionType) || "warning")
        : "";
      const resolutionEnforcement = resolutionAction === "restrict" || resolutionAction === "ban"
        ? sanitizeResolutionEnforcement(resolutionAction, payload.enforcement || payload)
        : {};
      const updated = {
        ...current,
        status: nextStatus,
        reviewNote,
        reviewedBy: SUPER_ADMIN_USERNAME,
        reviewedAt: now,
        updatedAt: now,
        ...(resolutionAction
          ? {
            resolutionAction,
            resolutionState: "applied",
            resolutionEnforcement,
          }
          : {}),
      };
      reports[index] = updated;
      await writeReports(reports);

      const target = await resolveCompanyTarget({
        companyId: updated.companyId,
        adminId: updated.adminId,
      });
      let warningResult = null;
      if (decision === "warn" && target?.account && typeof applySuperAdminSellerNotifyAction === "function") {
        const accounts = await readAccounts();
        const accountIndex = accounts.findIndex((entry) =>
          String(entry?.id || "") === String(target.account.id || "")
          || String(entry?.adminId || "") === String(target.adminId || ""),
        );
        if (accountIndex >= 0) {
          const previousAccount = accounts[accountIndex];
          const updatedAccount = { ...previousAccount };
          warningResult = applySuperAdminSellerNotifyAction(
            updatedAccount,
            previousAccount,
            {
              notificationType: "warning",
              notificationTitle: "Super Admin Warning",
              notificationReason: reviewNote || "Buyer reports confirmed after Super Admin review",
              notificationMessage:
                reviewNote
                || "Super Admin reviewed buyer reports against your company and issued a warning. This was not automatic — a reviewer confirmed the cases.",
            },
            now,
          );
          accounts[accountIndex] = updatedAccount;
          await writeAccounts(accounts);
        } else if (target.adminId && typeof notifySellerAdminInboxByAdminId === "function") {
          await notifySellerAdminInboxByAdminId(target.adminId, {
            id: `seller-report-warning-${updated.id}`,
            type: "warning",
            audience: "seller",
            title: "Super Admin Warning",
            reason: reviewNote || "Buyer reports confirmed after Super Admin review",
            message:
              `Super Admin reviewed report ${getPublicReportId(updated)} against your company and issued a warning. This was not automatic.`,
            reportId: getPublicReportId(updated),
            adminId: target.adminId,
            companyId: target.companyId,
            companyName: target.companyName,
            status: "unread",
            createdAt: now,
            createdBy: SUPER_ADMIN_USERNAME,
          });
          warningResult = { message: "Seller warning sent after report review." };
        }
      } else if (target?.adminId && typeof notifySellerAdminInboxByAdminId === "function") {
        const publicId = getPublicReportId(updated);
        const sellerCopy = decision === "dismiss"
          ? {
              title: "Buyer report closed",
              reason: "No policy violation found",
              message:
                `Super Admin reviewed report ${publicId} about your company and closed it. No warning was issued.`,
            }
          : {
              title: "Buyer report confirmed",
              reason: "Report upheld pending warning",
              message:
                `Super Admin confirmed report ${publicId} about your company. This is not a warning yet. Follow marketplace rules to avoid escalation.`,
            };
        await notifySellerAdminInboxByAdminId(target.adminId, {
          id: `seller-report-review-${updated.id}`,
          type: `company-report-${decision}`,
          audience: "seller",
          reportId: publicId,
          adminId: target.adminId,
          companyId: target.companyId,
          companyName: target.companyName,
          status: "unread",
          createdAt: now,
          createdBy: SUPER_ADMIN_USERNAME,
          ...sellerCopy,
        });
      }

      if (typeof logActivitySafely === "function") {
        await logActivitySafely({
          id: `activity-review-${updated.id}-${Date.now()}`,
          type: "company-report-reviewed",
          action: decision,
          adminId: updated.adminId,
          companyId: updated.companyId,
          companyName: updated.companyName,
          reportId: getPublicReportId(updated),
          reason: reviewNote || decision,
          createdAt: now,
          createdBy: SUPER_ADMIN_USERNAME,
          skipLinkedNotification: true,
        }, request);
      }

      const orders = typeof readOrders === "function" ? await readOrders().catch(() => []) : [];
      return {
        report: updated,
        warningResult,
        summary: buildSummary(
          reports,
          target?.keys || [updated.companyId, updated.adminId],
          uniqueBuyerCountForCompany(orders, target?.keys || [updated.companyId, updated.adminId]),
        ),
      };
    });

    sendJson(response, 200, {
      ok: true,
      report: adminReportView(result.report),
      summary: result.summary,
      warning: result.warningResult
        ? { message: result.warningResult.message }
        : null,
      message: decision === "warn"
        ? (result.warningResult?.message || "Warning issued after report review.")
        : decision === "dismiss"
          ? "Report dismissed. The seller was not punished."
          : "Report upheld. Issue a warning only when the review supports it.",
    });
  }

  async function tryHandleCompanyReportRoutes(request, response, requestUrl) {
    const pathname = String(requestUrl?.pathname || "");
    try {
      if (pathname === "/api/account/company-reports") {
        if (request.method === "POST") {
          await handleBuyerCreate(request, response);
          return true;
        }
        if (request.method === "GET") {
          await handleBuyerList(request, response);
          return true;
        }
        sendJson(response, 405, { message: "Method not allowed." });
        return true;
      }

      if (pathname === "/api/account/company-reports/eligibility") {
        if (request.method === "GET") {
          await handleBuyerEligibility(request, response, requestUrl);
          return true;
        }
        sendJson(response, 405, { message: "Method not allowed." });
        return true;
      }

      if (pathname === "/api/super-admin/company-reports") {
        if (request.method === "GET") {
          await handleSuperAdminList(request, response, requestUrl);
          return true;
        }
        sendJson(response, 405, { message: "Method not allowed." });
        return true;
      }

      const reviewMatch = pathname.match(/^\/api\/super-admin\/company-reports\/([^/]+)\/review$/);
      if (reviewMatch) {
        if (request.method === "POST" || request.method === "PATCH") {
          await handleSuperAdminReview(
            request,
            response,
            decodeURIComponent(reviewMatch[1] || ""),
          );
          return true;
        }
        sendJson(response, 405, { message: "Method not allowed." });
        return true;
      }
    } catch (error) {
      const status = Number(error?.statusCode || error?.status || 500);
      sendJson(response, status >= 400 && status < 600 ? status : 500, {
        message: error instanceof Error ? error.message : "Unable to process company report.",
        code: error?.code || "",
      });
      return true;
    }
    return false;
  }

  return {
    tryHandleCompanyReportRoutes,
    attachSummaries,
    getSummariesByCompanyKeys,
    readReports,
    buildSummary,
  };
}

module.exports = {
  createCompanyReportsApi,
};
