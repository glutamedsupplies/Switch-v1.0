"use strict";

const path = require("path");
const crypto = require("crypto");
const fsPromises = require("fs/promises");
const {
  TICKET_CATEGORIES,
  REVIEW_REPORT_CATEGORIES,
  normalizeCategory,
  sanitizeDetails,
  sanitizeEvidenceUrls,
  canSellerActOnBuyer,
  hasOpenCase,
  isBuyerBlockedByStore,
  computeBuyerStoreRisk,
  toBuyerReportRecord,
} = require("./sellerBuyerProtection");

function createSellerBuyerProtectionApi(deps) {
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
    readOrders,
    readProducts,
    writeProducts,
    findCustomerById,
    getRequestAdminId,
    getRecordAdminId,
    SUPER_ADMIN_USERNAME = "super-admin",
  } = deps;

  const STORE_FILE = path.join(DATA_DIR, "seller_buyer_protection.json");

  function nowIso() {
    return new Date().toISOString();
  }

  function newId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`;
  }

  function fail(message, statusCode = 400) {
    if (typeof createHttpError === "function") {
      return createHttpError(message, statusCode);
    }
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }

  async function readStore() {
    await ensureStoragePaths();
    try {
      const raw = await fsPromises.readFile(STORE_FILE, "utf8");
      const decoded = JSON.parse(raw);
      if (!decoded || typeof decoded !== "object") {
        return { tickets: [], blocks: [], reviewReports: [] };
      }
      return {
        tickets: Array.isArray(decoded.tickets) ? decoded.tickets : [],
        blocks: Array.isArray(decoded.blocks) ? decoded.blocks : [],
        reviewReports: Array.isArray(decoded.reviewReports) ? decoded.reviewReports : [],
      };
    } catch (_) {
      return { tickets: [], blocks: [], reviewReports: [] };
    }
  }

  async function writeStore(store) {
    await writeJsonFileAtomically(STORE_FILE, {
      tickets: Array.isArray(store?.tickets) ? store.tickets.slice(0, 8000) : [],
      blocks: Array.isArray(store?.blocks) ? store.blocks.slice(0, 8000) : [],
      reviewReports: Array.isArray(store?.reviewReports) ? store.reviewReports.slice(0, 8000) : [],
    });
  }

  function requireSellerScope(request, requestUrl) {
    const adminId = typeof getRequestAdminId === "function"
      ? getRequestAdminId(request, requestUrl)
      : String(request?.authSession?.adminId || "").trim();
    if (!adminId) {
      throw fail("Seller workspace session is required.", 401);
    }
    return {
      adminId,
      accountId: String(request?.authSession?.accountId || adminId).trim(),
    };
  }

  async function resolveSellerCompany(adminId, hintedCompanyId = "") {
    let company = null;
    if (typeof findCompanyById === "function" && hintedCompanyId) {
      company = await findCompanyById(hintedCompanyId).catch(() => null);
    }
    if (!company && typeof findCompanyById === "function") {
      company = await findCompanyById(adminId).catch(() => null);
    }
    const accounts = typeof readAccounts === "function" ? await readAccounts().catch(() => []) : [];
    const account = (accounts || []).find((entry) =>
      [entry?.id, entry?.adminId, entry?.accountId]
        .map((value) => String(value || "").trim())
        .includes(adminId),
    ) || null;
    return {
      company,
      account,
      adminId: String(
        (typeof getRecordAdminId === "function" && account
          ? getRecordAdminId(account, account.adminId || account.id)
          : "")
        || adminId,
      ).trim(),
      companyId: String(company?.id || account?.companyId || hintedCompanyId || "").trim(),
      companyName: String(
        company?.name || account?.companyName || account?.storeName || "Company",
      ).trim() || "Company",
    };
  }

  async function resolveBuyer(buyerAccountId, buyerUsername = "") {
    const id = String(buyerAccountId || "").trim();
    const username = String(buyerUsername || "").trim();
    if (typeof findCustomerById === "function" && id) {
      const customer = await findCustomerById(id).catch(() => null);
      if (customer) {
        return {
          accountId: String(customer.id || customer.accountId || id).trim(),
          username: String(customer.username || customer.displayName || customer.email || username || "Buyer").trim(),
          email: String(customer.email || "").trim().toLowerCase(),
        };
      }
    }
    if (typeof readAccounts === "function") {
      const accounts = await readAccounts().catch(() => []);
      const match = (accounts || []).find((entry) => {
        const ids = [entry?.id, entry?.accountId, entry?.username, entry?.email]
          .map((value) => String(value || "").trim().toLowerCase());
        return (id && ids.includes(id.toLowerCase()))
          || (username && ids.includes(username.toLowerCase()));
      });
      if (match) {
        return {
          accountId: String(match.id || match.accountId || id || username).trim(),
          username: String(match.username || match.displayName || match.email || username || "Buyer").trim(),
          email: String(match.email || "").trim().toLowerCase(),
        };
      }
    }
    if (!id && !username) {
      return null;
    }
    return {
      accountId: id || username,
      username: username || id,
      email: "",
    };
  }

  async function persistSaInbox(input) {
    if (typeof persistSuperAdminNotification !== "function" || typeof createPersistentLinkedNotification !== "function") {
      return null;
    }
    return persistSuperAdminNotification(createPersistentLinkedNotification(input));
  }

  async function appendBuyerAccountReport(buyerAccountId, report) {
    if (!buyerAccountId || typeof readAccounts !== "function" || typeof writeAccounts !== "function") {
      return;
    }
    const accounts = await readAccounts();
    const index = accounts.findIndex((entry) =>
      [entry?.id, entry?.accountId].map((value) => String(value || "").trim()).includes(buyerAccountId),
    );
    if (index < 0) {
      return;
    }
    const current = accounts[index];
    const reports = Array.isArray(current.reports) ? current.reports.slice() : [];
    reports.unshift(report);
    accounts[index] = { ...current, reports: reports.slice(0, 200) };
    await writeAccounts(accounts);
  }

  async function hideProductReview(reviewId, productId) {
    if (typeof readProducts !== "function" || typeof writeProducts !== "function") {
      return false;
    }
    const products = await readProducts();
    let changed = false;
    const next = (Array.isArray(products) ? products : []).map((product) => {
      if (productId && String(product?.id || "") !== String(productId)) {
        return product;
      }
      const comments = Array.isArray(product?.reviewComments)
        ? product.reviewComments
        : Array.isArray(product?.reviews)
          ? product.reviews
          : [];
      const updated = comments.map((comment) => {
        if (String(comment?.id || "") !== String(reviewId)) {
          return comment;
        }
        changed = true;
        return {
          ...comment,
          hiddenBySuperAdmin: true,
          moderationStatus: "hidden",
          hiddenAt: nowIso(),
        };
      });
      if (!changed) {
        return product;
      }
      return {
        ...product,
        reviewComments: updated,
        productReviewComments: updated,
        reviews: updated,
      };
    });
    if (changed) {
      await writeProducts(next);
    }
    return changed;
  }

  function countBuyerReturns(orders, { buyerAccountId, companyId, adminId }) {
    const buyer = String(buyerAccountId || "").trim().toLowerCase();
    const storeKeys = new Set(
      [companyId, adminId].map((value) => String(value || "").trim().toLowerCase()).filter(Boolean),
    );
    let count = 0;
    for (const order of Array.isArray(orders) ? orders : []) {
      const orderBuyer = String(order?.accountId || order?.buyerId || "").trim().toLowerCase();
      if (orderBuyer !== buyer) {
        continue;
      }
      const orderStore = [order?.companyId, order?.adminId]
        .map((value) => String(value || "").trim().toLowerCase());
      if (storeKeys.size && !orderStore.some((value) => storeKeys.has(value))) {
        continue;
      }
      const stage = String(order?.stage || order?.status || "").toLowerCase();
      if (/(return|refund)/.test(stage)) {
        count += 1;
      }
    }
    return count;
  }

  async function handleCreateTicket(request, response, requestUrl) {
    const seller = requireSellerScope(request, requestUrl);
    const payload = await parseRequestBody(request);
    const category = normalizeCategory(payload?.category || payload?.reasonCategory, TICKET_CATEGORIES);
    if (!category) {
      throw fail("Choose a valid protection reason.");
    }
    const details = sanitizeDetails(payload?.details || payload?.reasonText);
    if (!details.ok) {
      throw fail(details.message);
    }
    const buyer = await resolveBuyer(payload?.buyerAccountId, payload?.buyerUsername);
    const ownership = canSellerActOnBuyer({
      sellerAccountId: seller.accountId,
      buyerAccountId: buyer?.accountId,
    });
    if (!ownership.ok) {
      throw fail(ownership.message, ownership.code === "AUTH_REQUIRED" ? 401 : 400);
    }
    const company = await resolveSellerCompany(seller.adminId, payload?.companyId);

    const created = await enqueueSerializedMutation("seller-buyer-protection", async () => {
      const store = await readStore();
      if (hasOpenCase(store.tickets, {
        sellerAdminId: company.adminId,
        companyId: company.companyId,
        buyerAccountId: buyer.accountId,
      })) {
        throw fail("You already have an open Super Admin ticket for this buyer.", 409);
      }
      const ticket = {
        id: newId("sbt"),
        kind: "ticket",
        category,
        categoryLabel: TICKET_CATEGORIES[category],
        details: details.value,
        orderId: String(payload?.orderId || "").trim(),
        evidenceUrls: sanitizeEvidenceUrls(payload?.evidenceUrls),
        buyerAccountId: buyer.accountId,
        buyerUsername: buyer.username,
        adminId: company.adminId,
        companyId: company.companyId,
        companyName: company.companyName,
        status: "pending",
        reviewNote: "",
        reviewedBy: "",
        reviewedAt: "",
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      store.tickets.unshift(ticket);
      await writeStore(store);
      const report = toBuyerReportRecord(ticket);
      await appendBuyerAccountReport(buyer.accountId, report);
      await persistSaInbox({
        type: "seller-buyer-ticket",
        category: "security",
        priority: "high",
        title: "Seller filed a buyer protection ticket",
        reason: ticket.categoryLabel,
        message: `${company.companyName} asked Super Admin to review buyer ${buyer.username}. This is a support ticket, not a public complaint on the buyer profile.`,
        adminId: company.adminId,
        companyId: company.companyId,
        companyName: company.companyName,
        userId: buyer.accountId,
        username: buyer.username,
        actorType: "company",
        targetUrl: `/super_admin.html#user-data?buyerId=${encodeURIComponent(buyer.accountId)}&ticketId=${encodeURIComponent(ticket.id)}`,
        createdBy: company.companyName,
      });
      if (typeof notifySellerAdminInboxByAdminId === "function") {
        await notifySellerAdminInboxByAdminId(company.adminId, {
          id: `seller-ticket-receipt-${ticket.id}`,
          type: "seller-buyer-ticket-receipt",
          audience: "seller",
          title: "Protection ticket submitted",
          reason: ticket.categoryLabel,
          message: "Super Admin will review this buyer case. One ticket does not ban the customer.",
          adminId: company.adminId,
          companyId: company.companyId,
          status: "unread",
          createdAt: ticket.createdAt,
          createdBy: "system",
        });
      }
      if (typeof logActivitySafely === "function") {
        await logActivitySafely({
          id: `activity-${ticket.id}`,
          type: "seller-buyer-ticket",
          action: "seller-ticket",
          adminId: company.adminId,
          companyId: company.companyId,
          companyName: company.companyName,
          createdAt: ticket.createdAt,
          createdBy: company.companyName,
          skipLinkedNotification: true,
        }, request);
      }
      return ticket;
    });

    sendJson(response, 201, {
      ok: true,
      ticket: created,
      message: "Ticket sent to Super Admin. The buyer is not punished until review is done.",
    });
  }

  async function handleCreateReviewReport(request, response, requestUrl) {
    const seller = requireSellerScope(request, requestUrl);
    const payload = await parseRequestBody(request);
    const category = normalizeCategory(payload?.category, REVIEW_REPORT_CATEGORIES);
    if (!category) {
      throw fail("Choose why this review breaks policy.");
    }
    const details = sanitizeDetails(payload?.details || payload?.reasonText, { min: 12 });
    if (!details.ok) {
      throw fail(details.message);
    }
    const reviewId = String(payload?.reviewId || "").trim();
    if (!reviewId) {
      throw fail("Review id is required.");
    }
    const company = await resolveSellerCompany(seller.adminId, payload?.companyId);
    const created = await enqueueSerializedMutation("seller-buyer-protection", async () => {
      const store = await readStore();
      if (store.reviewReports.some((item) =>
        String(item?.reviewId || "") === reviewId
        && String(item?.adminId || "") === company.adminId
        && ["pending", "reviewing"].includes(String(item?.status || "")),
      )) {
        throw fail("This review already has an open Super Admin report.", 409);
      }
      const report = {
        id: newId("srr"),
        kind: "review-report",
        category,
        categoryLabel: REVIEW_REPORT_CATEGORIES[category],
        details: details.value,
        reviewId,
        productId: String(payload?.productId || "").trim(),
        productName: String(payload?.productName || "").trim(),
        reviewExcerpt: String(payload?.reviewExcerpt || "").trim().slice(0, 400),
        buyerAccountId: String(payload?.buyerAccountId || "").trim(),
        buyerUsername: String(payload?.buyerUsername || payload?.reviewerName || "Buyer").trim(),
        adminId: company.adminId,
        companyId: company.companyId,
        companyName: company.companyName,
        status: "pending",
        reviewNote: "",
        reviewedBy: "",
        reviewedAt: "",
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      store.reviewReports.unshift(report);
      await writeStore(store);
      await persistSaInbox({
        type: "seller-review-report",
        category: "security",
        priority: "high",
        title: "Seller reported a product review",
        reason: report.categoryLabel,
        message: `${company.companyName} reported a review for policy review. Sellers cannot delete reviews themselves.`,
        adminId: company.adminId,
        companyId: company.companyId,
        companyName: company.companyName,
        productId: report.productId,
        productName: report.productName,
        actorType: "company",
        targetUrl: `/super_admin.html#user-data?reviewReportId=${encodeURIComponent(report.id)}`,
        createdBy: company.companyName,
      });
      if (typeof notifySellerAdminInboxByAdminId === "function") {
        await notifySellerAdminInboxByAdminId(company.adminId, {
          id: `seller-review-report-receipt-${report.id}`,
          type: "seller-review-report-receipt",
          audience: "seller",
          title: "Review report submitted",
          message: "Super Admin will decide if the review violates policy. You cannot delete it yourself.",
          adminId: company.adminId,
          status: "unread",
          createdAt: report.createdAt,
          createdBy: "system",
        });
      }
      return report;
    });
    sendJson(response, 201, {
      ok: true,
      report: created,
      message: "Review sent to Super Admin. It stays public until they confirm a policy violation.",
    });
  }

  async function handleBlockBuyer(request, response, requestUrl) {
    const seller = requireSellerScope(request, requestUrl);
    const payload = await parseRequestBody(request);
    const buyer = await resolveBuyer(payload?.buyerAccountId, payload?.buyerUsername);
    const ownership = canSellerActOnBuyer({
      sellerAccountId: seller.accountId,
      buyerAccountId: buyer?.accountId,
    });
    if (!ownership.ok) {
      throw fail(ownership.message, 400);
    }
    const company = await resolveSellerCompany(seller.adminId, payload?.companyId);
    const reason = String(payload?.reason || "Abusive or fraudulent buyer").replace(/\s+/g, " ").trim().slice(0, 300);
    const block = await enqueueSerializedMutation("seller-buyer-protection", async () => {
      const store = await readStore();
      if (isBuyerBlockedByStore(store.blocks, {
        buyerAccountId: buyer.accountId,
        companyId: company.companyId,
        adminId: company.adminId,
      })) {
        throw fail("This buyer is already on your store block list.", 409);
      }
      const entry = {
        id: newId("sbb"),
        buyerAccountId: buyer.accountId,
        buyerUsername: buyer.username,
        adminId: company.adminId,
        companyId: company.companyId,
        companyName: company.companyName,
        reason,
        createdAt: nowIso(),
      };
      store.blocks.unshift(entry);
      await writeStore(store);
      if (typeof notifySellerAdminInboxByAdminId === "function") {
        await notifySellerAdminInboxByAdminId(company.adminId, {
          id: `seller-block-${entry.id}`,
          type: "seller-store-block",
          audience: "seller",
          title: "Buyer added to store block list",
          message: `${buyer.username} can no longer check out from this store. This is not a platform ban.`,
          adminId: company.adminId,
          status: "unread",
          createdAt: entry.createdAt,
          createdBy: company.companyName,
        });
      }
      return entry;
    });
    sendJson(response, 201, {
      ok: true,
      block,
      message: "Buyer can no longer purchase from this store. Super Admin can still review tickets separately.",
    });
  }

  async function handleUnblockBuyer(request, response, requestUrl, buyerKey) {
    const seller = requireSellerScope(request, requestUrl);
    const company = await resolveSellerCompany(seller.adminId);
    await enqueueSerializedMutation("seller-buyer-protection", async () => {
      const store = await readStore();
      store.blocks = store.blocks.filter((block) => {
        const sameStore = String(block.adminId || "") === company.adminId
          || String(block.companyId || "") === company.companyId;
        const sameBuyer = String(block.buyerAccountId || "") === String(buyerKey || "")
          || String(block.id || "") === String(buyerKey || "");
        return !(sameStore && sameBuyer);
      });
      await writeStore(store);
    });
    sendJson(response, 200, { ok: true, message: "Buyer removed from this store's block list." });
  }

  async function handleSecurityCenter(request, response, requestUrl) {
    const seller = requireSellerScope(request, requestUrl);
    const company = await resolveSellerCompany(seller.adminId);
    const store = await readStore();
    const tickets = store.tickets.filter((item) =>
      item.adminId === company.adminId || item.companyId === company.companyId,
    );
    const blocks = store.blocks.filter((item) =>
      item.adminId === company.adminId || item.companyId === company.companyId,
    );
    const reviewReports = store.reviewReports.filter((item) =>
      item.adminId === company.adminId || item.companyId === company.companyId,
    );
    const orders = typeof readOrders === "function" ? await readOrders({ adminId: company.adminId }).catch(() => []) : [];
    const flaggedBuyers = new Map();
    for (const ticket of tickets) {
      const returns = countBuyerReturns(orders, {
        buyerAccountId: ticket.buyerAccountId,
        companyId: company.companyId,
        adminId: company.adminId,
      });
      flaggedBuyers.set(ticket.buyerAccountId, {
        buyerAccountId: ticket.buyerAccountId,
        buyerUsername: ticket.buyerUsername,
        risk: computeBuyerStoreRisk({
          tickets: tickets.filter((item) => item.buyerAccountId === ticket.buyerAccountId),
          returns,
          blocks: blocks.filter((item) => item.buyerAccountId === ticket.buyerAccountId),
        }),
      });
    }
    sendJson(response, 200, {
      companyName: company.companyName,
      tickets,
      blocks,
      reviewReports,
      flaggedBuyers: [...flaggedBuyers.values()],
      categories: TICKET_CATEGORIES,
      reviewCategories: REVIEW_REPORT_CATEGORIES,
    });
  }

  async function handleSuperAdminReviewTicket(request, response, ticketId) {
    if (!requireSuperAdmin(request, response)) {
      return;
    }
    const payload = await parseRequestBody(request);
    const decision = String(payload?.decision || "").trim().toLowerCase();
    if (!["dismiss", "uphold", "warn"].includes(decision)) {
      throw fail("Choose dismiss, uphold, or warn.");
    }
    const result = await enqueueSerializedMutation("seller-buyer-protection", async () => {
      const store = await readStore();
      const index = store.tickets.findIndex((item) => item.id === ticketId);
      if (index < 0) {
        throw fail("Ticket not found.", 404);
      }
      const now = nowIso();
      const ticket = {
        ...store.tickets[index],
        status: decision === "dismiss" ? "dismissed" : decision === "warn" ? "warned" : "upheld",
        reviewNote: String(payload?.reviewNote || "").trim().slice(0, 800),
        reviewedBy: SUPER_ADMIN_USERNAME,
        reviewedAt: now,
        updatedAt: now,
      };
      store.tickets[index] = ticket;
      await writeStore(store);
      if (ticket.adminId && typeof notifySellerAdminInboxByAdminId === "function") {
        await notifySellerAdminInboxByAdminId(ticket.adminId, {
          id: `seller-ticket-review-${ticket.id}`,
          type: "seller-buyer-ticket-reviewed",
          audience: "seller",
          title: decision === "dismiss" ? "Buyer ticket closed" : "Buyer ticket confirmed",
          message: decision === "dismiss"
            ? "Super Admin reviewed your ticket and found no policy violation."
            : "Super Admin confirmed your buyer protection ticket.",
          adminId: ticket.adminId,
          status: "unread",
          createdAt: now,
          createdBy: SUPER_ADMIN_USERNAME,
        });
      }
      return ticket;
    });
    sendJson(response, 200, {
      ok: true,
      ticket: result,
      message: decision === "dismiss"
        ? "Ticket dismissed. The buyer was not punished."
        : "Ticket upheld after Super Admin review.",
    });
  }

  async function handleSuperAdminReviewReport(request, response, reportId) {
    if (!requireSuperAdmin(request, response)) {
      return;
    }
    const payload = await parseRequestBody(request);
    const decision = String(payload?.decision || "").trim().toLowerCase();
    if (!["dismiss", "hide_review"].includes(decision)) {
      throw fail("Choose dismiss or hide_review.");
    }
    const result = await enqueueSerializedMutation("seller-buyer-protection", async () => {
      const store = await readStore();
      const index = store.reviewReports.findIndex((item) => item.id === reportId);
      if (index < 0) {
        throw fail("Review report not found.", 404);
      }
      const now = nowIso();
      if (decision === "hide_review") {
        await hideProductReview(store.reviewReports[index].reviewId, store.reviewReports[index].productId);
      }
      const report = {
        ...store.reviewReports[index],
        status: decision === "hide_review" ? "hidden" : "dismissed",
        reviewNote: String(payload?.reviewNote || "").trim().slice(0, 800),
        reviewedBy: SUPER_ADMIN_USERNAME,
        reviewedAt: now,
        updatedAt: now,
      };
      store.reviewReports[index] = report;
      await writeStore(store);
      if (report.adminId && typeof notifySellerAdminInboxByAdminId === "function") {
        await notifySellerAdminInboxByAdminId(report.adminId, {
          id: `seller-review-report-review-${report.id}`,
          type: "seller-review-report-reviewed",
          audience: "seller",
          title: decision === "hide_review" ? "Review removed" : "Review report closed",
          message: decision === "hide_review"
            ? "Super Admin confirmed a policy violation and removed the review."
            : "Super Admin reviewed the review and left it public.",
          adminId: report.adminId,
          status: "unread",
          createdAt: now,
          createdBy: SUPER_ADMIN_USERNAME,
        });
      }
      return report;
    });
    sendJson(response, 200, {
      ok: true,
      report: result,
      message: decision === "hide_review"
        ? "Review hidden after Super Admin confirmed a policy violation."
        : "Review report dismissed. The review stays public.",
    });
  }

  async function attachTicketsToBuyerAccounts(accounts) {
    const store = await readStore();
    return (Array.isArray(accounts) ? accounts : []).map((account) => {
      const buyerId = String(account?.id || account?.accountId || "").trim();
      const tickets = store.tickets.filter((item) => item.buyerAccountId === buyerId);
      const extra = tickets.map(toBuyerReportRecord).filter(Boolean);
      if (!extra.length) {
        return account;
      }
      const existing = Array.isArray(account.reports) ? account.reports : [];
      const seen = new Set(existing.map((item) => String(item?.id || "")));
      return {
        ...account,
        reports: [...extra.filter((item) => !seen.has(item.id)), ...existing],
        sellerProtectionTickets: tickets,
      };
    });
  }

  async function assertBuyerNotBlockedByStore({ buyerAccountId, companyId, adminId }) {
    const store = await readStore();
    if (isBuyerBlockedByStore(store.blocks, { buyerAccountId, companyId, adminId })) {
      const error = fail("This store has blocked your account from checkout.", 403);
      error.code = "STORE_BUYER_BLOCKED";
      throw error;
    }
  }

  async function tryHandleSellerBuyerProtectionRoutes(request, response, requestUrl) {
    const pathname = String(requestUrl?.pathname || "");
    try {
      if (pathname === "/api/seller/buyer-protection/tickets" && request.method === "POST") {
        await handleCreateTicket(request, response, requestUrl);
        return true;
      }
      if (pathname === "/api/seller/buyer-protection/review-reports" && request.method === "POST") {
        await handleCreateReviewReport(request, response, requestUrl);
        return true;
      }
      if (pathname === "/api/seller/buyer-protection/blocks" && request.method === "POST") {
        await handleBlockBuyer(request, response, requestUrl);
        return true;
      }
      const unblock = pathname.match(/^\/api\/seller\/buyer-protection\/blocks\/([^/]+)$/);
      if (unblock && request.method === "DELETE") {
        await handleUnblockBuyer(request, response, requestUrl, decodeURIComponent(unblock[1]));
        return true;
      }
      if (pathname === "/api/seller/buyer-protection/security-center" && request.method === "GET") {
        await handleSecurityCenter(request, response, requestUrl);
        return true;
      }
      if (pathname === "/api/super-admin/buyer-protection" && request.method === "GET") {
        if (!requireSuperAdmin(request, response)) {
          return true;
        }
        const store = await readStore();
        sendJson(response, 200, store);
        return true;
      }
      const ticketReview = pathname.match(/^\/api\/super-admin\/buyer-protection\/tickets\/([^/]+)\/review$/);
      if (ticketReview && request.method === "POST") {
        await handleSuperAdminReviewTicket(request, response, decodeURIComponent(ticketReview[1]));
        return true;
      }
      const reviewReview = pathname.match(/^\/api\/super-admin\/buyer-protection\/review-reports\/([^/]+)\/review$/);
      if (reviewReview && request.method === "POST") {
        await handleSuperAdminReviewReport(request, response, decodeURIComponent(reviewReview[1]));
        return true;
      }
    } catch (error) {
      const status = Number(error?.statusCode || error?.status || 500);
      sendJson(response, status >= 400 && status < 600 ? status : 500, {
        message: error instanceof Error ? error.message : "Unable to process seller protection request.",
        code: error?.code || "",
      });
      return true;
    }
    return false;
  }

  return {
    tryHandleSellerBuyerProtectionRoutes,
    attachTicketsToBuyerAccounts,
    assertBuyerNotBlockedByStore,
    readStore,
  };
}

module.exports = {
  createSellerBuyerProtectionApi,
};
