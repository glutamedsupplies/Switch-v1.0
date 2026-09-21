    await persistSuperAdminNotification(
      createPersistentLinkedNotification({
        type: type === "seller" ? "seller-feedback" : "user-feedback",
        audience: "super_admin",
        title: `${typeLabel} feedback received`,
        reason: `${rating}/5 from ${submitterName || typeLabel}${category ? ` · ${category}` : ""}${attachments.length ? ` · ${attachments.length} attachment${attachments.length === 1 ? "" : "s"}` : ""}`,
        message: message.slice(0, 240),
        feedbackId: feedbackEntry.id,
        adminId,
        companyName,
        storeName: companyName,
        businessName: companyName,
        createdBy: submitterName || typeLabel,
        targetUrl: type === "seller" ? "/super_admin.html#seller-feedback" : "/super_admin.html#user-feedback",
        createdAt,
      }),
    );