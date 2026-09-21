        notification,
        product: {
          id: notification.productId,
          productId: notification.productId,
          name: notification.productName,
          submittedAt: notification.createdAt,
          createdAt: notification.createdAt,
          adminId: notification.adminId,
          companyName: notification.companyName,
          storeName: notification.storeName,
          businessName: notification.businessName,
          companyPictureUrl: notification.companyPictureUrl,
          companyProfileImageUrl: notification.companyProfileImageUrl,
          companyLogoUrl: notification.companyLogoUrl,
          profileImageUrl: notification.profileImageUrl,
          logoUrl: notification.logoUrl,
          feedbackId: notification.feedbackId,
        },
        createdAt: String(notification.createdAt || "").trim(),
      }));
  }

  function isSuperAdminNotificationRead(entry) {
    if (!entry?.id) {
      return true;
    }
    const notification = entry?.notification;
    if (notification) {
      if (notification.read === true) {
        return true;
      }
      const status = String(notification.status || "").trim().toLowerCase();
      if (status === "read") {
        return true;
      }
    }
    return state.notificationReadIds.has(entry.id);
  }

  function applyLocalSuperAdminNotificationRead(entry) {
    if (!entry?.id) {
      return;
    }
    state.notificationReadIds.add(entry.id);
    if (entry?.notification && typeof entry.notification === "object") {
      entry.notification.status = "read";
      entry.notification.read = true;
    }
    const linkedIndex = (Array.isArray(state.linkedNotifications) ? state.linkedNotifications : [])
      .findIndex((notification) => String(notification?.id || "").trim() === entry.id);
    if (linkedIndex >= 0) {
      state.linkedNotifications[linkedIndex] = {
        ...state.linkedNotifications[linkedIndex],
        status: "read",
        read: true,
      };
    }
  }

  async function markSuperAdminNotificationsReadOnServer(criteria = {}) {
    try {
      const response = await fetch("/api/super-admin/notifications/read", {
        method: "PATCH",
        headers: rootHeaders({
          Accept: "application/json",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(criteria),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return null;
      }
      if (Array.isArray(payload?.notifications)) {
        setLinkedNotifications(payload.notifications);
      }
      return payload;
    } catch (error) {
      return null;
    }
  }

  function markSuperAdminNotificationRead(entry, options = {}) {
    if (!entry?.id || isSuperAdminNotificationRead(entry)) {
      return;
    }
    applyLocalSuperAdminNotificationRead(entry);
    saveNotificationReadIds();
    updateNotificationCount();
    if (!options.skipRender) {
      renderNotificationPanel();
    }
    if (!options.skipPersist) {
      void markSuperAdminNotificationsReadOnServer({ ids: [entry.id] });
    }
  }

  function markSuperAdminNotificationsReadForProduct(productId, options = {}) {
    const normalizedProductId = String(productId || "").trim();
    if (!normalizedProductId) {
      return;
    }
    const entries = getNotificationPanelEntries().filter((entry) => {
      const entryProductId = String(
        entry?.product?.id
        || entry?.product?.productId
        || entry?.notification?.productId
        || "",
      ).trim();
      return entryProductId === normalizedProductId;
    });
    for (const entry of entries) {
      markSuperAdminNotificationRead(entry, { skipRender: true, skipPersist: true });
    }
    saveNotificationReadIds();
    updateNotificationCount();
    if (!options.skipRender) {
      renderNotificationPanel();
    }
    void markSuperAdminNotificationsReadOnServer({
      productId: normalizedProductId,
      types: ["product-submitted", "product-resubmitted", "product-created"],
    });
  }

  function markSuperAdminNotificationsReadForFeedback(feedbackId, options = {}) {
    const normalizedFeedbackId = String(feedbackId || "").trim();
    if (!normalizedFeedbackId) {
      return;
    }
    const entries = getNotificationPanelEntries().filter((entry) => {
      const type = getSuperAdminNotificationType(entry);
      if (!["seller-feedback", "user-feedback"].includes(type)) {
        return false;
      }
      return resolveFeedbackIdFromNotificationEntry(entry) === normalizedFeedbackId
        || String(entry?.notification?.feedbackId || "").trim() === normalizedFeedbackId;
    });
    for (const entry of entries) {
      markSuperAdminNotificationRead(entry, { skipRender: true, skipPersist: true });
    }
    saveNotificationReadIds();
    updateNotificationCount();
    if (!options.skipRender) {
      renderNotificationPanel();
    }
    void markSuperAdminNotificationsReadOnServer({
      feedbackId: normalizedFeedbackId,
      types: ["seller-feedback", "user-feedback"],
    });
  }

  function syncAutoSeenSuperAdminNotifications() {
    const pendingProductIds = new Set(
      (Array.isArray(state.productNotifications) ? state.productNotifications : [])
        .map((product) => String(product?.id || product?.productId || "").trim())
        .filter(Boolean),
    );
    const feedbackRows = [
      ...(Array.isArray(state.platformFeedback?.seller) ? state.platformFeedback.seller : []),
      ...(Array.isArray(state.platformFeedback?.user) ? state.platformFeedback.user : []),
    ];
    const resolvedFeedbackIds = new Set(
      feedbackRows
        .filter((entry) => normalizePlatformFeedbackStatusValue(entry?.status) === "resolved")
        .map((entry) => String(entry?.id || "").trim())
        .filter(Boolean),
    );
    let changed = false;
    for (const entry of getNotificationPanelEntries()) {
      if (isSuperAdminNotificationRead(entry)) {
        continue;
      }
      const type = getSuperAdminNotificationType(entry);
      const productId = String(
        entry?.product?.id
        || entry?.product?.productId
        || entry?.notification?.productId
        || "",
      ).trim();
      if (
        productId &&
        ["product-submitted", "product-resubmitted", "product-created"].includes(type) &&
        !pendingProductIds.has(productId)
      ) {
        applyLocalSuperAdminNotificationRead(entry);
        changed = true;
        continue;
      }
      const feedbackId = resolveFeedbackIdFromNotificationEntry(entry);
      if (
        feedbackId &&
        ["seller-feedback", "user-feedback"].includes(type) &&
        resolvedFeedbackIds.has(feedbackId)
      ) {
        applyLocalSuperAdminNotificationRead(entry);
        changed = true;
      }
    }
    if (changed) {
      saveNotificationReadIds();
      updateNotificationCount();
      renderNotificationPanel();
    }
  }

  function resolveFeedbackIdFromNotificationEntry(entry) {
    const notification = entry?.notification;
    const explicitId = String(notification?.feedbackId || entry?.product?.feedbackId || "").trim();
    if (explicitId) {
      return explicitId;
    }
    const type = String(notification?.type || "").trim().toLowerCase() === "user-feedback" ? "user" : "seller";
    const createdAtMs = Date.parse(String(notification?.createdAt || entry?.createdAt || "").trim()) || 0;
    const adminId = String(notification?.adminId || "").trim();
    const entries = Array.isArray(state.platformFeedback?.[type]) ? state.platformFeedback[type] : [];
    let bestMatch = "";
    let bestDelta = Number.POSITIVE_INFINITY;
    for (const item of entries) {
      const itemMs = Date.parse(String(item?.createdAt || "").trim()) || 0;
      if (!itemMs) {
        continue;
      }
      const itemAdminId = String(item?.adminId || "").trim();
      if (adminId && itemAdminId && itemAdminId !== adminId) {
        continue;
      }
      const delta = Math.abs(itemMs - createdAtMs);
      if (delta <= 15000 && delta < bestDelta) {
        bestDelta = delta;
        bestMatch = String(item?.id || "").trim();
      }
    }
    return bestMatch;
  }

  function preparePlatformFeedbackNotificationNavigation(feedbackType, feedbackId) {
    const type = feedbackType === "user" ? "user" : "seller";
    if (!state.platformFeedback.page || typeof state.platformFeedback.page !== "object") {
      state.platformFeedback.page = { seller: 1, user: 1 };
    }
    const normalizedFeedbackId = String(feedbackId || "").trim();
    if (normalizedFeedbackId) {
      const entries = getFilteredPlatformFeedbackEntries(type);
      const targetIndex = entries.findIndex(
        (entry) => String(entry?.id || "").trim() === normalizedFeedbackId,
      );
      if (targetIndex >= 0) {
        const pageSize = Math.max(1, Number(state.platformFeedback?.pageSize) || 8);
        state.platformFeedback.page[type] = Math.floor(targetIndex / pageSize) + 1;
      }
      state.platformFeedback.selectedId = normalizedFeedbackId;
      state.platformFeedback.selectedType = type;
    }
  }

  function prepareCompanyNotificationNavigation(adminId) {
    const normalizedAdminId = String(adminId || "").trim();
    if (!normalizedAdminId) {
      return;
    }
    const filteredAdmins = sortAdmins(getFilteredAdmins(state.admins));
    const targetIndex = filteredAdmins.findIndex(
      (admin) => String(getCompanyId(admin) || "").trim() === normalizedAdminId,
    );
    if (targetIndex >= 0) {
      const pageSize = getCompanyPageSizeForAccountFilter(
        state.companyAccountFilter,
        filteredAdmins.length,
      );
      state.companyPage = Math.floor(targetIndex / Math.max(1, pageSize)) + 1;
    }
  }

  function prepareSuperAdminNotificationTrace(entry) {
    const destination = getSuperAdminNotificationDestination(entry);
    const type = getSuperAdminNotificationType(entry);
    const productId = String(
      entry?.product?.id
      || entry?.product?.productId
      || entry?.notification?.productId
      || entry?.id
      || "",
    ).trim();
    const adminId = String(entry?.notification?.adminId || entry?.product?.adminId || "").trim();

    state.notificationTrace = {
      kind: "",
      productId: "",
      feedbackId: "",
      feedbackType: "",
      adminId: "",
      openDrawer: false,
    };
    state.notificationTraceProductId = "";

    if (destination === "product-requests" && productId) {
      state.notificationTrace.kind = "product";
      state.notificationTrace.productId = productId;
      state.notificationTraceProductId = productId;
      prepareProductRequestNotificationNavigation(productId);
      return;
    }

    if (destination === "seller-feedback" || destination === "user-feedback") {
      const feedbackType = destination === "user-feedback" ? "user" : "seller";
      const feedbackId = resolveFeedbackIdFromNotificationEntry(entry);
      state.notificationTrace.kind = "feedback";
      state.notificationTrace.feedbackId = feedbackId;
      state.notificationTrace.feedbackType = feedbackType;
      state.notificationTrace.openDrawer = Boolean(feedbackId);
      preparePlatformFeedbackNotificationNavigation(feedbackType, feedbackId);
      return;
    }

    if (destination === "companies" && adminId) {
      state.notificationTrace.kind = "company";
      state.notificationTrace.adminId = adminId;
      state.notificationTrace.openDrawer = type === "seller-profile-updated";
      prepareCompanyNotificationNavigation(adminId);
    }
  }

  function getNotificationPanelEntries() {