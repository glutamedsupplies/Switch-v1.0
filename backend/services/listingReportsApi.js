"use strict";

const path = require("path");
const crypto = require("crypto");
const fsPromises = require("fs/promises");
const { createRateLimiter } = require("../security/rateLimit");
const {
  REASON_CATEGORIES,
  REVIEW_DECISIONS,
  DEFAULT_RESTRICTION_THRESHOLD,
  DEFAULT_MAJORITY_RATIO,
  DEFAULT_MAJORITY_MIN_REPORTERS,
  DEFAULT_RESTRICT_DAYS,
  normalizeListingReasonCategory,
  listingReasonCategoryLabel,
  sanitizeReasonText,
  sanitizeEvidenceUrls,
  computeListingReportRisk,
  canBuyerFileListingReport,
  hasOpenListingReportFromBuyer,
  reportsForProduct,
  publicListingReportForBuyer,
  adminListingReportView,
  pickProductImageUrl,
  pickCompanyLogoUrl,
  allocateListingReportId,
  assignPublicListingReportIds,
  getPublicListingReportId,
  listingReportMatchesPublicId,
} = require("./listingReports");
const { normalizeReasonCategory } = require("./companyReports");

const MAX_LISTING_REPORTS = 10_000;
const BUYER_REPORTS_PER_DAY = 8;

