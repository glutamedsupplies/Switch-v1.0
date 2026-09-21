async function handlePlatformFeedbackApi(request, response, requestUrl) {
  if (request.method === "GET") {
    if (!requireSuperAdmin(request, response)) {
      return;
    }

    try {
      const typeFilter = normalizePlatformFeedbackType(requestUrl.searchParams.get("type"));
      const statusFilter = String(requestUrl.searchParams.get("status") ?? "").trim().toLowerCase();
      const entries = await readPlatformFeedback();
      const feedback = entries
        .filter((entry) => {
          if (typeFilter && entry?.type !== typeFilter) {
            return false;
          }
          if (statusFilter && statusFilter !== "all") {
            return normalizePlatformFeedbackStatus(entry?.status) === normalizePlatformFeedbackStatus(statusFilter);
          }
          return true;
        })
        .sort(
          (left, right) =>
            (Date.parse(String(right?.createdAt ?? "")) || 0) -
            (Date.parse(String(left?.createdAt ?? "")) || 0),
        );

      sendJson(response, 200, {
        feedback,
        counts: {
          total: entries.length,
          seller: entries.filter((entry) => entry?.type === "seller").length,
          user: entries.filter((entry) => entry?.type === "user").length,
          open: entries.filter((entry) => normalizePlatformFeedbackStatus(entry?.status) === "open").length,
        },
      });
    } catch (error) {
      sendJson(response, 500, {
        message: error instanceof Error ? error.message : "Unable to load platform feedback.",
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

    const message = normalizePlatformFeedbackMessage(payload?.message ?? payload?.feedback);
    if (!message) {
      sendJson(response, 400, { message: "Please enter your feedback message." });
      return;
    }

    const createdAt = new Date().toISOString();
    let submitterAccountId = "";
    let submitterName = "";
    let submitterEmail = "";
    let adminId = "";
    let companyName = "";

    if (type === "seller") {
      const auth = await requireSellerFeedbackSession(request, response);
      if (!auth) {
        return;
      }
      submitterAccountId = String(auth.account?.id ?? auth.adminId).trim();
      adminId = auth.adminId;
      submitterName = getPlatformFeedbackSubmitterName(auth.account, "Seller");
      submitterEmail = String(auth.account?.email ?? "").trim();
      companyName = String(
        auth.account?.companyName ?? auth.account?.storeName ?? auth.account?.businessName ?? submitterName,
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

      const account = findBuyerAccountForAppActivity(accounts, accountId, payload?.email);
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
      message,
      status: "open",
      submitterAccountId,
      submitterName,
      submitterEmail,
      adminId,
      companyName,
      createdAt,
      resolvedAt: "",
      resolvedBy: "",
    };

    const entries = await readPlatformFeedback();
    await writePlatformFeedback([feedbackEntry, ...entries]);

    const typeLabel = type === "seller" ? "Seller" : "User";
    await persistSuperAdminNotification(
      createPersistentLinkedNotification({
        type: type === "seller" ? "seller-feedback" : "user-feedback",
        audience: "super_admin",
        title: `${typeLabel} feedback received`,
        reason: `${rating}/5 from ${submitterName || typeLabel}`,
        message: message.slice(0, 240),
        adminId,
        companyName,
        storeName: companyName,
        businessName: companyName,
        createdBy: submitterName || typeLabel,
        targetUrl: type === "seller" ? "/super_admin.html#seller-feedback" : "/super_admin.html#user-feedback",
        createdAt,
      }),
    );

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

  if (!requireSuperAdmin(request, response)) {
    return;
  }

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
    const nextStatus = payload?.status != null
      ? normalizePlatformFeedbackStatus(payload.status)
      : normalizePlatformFeedbackStatus(current.status);
    const now = new Date().toISOString();
    const updated = {
      ...current,
      status: nextStatus,
      resolvedAt: nextStatus === "resolved" ? (current.resolvedAt || now) : "",
      resolvedBy: nextStatus === "resolved" ? SUPER_ADMIN_USERNAME : "",
    };
    entries[index] = updated;
    await writePlatformFeedback(entries);

    sendJson(response, 200, {
      feedback: updated,
      message: nextStatus === "resolved" ? "Feedback marked as resolved." : "Feedback updated.",
    });
  } catch (error) {
    sendJson(response, 400, {
      message: error instanceof Error ? error.message : "Unable to update feedback.",
    });
  }
}