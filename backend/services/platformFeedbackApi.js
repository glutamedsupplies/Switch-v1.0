"use strict";

const path = require("path");
const crypto = require("crypto");
const fsPromises = require("fs/promises");

/**
 * Restores /api/platform-feedback (+ uploads + SA inbox fan-out)
 * after the Sep 3 git checkout wiped the inlined server handlers.
 */
function createPlatformFeedbackApi(deps) {
  const {
    DATA_DIR,
    UPLOADS_DIR,
    ensureStoragePaths,
    writeJsonFileAtomically,
    readAccounts,
    findAdminAccountByScopeId,
    requireSuperAdmin,
    sendJson,
    parseRequestBody,
    parseBinaryRequestBody,
    getUploadExtension,
    sanitizeFileStem,
    SUPER_ADMIN_USERNAME,
    MAX_UPLOAD_BYTES,
    MAX_UPLOAD_SIZE_LABEL,
    MAX_REVIEW_VIDEO_BYTES,
    MAX_REVIEW_VIDEO_SIZE_LABEL,
  } = deps;

  const PLATFORM_FEEDBACK_FILE = path.join(DATA_DIR, "platform_feedback.json");
  const SUPER_ADMIN_NOTIFICATIONS_FILE = path.join(
    DATA_DIR,
    "super_admin_notifications.json",
  );
  const MAX_PLATFORM_FEEDBACK_ENTRIES = 5_000;
  const MAX_PLATFORM_FEEDBACK_MESSAGE_LENGTH = 1_000;
  const MAX_SUPER_ADMIN_NOTIFICATIONS = 5_000;

  async function readPlatformFeedback() {
    await ensureStoragePaths();
    try {
      const raw = await fsPromises.readFile(PLATFORM_FEEDBACK_FILE, "utf8");
      const decoded = JSON.parse(raw);
      return Array.isArray(decoded) ? decoded : [];
    } catch (_) {
      return [];
    }
  }

  async function writePlatformFeedback(entries) {
    await writeJsonFileAtomically(
      PLATFORM_FEEDBACK_FILE,
      Array.isArray(entries) ? entries.slice(0, MAX_PLATFORM_FEEDBACK_ENTRIES) : [],
    );
  }

  async function readSuperAdminNotifications() {
    await ensureStoragePaths();
    try {
      const raw = await fsPromises.readFile(SUPER_ADMIN_NOTIFICATIONS_FILE, "utf8");
      const decoded = JSON.parse(raw);
      return Array.isArray(decoded) ? decoded : [];
    } catch (_) {
      return [];
    }
  }

  async function writeSuperAdminNotifications(notifications) {
    await writeJsonFileAtomically(
      SUPER_ADMIN_NOTIFICATIONS_FILE,
      Array.isArray(notifications)
        ? notifications.slice(0, MAX_SUPER_ADMIN_NOTIFICATIONS)
        : [],
    );
  }

  function normalizePlatformFeedbackType(value) {
    const type = String(value ?? "").trim().toLowerCase();
    if (type === "seller" || type === "seller-feedback") return "seller";
    if (type === "user" || type === "buyer" || type === "user-feedback" || type === "app") {
      return "user";
    }
    return "";
  }

  function normalizePlatformFeedbackRating(value) {
    const rating = Number(value);
    if (!Number.isFinite(rating)) return 0;
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
    if (status === "resolved" || status === "closed") return "resolved";
    if (status === "in-review" || status === "review") return "in-review";
    return "open";
  }

  function normalizeAttachments(value) {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const url = String(item.url ?? item.src ?? item.mediaUrl ?? "").trim();
        if (!url) return null;
        const kind = String(item.kind ?? item.type ?? "image").trim().toLowerCase();
        return {
          url,
          kind: kind === "video" ? "video" : "image",
          name: String(item.name ?? item.fileName ?? "").trim().slice(0, 180),
        };
      })
      .filter(Boolean)
      .slice(0, 12);
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
    )
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160);
  }

  async function requireSellerFeedbackSession(request, response) {
    const headerAdminId = String(
      request.headers["x-gms-admin-id"] ?? request.headers["x-admin-id"] ?? "",
    ).trim();
    if (!headerAdminId) {
      sendJson(response, 401, {
        message: "A valid seller admin session is required to send feedback.",
      });
      return null;
    }

    const accounts = await readAccounts();
    const account = findAdminAccountByScopeId(accounts, headerAdminId);
    if (!account || String(account.role ?? "").toLowerCase() !== "admin") {
      sendJson(response, 401, {
        message: "Your seller account could not be verified. Please sign in again.",
      });
      return null;
    }

    return { account, adminId: headerAdminId };
  }

  async function persistFeedbackSuperAdminNotification(notification) {
    if (!notification) return null;
    const notifications = await readSuperAdminNotifications();
    const next = [notification, ...notifications.filter((item) => item?.id !== notification.id)];
    await writeSuperAdminNotifications(next);
    return notification;
  }

  async function handlePlatformFeedbackApi(request, response, requestUrl) {
    if (request.method === "GET") {
      if (!requireSuperAdmin(request, response)) return;

      try {
        const typeFilter = normalizePlatformFeedbackType(requestUrl.searchParams.get("type"));
        const statusFilter = String(requestUrl.searchParams.get("status") ?? "")
          .trim()
          .toLowerCase();
        const entries = await readPlatformFeedback();
        const feedback = entries
          .filter((entry) => {
            if (typeFilter && entry?.type !== typeFilter) return false;
            if (statusFilter && statusFilter !== "all") {
              return (
                normalizePlatformFeedbackStatus(entry?.status)
                === normalizePlatformFeedbackStatus(statusFilter)
              );
            }
            return true;
          })
          .sort(
            (left, right) =>
              (Date.parse(String(right?.createdAt ?? "")) || 0)
              - (Date.parse(String(left?.createdAt ?? "")) || 0),
          );

        sendJson(response, 200, {
          feedback,
          counts: {
            total: entries.length,
            seller: entries.filter((entry) => entry?.type === "seller").length,
            user: entries.filter((entry) => entry?.type === "user").length,
            open: entries.filter(
              (entry) => normalizePlatformFeedbackStatus(entry?.status) === "open",
            ).length,
          },
        });
      } catch (error) {
        sendJson(response, 500, {
          message:
            error instanceof Error ? error.message : "Unable to load platform feedback.",
        });
      }
      return;
    }

    if (request.method !== "POST") {
      sendJson(response, 405, { message: "Method not allowed." });
      return;
    }

    try {
      const payload = await parseRequestBody(request);
      const type = normalizePlatformFeedbackType(payload?.type ?? payload?.audience);
      if (!type) {
        sendJson(response, 400, { message: "Feedback type must be seller or user." });
        return;
      }

      const rating = normalizePlatformFeedbackRating(payload?.rating);
      if (!rating) {
        sendJson(response, 400, { message: "Choose a rating from 1 to 5 stars." });
        return;
      }

      const message = normalizePlatformFeedbackMessage(
        payload?.message ?? payload?.feedback,
      );
      if (!message) {
        sendJson(response, 400, { message: "Please enter your feedback message." });
        return;
      }

      const category = String(payload?.category ?? "").trim().slice(0, 120);
      const attachments = normalizeAttachments(payload?.attachments);
      const createdAt = new Date().toISOString();
      let submitterAccountId = "";
      let submitterName = "";
      let submitterEmail = "";
      let adminId = "";
      let companyName = "";

      if (type === "seller") {
        const auth = await requireSellerFeedbackSession(request, response);
        if (!auth) return;
        submitterAccountId = String(auth.account?.id ?? auth.adminId).trim();
        adminId = auth.adminId;
        submitterName = getPlatformFeedbackSubmitterName(auth.account, "Seller");
        submitterEmail = String(auth.account?.email ?? "").trim();
        companyName = String(
          auth.account?.companyName
            ?? auth.account?.storeName
            ?? auth.account?.businessName
            ?? submitterName,
        ).trim();
      } else {
        const accounts = await readAccounts();
        const accountId = String(payload?.accountId ?? payload?.userId ?? "").trim();
        if (!accountId) {
          sendJson(response, 401, {
            message: "Sign in with a buyer account to send feedback.",
          });
          return;
        }
        const account = (Array.isArray(accounts) ? accounts : []).find((item) => {
          const id = String(item?.id ?? item?.accountId ?? "").trim();
          const role = String(item?.role ?? "").toLowerCase();
          return id === accountId && (role === "user" || role === "buyer" || !role);
        });
        if (!account) {
          sendJson(response, 401, {
            message: "A registered buyer account is required to send feedback.",
          });
          return;
        }
        submitterAccountId = String(account.id ?? account.accountId ?? accountId).trim();
        submitterName = getPlatformFeedbackSubmitterName(account, "Buyer");
        submitterEmail = String(account.email ?? payload?.email ?? "").trim();
      }

      const feedbackEntry = {
        id: `fb_${crypto.randomBytes(6).toString("hex")}`,
        type,
        rating,
        category,
        message,
        attachments,
        status: "open",
        submitterAccountId,
        submitterName,
        submitterEmail,
        adminId,
        companyName,
        createdAt,
        readAt: "",
        readBy: "",
        resolvedAt: "",
        resolvedBy: "",
      };

      const entries = await readPlatformFeedback();
      await writePlatformFeedback([feedbackEntry, ...entries]);

      const typeLabel = type === "seller" ? "Seller" : "User";
      const reasonParts = [`${rating}/5 from ${submitterName || typeLabel}`];
      if (category) reasonParts.push(category);
      await persistFeedbackSuperAdminNotification({
        id: `seller-feedback-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
        type: type === "seller" ? "seller-feedback" : "user-feedback",
        audience: "super_admin",
        title: type === "seller" ? "Company feedback received" : "User feedback received",
        reason: reasonParts.join(" · "),
        message: message.slice(0, 240),
        status: "unread",
        productId: "",
        productName: "",
        feedbackId: feedbackEntry.id,
        adminId,
        targetUrl:
          type === "seller"
            ? "/super_admin.html#seller-feedback"
            : "/super_admin.html#user-feedback",
        createdAt,
        createdBy: submitterName || typeLabel,
        companyName,
        storeName: companyName,
        businessName: companyName,
      });

      sendJson(response, 201, {
        feedback: feedbackEntry,
        message: "Thanks! Your feedback was sent to Super Admin.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : "Unable to save feedback.",
      });
    }
  }

  async function handleSinglePlatformFeedbackApi(request, response, feedbackId) {
    if (request.method !== "PATCH" && request.method !== "PUT") {
      sendJson(response, 405, { message: "Method not allowed." });
      return;
    }
    if (!requireSuperAdmin(request, response)) return;

    const id = String(feedbackId || "").trim();
    if (!id) {
      sendJson(response, 400, { message: "Feedback id is required." });
      return;
    }

    try {
      const payload = await parseRequestBody(request);
      const entries = await readPlatformFeedback();
      const index = entries.findIndex((entry) => String(entry?.id ?? "").trim() === id);
      if (index === -1) {
        sendJson(response, 404, { message: "Feedback not found." });
        return;
      }

      const current = entries[index];
      const nextStatus =
        payload?.status != null
          ? normalizePlatformFeedbackStatus(payload.status)
          : normalizePlatformFeedbackStatus(current.status);
      const now = new Date().toISOString();
      const updated = {
        ...current,
        status: nextStatus,
        readAt: current.readAt || now,
        readBy: current.readBy || SUPER_ADMIN_USERNAME || "root",
        resolvedAt: nextStatus === "resolved" ? current.resolvedAt || now : "",
        resolvedBy:
          nextStatus === "resolved" ? SUPER_ADMIN_USERNAME || "root" : "",
      };
      entries[index] = updated;
      await writePlatformFeedback(entries);

      sendJson(response, 200, {
        feedback: updated,
        message:
          nextStatus === "resolved"
            ? "Feedback marked as resolved."
            : "Feedback updated.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : "Unable to update feedback.",
      });
    }
  }

  async function handlePlatformFeedbackUploadApi(request, response) {
    if (request.method !== "POST") {
      sendJson(response, 405, { message: "Method not allowed." });
      return;
    }

    const auth = await requireSellerFeedbackSession(request, response);
    if (!auth) return;

    try {
      await ensureStoragePaths();
      const contentType = String(request.headers["content-type"] ?? "").toLowerCase();
      const sourceFilename = decodeURIComponent(
        String(request.headers["x-file-name"] ?? "feedback-media"),
      );
      const extension = getUploadExtension(sourceFilename, contentType);
      const isImageUpload =
        contentType.startsWith("image/") || [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(extension);
      const isVideoUpload =
        contentType.startsWith("video/") || [".mp4", ".webm", ".mov", ".m4v"].includes(extension);
      if (!isImageUpload && !isVideoUpload) {
        throw new Error("Please upload a valid photo or video.");
      }

      const fileBuffer = await parseBinaryRequestBody(request, {
        maxBytes: isVideoUpload ? MAX_REVIEW_VIDEO_BYTES : MAX_UPLOAD_BYTES,
        maxSizeLabel: isVideoUpload ? MAX_REVIEW_VIDEO_SIZE_LABEL : MAX_UPLOAD_SIZE_LABEL,
      });
      if (!fileBuffer.length) {
        throw new Error("Uploaded file is empty.");
      }

      const safeStem =
        sanitizeFileStem(path.basename(sourceFilename, extension)) || "feedback-media";
      const storedExtension = extension || (isVideoUpload ? ".mp4" : ".jpg");
      const fileName = `feedback-${safeStem}-${Date.now()}${storedExtension}`;
      const filePath = path.join(UPLOADS_DIR, fileName);
      const uploadUrl = `/uploads/${fileName}`;
      await fsPromises.writeFile(filePath, fileBuffer);

      sendJson(response, 201, {
        attachment: {
          url: uploadUrl,
          kind: isVideoUpload ? "video" : "image",
          name: path.basename(sourceFilename) || fileName,
        },
      });
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : "Unable to upload feedback media.",
      });
    }
  }

  async function tryHandlePlatformFeedbackRoutes(request, response, requestUrl) {
    if (requestUrl.pathname === "/api/platform-feedback") {
      await handlePlatformFeedbackApi(request, response, requestUrl);
      return true;
    }
    if (requestUrl.pathname === "/api/platform-feedback/uploads") {
      await handlePlatformFeedbackUploadApi(request, response);
      return true;
    }
    const match = requestUrl.pathname.match(/^\/api\/platform-feedback\/([^/]+)$/);
    if (match) {
      await handleSinglePlatformFeedbackApi(
        request,
        response,
        decodeURIComponent(match[1] ?? ""),
      );
      return true;
    }
    return false;
  }

  return {
    tryHandlePlatformFeedbackRoutes,
  };
}

module.exports = {
  createPlatformFeedbackApi,
};