function createListingReportsApi(deps) {
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
    writeProducts,
    readOrders,
    findAdminAccountByScopeId,
    applySuperAdminProductListingRestrictionNotification,
    getRecordAdminId,
    SUPER_ADMIN_USERNAME = "super-admin",
    getRequestClientIp,
    resolveSaNotificationUserActor,
  } = deps;

  const REPORTS_FILE = path.join(DATA_DIR, "listing_reports.json");
  const restrictionThreshold = Math.max(
    2,
    Number(process.env.LISTING_REPORT_RESTRICTION_THRESHOLD) || DEFAULT_RESTRICTION_THRESHOLD,
  );
  const restrictDays = Math.max(
    1,
    Math.min(365, Number(process.env.LISTING_REPORT_RESTRICT_DAYS) || DEFAULT_RESTRICT_DAYS),
  );
  const buyerLimiter = createRateLimiter({
    max: BUYER_REPORTS_PER_DAY,
    windowMs: 24 * 60 * 60 * 1000,
  });
  const ipLimiter = createRateLimiter({
    max: 30,
    windowMs: 24 * 60 * 60 * 1000,
  });

  function nowIso() {
    return new Date().toISOString();
  }

  function newReportId() {
    return `lr_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
  }

  function fail(message, statusCode = 400) {
    if (typeof createHttpError === "function") {
      return createHttpError(message, statusCode);
    }
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
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
      const assigned = assignPublicListingReportIds(Array.isArray(decoded) ? decoded : []);
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
    if (list.length > MAX_LISTING_REPORTS) {
      const keep = [];
      const overflow = [];
      for (const report of list) {
        if (String(report?.status || "").toLowerCase() === "dismissed") {
          overflow.push(report);
        } else {
          keep.push(report);
        }
      }
      const room = Math.max(0, MAX_LISTING_REPORTS - keep.length);
      overflow.sort((left, right) => String(right?.createdAt || "").localeCompare(String(left?.createdAt || "")));
      await writeJsonFileAtomically(REPORTS_FILE, [...keep, ...overflow.slice(0, room)]);
      return;
    }
    await writeJsonFileAtomically(REPORTS_FILE, list);
  }

  function orderTouchesProduct(order, productId) {
    const wanted = String(productId || "").trim().toLowerCase();
    if (!wanted) {
      return false;
    }
    const ids = [
      order?.productId,
      order?.listingId,
      ...(Array.isArray(order?.items) ? order.items.map((item) => item?.productId || item?.id) : []),
      ...(Array.isArray(order?.products) ? order.products.map((item) => item?.productId || item?.id) : []),
      ...(Array.isArray(order?.lines) ? order.lines.map((item) => item?.productId || item?.id) : []),
    ];
    return ids.some((value) => String(value || "").trim().toLowerCase() === wanted);
  }

  function orderBuyerId(order) {
    return String(
      order?.accountId || order?.buyerId || order?.customerId || order?.userId || "",
    )
      .trim()
      .toLowerCase();
  }

  function orderReferenceIds(order) {
    return [order?.orderGroupId, order?.orderId, order?.id]
      .map((value) => String(value || "").trim())
      .filter(Boolean);
  }

  async function findBuyerOrdersForProduct(accountId, productId) {
    const buyer = String(accountId || "").trim().toLowerCase();
    if (!buyer || typeof readOrders !== "function") {
      return [];
    }
    const orders = await readOrders({ accountId }).catch(() => []);
    return (Array.isArray(orders) ? orders : []).filter(
      (order) => orderBuyerId(order) === buyer && orderTouchesProduct(order, productId),
    );
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

  function uniqueBuyerCountForProduct(orders, productId) {
    const buyers = new Set();
    for (const order of Array.isArray(orders) ? orders : []) {
      if (!orderTouchesProduct(order, productId)) {
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

  function buildSummary(reports, productId, uniqueBuyerCount = 0) {
    const scoped = reportsForProduct(reports, productId);
    const risk = computeListingReportRisk({
      reports: scoped,
      uniqueBuyerCount,
      restrictionThreshold,
      majorityRatio: DEFAULT_MAJORITY_RATIO,
      majorityMinReporters: DEFAULT_MAJORITY_MIN_REPORTERS,
    });
    return {
      ...risk,
      reportCount: risk.openCount,
      reports: risk.openCount,
      restrictionThreshold,
    };
  }

  async function resolveListingTarget({ productId, companyId, adminId }) {
    const wantedProductId = String(productId || "").trim();
    if (!wantedProductId || typeof readProducts !== "function") {
      return null;
    }
    const products = await readProducts().catch(() => []);
    const product = (Array.isArray(products) ? products : []).find(
      (item) => String(item?.id || "").trim() === wantedProductId,
    );
    if (!product) {
      return null;
    }

    const nextCompanyId = String(
      companyId || product.companyId || product.company_id || "",
    ).trim();
    const nextAdminId = String(adminId || product.adminId || "").trim();

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
      || product.companyName
      || "Company",
    ).trim() || "Company";
    const userPhoto = String(
      account?.profileImageUrl || account?.avatarUrl || account?.photoUrl || "",
    ).trim();

    return {
      product,
      company,
      account,
      productId: wantedProductId,
      productName: String(product.name || product.title || "Listing").trim() || "Listing",
      productImageUrl: pickProductImageUrl(product),
      companyId: resolvedCompanyId,
      adminId: resolvedAdminId,
      companyName,
      companyPictureUrl: pickCompanyLogoUrl(company, userPhoto) || pickCompanyLogoUrl(account, userPhoto),
      sellerAccountIds: [
        company?.sourceAccountId,
        company?.source_account_id,
        account?.id,
        account?.accountId,
        account?.adminId,
        resolvedAdminId,
        product.adminId,
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
        product.companyId,
        product.company_id,
      ],
    };
  }

  async function persistSaInbox(input) {
    if (typeof persistSuperAdminNotification !== "function" || typeof createPersistentLinkedNotification !== "function") {
      return null;
    }
    return persistSuperAdminNotification(createPersistentLinkedNotification(input));
  }

  async function maybeNotifyNeedsRestriction({ target, reports, previousNeedsRestriction }) {
    const orders = typeof readOrders === "function" ? await readOrders().catch(() => []) : [];
    const summary = buildSummary(
      reports,
      target.productId,
      uniqueBuyerCountForProduct(orders, target.productId),
    );
    if (!summary.needsRestriction || previousNeedsRestriction) {
      return summary;
    }

    await persistSaInbox({
      type: "listing-needs-restriction",
      category: "listings",
      priority: "high",
      title: "This listing needs restriction review",
      reason: summary.majorityTrigger
        ? "A majority of recent buyers reported this listing"
        : `${summary.uniqueReporterCount} buyers reported this listing`,
      message: `${target.productName} has enough distinct buyer reports to need a Super Admin listing restriction review. One report is not enough — review the product cases first.`,
      adminId: target.adminId,
      companyId: target.companyId,
      companyName: target.companyName,
      companyPictureUrl: target.companyPictureUrl,
      productId: target.productId,
      productName: target.productName,
      actorType: "listing",
      targetUrl: `/super_admin.html#product-requests?reports=1&productId=${encodeURIComponent(target.productId)}`,
      createdBy: "system",
    });

    if (target.adminId && typeof notifySellerAdminInboxByAdminId === "function") {
      await notifySellerAdminInboxByAdminId(target.adminId, {
        id: `seller-listing-report-threshold-${target.productId}-${Date.now()}`,
        type: "listing-report-threshold",
        audience: "seller",
        title: "Listing reports are under review",
        reason: "Multiple buyers reported this listing",
        message:
          `Several buyers reported "${target.productName}". Super Admin is reviewing the listing itself, not your whole store. One report is never enough to hide the product.`,
        adminId: target.adminId,
        companyId: target.companyId,
        companyName: target.companyName,
        productId: target.productId,
        productName: target.productName,
        status: "unread",
        createdAt: nowIso(),
        createdBy: "system",
      });
    }

    if (typeof logActivitySafely === "function") {
      await logActivitySafely({
        id: `activity-listing-needs-restriction-${Date.now()}`,
        type: "listing-needs-restriction",
        action: "needs-restriction",
        adminId: target.adminId,
        companyId: target.companyId,
        companyName: target.companyName,
        productId: target.productId,
        productName: target.productName,
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
      throw fail("Sign in to report a listing.", 401);
    }
    return {
      accountId,
      email: String(session.email || "").trim().toLowerCase(),
      name: String(session.displayName || session.username || "").trim(),
    };
  }

  async function applyListingRestriction(target, reviewNote, now, overrides = {}) {
    if (typeof readProducts !== "function" || typeof writeProducts !== "function") {
      return { applied: false, message: "Listing storage is unavailable." };
    }
    const products = await readProducts();
    const productIndex = (Array.isArray(products) ? products : []).findIndex(
      (item) => String(item?.id || "").trim() === String(target.productId || "").trim(),
    );
    if (productIndex < 0) {
      return { applied: false, message: "Listing not found." };
    }

    const previousProduct = products[productIndex];
    const reason = String(
      overrides.reason || reviewNote || listingReasonCategoryLabel(target.reasonCategory) || "Buyer listing reports confirmed after Super Admin review",
    )
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);
    const requestedDays = Number(overrides.durationDays);
    const durationDays = Number.isInteger(requestedDays) && requestedDays >= 1 && requestedDays <= 365
      ? requestedDays
      : restrictDays;
    const dayLabel = `${durationDays} ${durationDays === 1 ? "day" : "days"}`;
    const sellerNote = String(overrides.sellerNote || "").replace(/\s+/g, " ").trim().slice(0, 500)
      || "Restricted after Super Admin reviewed buyer listing reports.";
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    const listingRestriction = {
      active: true,
      reason,
      durationDays,
      sellerNote,
      notifySeller: true,
      restrictedAt: now,
      restrictedBy: SUPER_ADMIN_USERNAME,
      expiresAt,
      source: "listing-report",
    };
    const updatedProduct = {
      ...previousProduct,
      listingRestriction,
      isListingRestricted: true,
      listingRestrictionReason: reason,
      listingRestrictionDurationDays: durationDays,
      listingRestrictionSellerNote: listingRestriction.sellerNote,
      listingRestrictedAt: now,
      listingRestrictedBy: SUPER_ADMIN_USERNAME,
      listingRestrictionExpiresAt: expiresAt,
      updatedAt: now,
    };
    products[productIndex] = updatedProduct;

    let sellerNotification = null;
    if (typeof readAccounts === "function" && typeof writeAccounts === "function") {
      const accounts = await readAccounts();
      const accountIndex = (Array.isArray(accounts) ? accounts : []).findIndex((entry) =>
        String(entry?.id || "") === String(target.account?.id || "")
        || String(entry?.adminId || "") === String(target.adminId || "")
        || (typeof getRecordAdminId === "function" && getRecordAdminId(entry, "") === String(target.adminId || "")),
      );
      if (accountIndex >= 0 && typeof applySuperAdminProductListingRestrictionNotification === "function") {
        const previousAccount = accounts[accountIndex];
        const updatedAccount = { ...previousAccount };
        sellerNotification = applySuperAdminProductListingRestrictionNotification(
          updatedAccount,
          previousAccount,
          updatedProduct,
          listingRestriction,
          now,
        );
        accounts[accountIndex] = updatedAccount;
        await writeAccounts(accounts);
      }
    }

    await writeProducts(products);

    if (!sellerNotification && target.adminId && typeof notifySellerAdminInboxByAdminId === "function") {
      await notifySellerAdminInboxByAdminId(target.adminId, {
        id: `seller-listing-report-restrict-${target.productId}-${Date.now()}`,
        type: "listing-restriction",
        audience: "seller",
        title: "Product Listing Restricted",
        reason,
        message:
          `Your listing "${target.productName}" was hidden from customers for ${dayLabel} after Super Admin reviewed buyer listing reports.`,
        adminId: target.adminId,
        companyId: target.companyId,
        companyName: target.companyName,
        productId: target.productId,
        productName: target.productName,
        status: "unread",
        createdAt: now,
        createdBy: SUPER_ADMIN_USERNAME,
      });
      sellerNotification = { message: "Listing restricted after report review." };
    }

    await persistSaInbox({
      type: "listing-restriction",
      category: "listings",
      audience: "super_admin",
      title: "Listing restricted",
      reason,
      message: `Listing "${target.productName}" was restricted for ${dayLabel} after listing-report review.`,
      adminId: target.adminId,
      companyId: target.companyId,
      companyName: target.companyName,
      productId: target.productId,
      productName: target.productName,
      createdBy: SUPER_ADMIN_USERNAME,
      targetUrl: `/super_admin.html#product-requests?view=restricted`,
      createdAt: now,
    });

    return {
      applied: true,
      restriction: listingRestriction,
      message: `Listing restricted for ${dayLabel}.`,
    };
  }

  function eligibilityError(result) {
    const error = fail(result.message, result.statusCode || 403);
    error.code = result.code || "";
    return error;
  }

  async function evaluateBuyerEligibility(session, input = {}) {
    const target = await resolveListingTarget({
      productId: input?.productId,
      companyId: input?.companyId,
      adminId: input?.adminId,
    });
    if (!target?.productId) {
      return {
        eligible: false,
        statusCode: 404,
        code: "LISTING_NOT_FOUND",
        message: "Listing not found.",
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

    const ownership = canBuyerFileListingReport({
      reporterAccountId: session.accountId,
      reporterEmail: session.email,
      reporterCompanyIds,
      sellerAccountIds: target.sellerAccountIds,
      sellerEmails: target.sellerEmails,
      sellerCompanyIds: target.sellerCompanyIds,
      productId: target.productId,
    });
    if (!ownership.ok) {
      return {
        eligible: false,
        statusCode: 403,
        code: "OWN_LISTING",
        message: ownership.message,
      };
    }

    const buyerOrders = await findBuyerOrdersForProduct(session.accountId, target.productId);
    if (!buyerOrders.length) {
      return {
        eligible: false,
        statusCode: 403,
        code: "REPORT_REQUIRES_ORDER",
        message: "You can only report a listing you have ordered. Place an order for this product first.",
      };
    }

    return { eligible: true, target, buyerOrders };
  }

  async function handleBuyerEligibility(request, response, requestUrl) {
    const session = requireBuyerSession(request);
    const params = requestUrl.searchParams;
    const result = await evaluateBuyerEligibility(session, {
      productId: params.get("productId"),
      companyId: params.get("companyId"),
      adminId: params.get("adminId"),
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
    if (hasOpenListingReportFromBuyer(reports, session.accountId, result.target.productId)) {
      sendJson(response, 200, {
        eligible: false,
        code: "REPORT_ALREADY_OPEN",
        message: "You already have an open report on this listing. Super Admin is still reviewing it.",
      });
      return;
    }
    sendJson(response, 200, { eligible: true, code: "", message: "" });
  }

  async function handleBuyerCreate(request, response) {
    const session = requireBuyerSession(request);
    const payload = await parseRequestBody(request);
    const requestedCategory = payload?.reasonCategory || payload?.category;
    const reasonCategory = normalizeListingReasonCategory(requestedCategory);
    if (!reasonCategory) {
      if (normalizeReasonCategory(requestedCategory)) {
        throw fail("That reason is for a company report. Use Report this seller for store behavior.", 400);
      }
      throw fail("Choose a valid listing report reason.", 400);
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
      throw fail("You already sent several listing reports today. Try again tomorrow.", 429);
    }
    const ipGate = ipLimiter.consume(ip || "unknown");
    if (!ipGate.ok) {
      buyerLimiter.reset(session.accountId);
      throw fail("Too many listing reports from this network. Try again later.", 429);
    }

    const created = await enqueueSerializedMutation("listing-reports", async () => {
      const reports = await readReports();
      if (hasOpenListingReportFromBuyer(reports, session.accountId, target.productId)) {
        throw fail("You already have an open report on this listing. Super Admin is still reviewing it.", 409);
      }

      const previousNeedsRestriction = buildSummary(reports, target.productId).needsRestriction;
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
          };

      const createdAt = nowIso();
      const reportId = allocateListingReportId(reports, createdAt);
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
        scope: "listing",
        productId: target.productId,
        productName: target.productName,
        productImageUrl: target.productImageUrl,
        companyId: target.companyId,
        adminId: target.adminId,
        companyName: target.companyName,
        companyPictureUrl: target.companyPictureUrl,
        reporterAccountId: session.accountId,
        reporterUserId: reporterUserId || session.accountId,
        reporterEmail: session.email,
        reporterName: reporterActor.userDisplayName || session.name || "Buyer",
        reasonCategory,
        reasonText: reason.value,
        evidenceUrls: sanitizeEvidenceUrls(payload?.evidenceUrls || payload?.evidence),
        orderId: resolveReportOrderId(buyerOrders, payload?.orderId),
        status: "pending",
        reviewNote: "",
        reviewedBy: "",
        reviewedAt: "",
        source: "buyer-listing-gateway",
        createdAt,
        updatedAt: createdAt,
      };
      reports.unshift(report);
      await writeReports(reports);

      await persistSaInbox({
        type: "listing-buyer-report",
        category: "listings",
        priority: "high",
        title: "Buyer reported a listing",
        reason: listingReasonCategoryLabel(reasonCategory),
        message: `${reporterActor.userDisplayName || "A buyer"} reported ${target.productName} (${report.reportId}). This case is about the product, not the seller company. One report is not enough to hide the listing.`,
        adminId: target.adminId,
        companyId: target.companyId,
        companyName: target.companyName,
        companyPictureUrl: target.companyPictureUrl,
        productId: report.productId,
        productName: report.productName,
        reportId: report.reportId,
        targetUrl: `/super_admin.html#product-requests?reports=1&productId=${encodeURIComponent(target.productId)}&reportId=${encodeURIComponent(report.reportId)}`,
        createdBy: reporterActor.username || "Buyer",
        ...reporterActor,
      });

      if (typeof logActivitySafely === "function") {
        await logActivitySafely({
          id: `activity-${report.id}`,
          type: "listing-buyer-report",
          action: "buyer-listing-report",
          adminId: target.adminId,
          companyId: target.companyId,
          companyName: target.companyName,
          productId: report.productId,
          productName: report.productName,
          reportId: report.reportId,
          reason: report.reasonText,
          createdAt: report.createdAt,
          createdBy: reporterActor.username || "Buyer",
          skipLinkedNotification: true,
        }, request);
      }

      const summary = await maybeNotifyNeedsRestriction({
        target,
        reports,
        previousNeedsRestriction,
      });
      return { report, summary };
    });

    sendJson(response, 201, {
      ok: true,
      message: `Listing report submitted. Your Report ID is ${created.report.reportId}. Super Admin will review this product. One report does not hide the listing.`,
      reportId: created.report.reportId,
      report: publicListingReportForBuyer(created.report),
      summary: {
        needsRestriction: created.summary.needsRestriction === true,
      },
    });
  }

  async function handleBuyerList(request, response) {
    const session = requireBuyerSession(request);
    const reports = await readReports();
    const mine = reports
      .filter((report) => String(report?.reporterAccountId || "").trim() === session.accountId)
      .map(publicListingReportForBuyer)
      .filter(Boolean);
    sendJson(response, 200, { reports: mine, total: mine.length, scope: "listing" });
  }

  async function handleSuperAdminList(request, response, requestUrl) {
    if (!requireSuperAdmin(request, response)) {
      return;
    }
    const reports = await readReports();
    const productId = String(requestUrl.searchParams.get("productId") || "").trim();
    const reportId = String(requestUrl.searchParams.get("reportId") || "").trim();
    const scoped = productId ? reportsForProduct(reports, productId) : reports;
    const orders = typeof readOrders === "function" ? await readOrders().catch(() => []) : [];
    const summary = productId
      ? buildSummary(reports, productId, uniqueBuyerCountForProduct(orders, productId))
      : computeListingReportRisk({
          reports,
          uniqueBuyerCount: 0,
          restrictionThreshold,
        });

    const accounts = typeof readAccounts === "function" ? await readAccounts().catch(() => []) : [];
    const accountById = new Map();
    const accountByEmail = new Map();
    for (const account of Array.isArray(accounts) ? accounts : []) {
      for (const key of [account?.id, account?.accountId, account?.userId]) {
        const accountKey = String(key || "").trim();
        if (accountKey) {
          accountById.set(accountKey, account);
        }
      }
      const emailKey = String(account?.email || "").trim().toLowerCase();
      if (emailKey) {
        accountByEmail.set(emailKey, account);
      }
    }

    const views = [];
    for (const report of scoped) {
      const view = adminListingReportView(report);
      if (!view) {
        continue;
      }
      const target = await resolveListingTarget({
        productId: report.productId,
        companyId: report.companyId,
        adminId: report.adminId,
      }).catch(() => null);
      const reporterId = String(report?.reporterAccountId || "").trim();
      const reporterEmail = String(report?.reporterEmail || "").trim().toLowerCase();
      const matchedAccount = (reporterId && accountById.get(reporterId))
        || (reporterEmail && accountByEmail.get(reporterEmail))
        || null;
      const reporterUserId = String(
        matchedAccount?.accountCode
        || matchedAccount?.account_code
        || view.reporterUserId
        || report?.reporterUserId
        || "",
      ).trim()
        || (reporterId && !/^sample-buyer-/i.test(reporterId) ? reporterId : "");
      views.push({
        ...view,
        productId: target?.productId || view.productId,
        productName: target?.productName || view.productName,
        productImageUrl: target?.productImageUrl || view.productImageUrl,
        companyId: target?.companyId || view.companyId,
        adminId: target?.adminId || view.adminId,
        companyName: target?.companyName || view.companyName,
        companyPictureUrl: target?.companyPictureUrl || view.companyPictureUrl,
        companyEmail: String(target?.account?.email || target?.company?.email || "").trim(),
        reporterAccountId: String(
          matchedAccount?.id
          || matchedAccount?.accountId
          || view.reporterAccountId
          || reporterId
          || "",
        ).trim(),
        reporterUserId,
        reporterLabel: reporterUserId || view.reporterLabel,
        reporterName: String(
          view.reporterName
          || [matchedAccount?.firstName, matchedAccount?.lastName].filter(Boolean).join(" ")
          || matchedAccount?.username
          || "",
        ).trim(),
        reporterEmail: String(view.reporterEmail || matchedAccount?.email || "").trim(),
        reporterAvatarUrl: String(
          view.reporterAvatarUrl
          || matchedAccount?.profileImageUrl
          || matchedAccount?.avatarUrl
          || matchedAccount?.photoUrl
          || "",
        ).trim(),
      });
    }

    sendJson(response, 200, {
      reports: views,
      summary,
      focusReportId: reportId,
      categories: REASON_CATEGORIES,
      scope: "listing",
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
      throw fail("Choose dismiss, uphold, or restrict.", 400);
    }
    const reviewNote = String(payload?.reviewNote || payload?.note || "").replace(/\s+/g, " ").trim().slice(0, 800);

    const result = await enqueueSerializedMutation("listing-reports", async () => {
      const reports = await readReports();
      const index = reports.findIndex((item) => listingReportMatchesPublicId(item, reportId));
      if (index < 0) {
        throw fail("Listing report not found.", 404);
      }
      const current = reports[index];
      const now = nowIso();
      const updated = {
        ...current,
        status: nextStatus,
        reviewNote,
        reviewedBy: SUPER_ADMIN_USERNAME,
        reviewedAt: now,
        updatedAt: now,
      };
      reports[index] = updated;
      await writeReports(reports);

      const target = await resolveListingTarget({
        productId: updated.productId,
        companyId: updated.companyId,
        adminId: updated.adminId,
      });
      let restrictionResult = null;
      if (decision === "restrict" && target?.productId) {
        restrictionResult = await applyListingRestriction(
          { ...target, reasonCategory: updated.reasonCategory },
          reviewNote,
          now,
          {
            reason: payload?.reason,
            durationDays: payload?.durationDays,
            sellerNote: payload?.sellerNote,
          },
        );
      } else if (target?.adminId && typeof notifySellerAdminInboxByAdminId === "function") {
        const publicId = getPublicListingReportId(updated);
        const sellerCopy = decision === "dismiss"
          ? {
              title: "Listing report closed",
              reason: "No listing policy violation found",
              message:
                `Super Admin reviewed report ${publicId} about "${updated.productName || "your listing"}" and closed it. The product was not hidden.`,
            }
          : {
              title: "Listing report confirmed",
              reason: "Report upheld pending restriction",
              message:
                `Super Admin confirmed report ${publicId} about "${updated.productName || "your listing"}". This is about the product itself, not a store warning.`,
            };
        await notifySellerAdminInboxByAdminId(target.adminId, {
          id: `seller-listing-report-review-${updated.id}`,
          type: `listing-report-${decision}`,
          audience: "seller",
          reportId: publicId,
          adminId: target.adminId,
          companyId: target.companyId,
          companyName: target.companyName,
          productId: updated.productId,
          productName: updated.productName,
          status: "unread",
          createdAt: now,
          createdBy: SUPER_ADMIN_USERNAME,
          ...sellerCopy,
        });
      }

      if (typeof logActivitySafely === "function") {
        await logActivitySafely({
          id: `activity-listing-review-${updated.id}-${Date.now()}`,
          type: "listing-report-reviewed",
          action: decision,
          adminId: updated.adminId,
          companyId: updated.companyId,
          companyName: updated.companyName,
          productId: updated.productId,
          productName: updated.productName,
          reportId: getPublicListingReportId(updated),
          reason: reviewNote || decision,
          createdAt: now,
          createdBy: SUPER_ADMIN_USERNAME,
          skipLinkedNotification: true,
        }, request);
      }

      const orders = typeof readOrders === "function" ? await readOrders().catch(() => []) : [];
      return {
        report: updated,
        restrictionResult,
        summary: buildSummary(
          reports,
          updated.productId,
          uniqueBuyerCountForProduct(orders, updated.productId),
        ),
      };
    });

    sendJson(response, 200, {
      ok: true,
      report: adminListingReportView(result.report),
      summary: result.summary,
      restriction: result.restrictionResult?.applied
        ? { message: result.restrictionResult.message }
        : null,
      message: decision === "restrict"
        ? (result.restrictionResult?.message || "Listing restricted after report review.")
        : decision === "dismiss"
          ? "Listing report dismissed. The product was not hidden."
          : "Listing report upheld. Restrict the listing only when the review supports it.",
    });
  }

  async function tryHandleListingReportRoutes(request, response, requestUrl) {
    const pathname = String(requestUrl?.pathname || "");
    try {
      if (pathname === "/api/account/listing-reports") {
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

      if (pathname === "/api/account/listing-reports/eligibility") {
        if (request.method === "GET") {
          await handleBuyerEligibility(request, response, requestUrl);
          return true;
        }
        sendJson(response, 405, { message: "Method not allowed." });
        return true;
      }

      if (pathname === "/api/super-admin/listing-reports") {
        if (request.method === "GET") {
          await handleSuperAdminList(request, response, requestUrl);
          return true;
        }
        sendJson(response, 405, { message: "Method not allowed." });
        return true;
      }

      const reviewMatch = pathname.match(/^\/api\/super-admin\/listing-reports\/([^/]+)\/review$/);
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
        message: error instanceof Error ? error.message : "Unable to process listing report.",
        code: error?.code || "",
      });
      return true;
    }
    return false;
  }

  return {
    tryHandleListingReportRoutes,
    readReports,
    buildSummary,
  };
}

module.exports = {
  createListingReportsApi,
};
