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
    objectStorage = null,
    ensureStoragePaths,
    writeJsonFileAtomically,
    readAccounts,
    writeAccounts,
    findAdminAccountByScopeId,
    getExplicitRequestAdminId,
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
    persistSuperAdminNotification,
    createPersistentLinkedNotification,
    logActivitySafely,
    notifySellerAdminInboxByAdminId,
  } = deps;

  const PLATFORM_FEEDBACK_FILE = path.join(DATA_DIR, "platform_feedback.json");
  const MAX_PLATFORM_FEEDBACK_ENTRIES = 5_000;
  const MAX_PLATFORM_FEEDBACK_MESSAGE_LENGTH = 1_000;
  const MAX_PLATFORM_FEEDBACK_NOTE_LENGTH = 1_000;
  const MAX_PLATFORM_FEEDBACK_NOTES = 100;

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

  function normalizeNotes(value) {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const text = String(item.text ?? item.note ?? item.message ?? "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, MAX_PLATFORM_FEEDBACK_NOTE_LENGTH);
        if (!text) return null;
        return {
          id: String(item.id ?? `note_${crypto.randomBytes(4).toString("hex")}`).trim(),
          text,
          createdAt: String(item.createdAt ?? new Date().toISOString()).trim(),
          createdBy: String(item.createdBy ?? SUPER_ADMIN_USERNAME ?? "Super Admin")
            .trim()
            .slice(0, 120),
        };
      })
      .filter(Boolean)
      .slice(0, MAX_PLATFORM_FEEDBACK_NOTES);
  }

  function getPlatformFeedbackSubmitterName(account, fallback = "", { preferUser = false } = {}) {
    if (preferUser) {
      const fullName = [account?.firstName, account?.lastName].filter(Boolean).join(" ").trim();
      return String(
        account?.username
          ?? account?.displayName
          ?? account?.fullName
          ?? fullName
          ?? account?.name
          ?? account?.email
          ?? fallback,
      )
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 160);
    }
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

  function getSessionRole(request) {
    return String(request?.authSession?.role ?? "").trim().toLowerCase();
  }

  async function requireSellerFeedbackSession(request, response) {
    const sessionAdminId = String(getExplicitRequestAdminId(request)).trim();
    if (!sessionAdminId) {
      sendJson(response, 401, {
        message: "A valid seller admin session is required to send feedback.",
      });
      return null;
    }

    const accounts = await readAccounts();
    const account = findAdminAccountByScopeId(accounts, sessionAdminId);
    if (!account || String(account.role ?? "").toLowerCase() !== "admin") {
      sendJson(response, 401, {
        message: "Your seller account could not be verified. Please sign in again.",
      });
      return null;
    }

    return { account, adminId: sessionAdminId };
  }

  async function requireBuyerFeedbackSession(request, response) {
    const session = request?.authSession;
    const accountId = String(session?.accountId ?? "").trim();
    const email = String(session?.email ?? "").trim().toLowerCase();
    const role = getSessionRole(request);

    if (!accountId || (role && role !== "buyer")) {
      sendJson(response, 401, {
        message: "Sign in with a buyer account to send feedback.",
      });
      return null;
    }

    const accounts = await readAccounts();
    const account = (Array.isArray(accounts) ? accounts : []).find((item) => {
      const id = String(item?.id ?? item?.accountId ?? item?.accountCode ?? "").trim();
      const itemEmail = String(item?.email ?? "").trim().toLowerCase();
      const itemRole = String(item?.role ?? "").toLowerCase();
      const roleOk = itemRole === "user" || itemRole === "buyer" || !itemRole;
      if (!roleOk) return false;
      if (id && id === accountId) return true;
      if (email && itemEmail && itemEmail === email) return true;
      return false;
    });

    if (!account) {
      sendJson(response, 401, {
        message: "A registered buyer account is required to send feedback.",
      });
      return null;
    }

    return { account, accountId: String(account.id ?? account.accountId ?? accountId).trim() };
  }

  async function requireFeedbackUploadSession(request, response) {
    const role = getSessionRole(request);
    if (role === "buyer") {
      return requireBuyerFeedbackSession(request, response);
    }
    return requireSellerFeedbackSession(request, response);
  }

  async function persistSaFeedbackNotification(fields) {
    if (typeof persistSuperAdminNotification !== "function") {
      return null;
    }
    const notification =
      typeof createPersistentLinkedNotification === "function"
        ? createPersistentLinkedNotification(fields)
        : {
            id: String(fields.id || `sa-feedback-${Date.now()}`).trim(),
            ...fields,
            status: "unread",
            read: false,
            createdAt: fields.createdAt || new Date().toISOString(),
          };
    return persistSuperAdminNotification(notification);
  }

  async function notifySellerFeedbackResolved(entry) {
    const adminId = String(entry?.adminId ?? "").trim();
    if (!adminId || typeof notifySellerAdminInboxByAdminId !== "function") {
      return;
    }
    const notification =
      typeof createPersistentLinkedNotification === "function"
        ? createPersistentLinkedNotification({
            type: "sa-feedback-resolved",
            audience: "seller",
            title: "Your feedback was resolved",
            reason: "Super Admin reviewed your platform feedback",
            message: `Your ${entry.rating || "?"}/5 feedback was marked resolved.`,
            feedbackId: entry.id,
            adminId,
            companyName: entry.companyName || "",
            storeName: entry.companyName || "",
            businessName: entry.companyName || "",
            createdBy: SUPER_ADMIN_USERNAME || "Super Admin",
            targetUrl: "/main.html#feedback",
          })
        : {
            id: `sa-feedback-resolved-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
            type: "sa-feedback-resolved",
            audience: "seller",
            title: "Your feedback was resolved",
            message: `Your ${entry.rating || "?"}/5 feedback was marked resolved.`,
            feedbackId: entry.id,
            adminId,
            status: "unread",
            createdAt: new Date().toISOString(),
          };
    await notifySellerAdminInboxByAdminId(adminId, notification);
  }

  async function notifyBuyerFeedbackResolved(entry) {
    const submitterAccountId = String(entry?.submitterAccountId ?? "").trim();
    if (!submitterAccountId || typeof readAccounts !== "function" || typeof writeAccounts !== "function") {
      return;
    }

    const accounts = await readAccounts();
    const index = (Array.isArray(accounts) ? accounts : []).findIndex((item) => {
      const id = String(item?.id ?? item?.accountId ?? item?.accountCode ?? "").trim();
      return id && id === submitterAccountId;
    });
    if (index < 0) return;

    const account = accounts[index];
    const now = new Date().toISOString();
    const notification = {
      id: `buyer-feedback-resolved-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      type: "platform-feedback-resolved",
      audience: "buyer",
      title: "Your feedback was resolved",
      message: `Your ${entry.rating || "?"}/5 platform feedback was marked resolved by Super Admin.`,
      feedbackId: entry.id,
      status: "unread",
      read: false,
      createdAt: now,
      createdBy: SUPER_ADMIN_USERNAME || "Super Admin",
    };
    const previous = Array.isArray(account.buyerNotifications) ? account.buyerNotifications : [];
    accounts[index] = {
      ...account,
      buyerNotifications: [notification, ...previous].slice(0, 100),
      lastBuyerNotification: notification,
      lastBuyerNotifiedAt: now,
    };
    await writeAccounts(accounts);
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
            inReview: entries.filter(
              (entry) => normalizePlatformFeedbackStatus(entry?.status) === "in-review",
            ).length,
            resolved: entries.filter(
              (entry) => normalizePlatformFeedbackStatus(entry?.status) === "resolved",
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
      let actorProfileImageUrl = "";
      let actorCompanyPictureUrl = "";

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
        actorCompanyPictureUrl = String(
          auth.account?.companyPictureUrl
            || auth.account?.logoUrl
            || auth.account?.profileImageUrl
            || "",
        ).trim();
      } else {
        const auth = await requireBuyerFeedbackSession(request, response);
        if (!auth) return;
        submitterAccountId = auth.accountId;
        submitterName = getPlatformFeedbackSubmitterName(auth.account, "Buyer", { preferUser: true });
        submitterEmail = String(auth.account?.email ?? request.authSession?.email ?? "").trim();
        actorProfileImageUrl = String(
          auth.account?.profileImageUrl || auth.account?.avatarUrl || "",
        ).trim();
      }

      const feedbackEntry = {
        id: `fb_${crypto.randomBytes(6).toString("hex")}`,
        type,
        rating,
        category,
        message,
        attachments,
        notes: [],
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
      const isSellerFeedback = type === "seller";
      await persistSaFeedbackNotification({
        id: `${type}-feedback-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
        type: isSellerFeedback ? "seller-feedback" : "user-feedback",
        audience: "super_admin",
        title: isSellerFeedback ? "Company feedback received" : "User feedback received",
        reason: reasonParts.join(" · "),
        // Privacy: never mirror the full feedback body into the SA bell inbox.
        message: `${submitterName || typeLabel} submitted ${rating}/5 platform feedback. Open Feedback to review.`,
        feedbackId: feedbackEntry.id,
        adminId,
        companyName: isSellerFeedback ? companyName : "",
        storeName: isSellerFeedback ? companyName : "",
        businessName: isSellerFeedback ? companyName : "",
        actorType: isSellerFeedback ? "company" : "user",
        userId: isSellerFeedback ? "" : submitterAccountId,
        username: isSellerFeedback ? "" : submitterName,
        userDisplayName: isSellerFeedback ? "" : submitterName,
        profileImageUrl: isSellerFeedback ? actorCompanyPictureUrl : actorProfileImageUrl,
        companyPictureUrl: isSellerFeedback ? actorCompanyPictureUrl : "",
        createdBy: submitterName || typeLabel,
        targetUrl:
          isSellerFeedback
            ? "/super_admin.html#seller-feedback"
            : "/super_admin.html#user-feedback",
        createdAt,
      });

      if (typeof logActivitySafely === "function") {
        await logActivitySafely(
          {
            id: `activity-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
            type: type === "seller" ? "seller-feedback" : "user-feedback",
            source: type === "seller" ? "seller_admin" : "buyer",
            adminId,
            accountId: submitterAccountId,
            action: "platform-feedback-submitted",
            title: `${typeLabel} feedback submitted`,
            description: `${submitterName || typeLabel} sent ${rating}/5 platform feedback.`,
            feedbackId: feedbackEntry.id,
            actor: {
              role: type === "seller" ? "seller-admin" : "buyer",
              accountId: submitterAccountId,
              displayName: submitterName || typeLabel,
            },
            createdAt,
            skipLinkedNotification: true,
          },
          request,
        );
      }

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
    const id = String(feedbackId || "").trim();
    if (!id) {
      sendJson(response, 400, { message: "Feedback id is required." });
      return;
    }

    if (request.method === "DELETE") {
      if (!requireSuperAdmin(request, response)) return;
      try {
        const entries = await readPlatformFeedback();
        const index = entries.findIndex((entry) => String(entry?.id ?? "").trim() === id);
        if (index === -1) {
          sendJson(response, 404, { message: "Feedback not found." });
          return;
        }
        const removed = entries[index];
        entries.splice(index, 1);
        await writePlatformFeedback(entries);

        if (typeof logActivitySafely === "function") {
          await logActivitySafely(
            {
              id: `activity-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
              type: "platform-feedback-deleted",
              source: "super_admin",
              adminId: String(removed?.adminId ?? "").trim(),
              accountId: String(removed?.submitterAccountId ?? "").trim(),
              action: "platform-feedback-deleted",
              title: "Feedback deleted",
              description: `Deleted ${removed?.type || "platform"} feedback ${id}.`,
              feedbackId: id,
              actor: {
                role: "admin",
                accountId: "super-admin",
                displayName: SUPER_ADMIN_USERNAME || "Super Admin",
              },
              createdAt: new Date().toISOString(),
              skipLinkedNotification: true,
            },
            request,
          );
        }

        sendJson(response, 200, {
          feedbackId: id,
          message: "Feedback deleted.",
        });
      } catch (error) {
        sendJson(response, 400, {
          message: error instanceof Error ? error.message : "Unable to delete feedback.",
        });
      }
      return;
    }

    if (request.method !== "PATCH" && request.method !== "PUT") {
      sendJson(response, 405, { message: "Method not allowed." });
      return;
    }
    if (!requireSuperAdmin(request, response)) return;

    try {
      const payload = await parseRequestBody(request);
      const entries = await readPlatformFeedback();
      const index = entries.findIndex((entry) => String(entry?.id ?? "").trim() === id);
      if (index === -1) {
        sendJson(response, 404, { message: "Feedback not found." });
        return;
      }

      const current = entries[index];
      const previousStatus = normalizePlatformFeedbackStatus(current.status);
      const nextStatus =
        payload?.status != null
          ? normalizePlatformFeedbackStatus(payload.status)
          : previousStatus;
      const now = new Date().toISOString();
      const notes = normalizeNotes(current.notes);
      const noteText = normalizePlatformFeedbackMessage(
        payload?.note ?? payload?.notesText ?? payload?.adminNote,
      );
      if (noteText) {
        notes.unshift({
          id: `note_${crypto.randomBytes(4).toString("hex")}`,
          text: noteText,
          createdAt: now,
          createdBy: SUPER_ADMIN_USERNAME || "Super Admin",
        });
      }

      const updated = {
        ...current,
        status: nextStatus,
        notes: notes.slice(0, MAX_PLATFORM_FEEDBACK_NOTES),
        readAt: current.readAt || now,
        readBy: current.readBy || SUPER_ADMIN_USERNAME,
        resolvedAt: nextStatus === "resolved" ? current.resolvedAt || now : "",
        resolvedBy: nextStatus === "resolved" ? SUPER_ADMIN_USERNAME : "",
      };
      entries[index] = updated;
      await writePlatformFeedback(entries);

      if (previousStatus !== "resolved" && nextStatus === "resolved") {
        if (updated.type === "seller") {
          await notifySellerFeedbackResolved(updated);
        } else if (updated.type === "user") {
          await notifyBuyerFeedbackResolved(updated);
        }
      }

      if (typeof logActivitySafely === "function" && (payload?.status != null || noteText)) {
        await logActivitySafely(
          {
            id: `activity-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
            type: "platform-feedback-updated",
            source: "super_admin",
            adminId: String(updated.adminId ?? "").trim(),
            accountId: String(updated.submitterAccountId ?? "").trim(),
            action: noteText ? "platform-feedback-note" : "platform-feedback-status",
            title: noteText ? "Feedback note added" : "Feedback status updated",
            description: noteText
              ? `Super Admin added a note on feedback ${id}.`
              : `Feedback ${id} set to ${nextStatus}.`,
            feedbackId: id,
            actor: {
              role: "admin",
              accountId: "super-admin",
              displayName: SUPER_ADMIN_USERNAME || "Super Admin",
            },
            createdAt: now,
            skipLinkedNotification: true,
          },
          request,
        );
      }

      sendJson(response, 200, {
        feedback: updated,
        message:
          nextStatus === "resolved"
            ? "Feedback marked as resolved."
            : noteText
              ? "Feedback note saved."
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

    const auth = await requireFeedbackUploadSession(request, response);
    if (!auth) return;

    try {
      await ensureStoragePaths();
      const contentType = String(request.headers["content-type"] ?? "").toLowerCase();
      const sourceFilename = decodeURIComponent(
        String(request.headers["x-file-name"] ?? "feedback-media"),
      );
      const extension = getUploadExtension(sourceFilename, contentType);
      const isImageUpload =
        contentType.startsWith("image/")
        || [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(extension);
      const isVideoUpload =
        contentType.startsWith("video/")
        || [".mp4", ".webm", ".mov", ".m4v"].includes(extension);
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
      let uploadUrl = `/uploads/${fileName}`;
      if (objectStorage) {
        uploadUrl = await objectStorage.saveUpload(fileName, fileBuffer, {
          contentType: contentType || (isVideoUpload ? "video/mp4" : "image/jpeg"),
        });
      } else {
        await fsPromises.writeFile(path.join(UPLOADS_DIR, fileName), fileBuffer);
      }

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
