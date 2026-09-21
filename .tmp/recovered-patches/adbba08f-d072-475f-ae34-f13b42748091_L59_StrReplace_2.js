function markSuperAdminNotificationRecordRead(notification, readAt = new Date().toISOString()) {
  if (!notification || typeof notification !== "object") {
    return notification;
  }
  if (!isLinkedNotificationUnread(notification)) {
    return notification;
  }
  return {
    ...notification,
    status: "read",
    read: true,
    readAt,
    readBy: SUPER_ADMIN_USERNAME,
  };
}

async function markSuperAdminNotificationsAsRead(criteria = {}) {
  const {
    ids = [],
    productId = "",
    feedbackId = "",
    adminId = "",
    types = [],
  } = criteria;
  const normalizedIds = new Set(
    (Array.isArray(ids) ? ids : [ids])
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  );
  const normalizedProductId = String(productId || "").trim();
  const normalizedFeedbackId = String(feedbackId || "").trim();
  const normalizedAdminId = normalizeAdminTenantId(adminId, "");
  const normalizedTypes = new Set(
    (Array.isArray(types) ? types : [types])
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean),
  );

  const notifications = await readSuperAdminNotifications();
  const readAt = new Date().toISOString();
  let didChange = false;
  const next = notifications.map((item) => {
    if (!isLinkedNotificationUnread(item)) {
      return item;
    }
    const itemType = String(item?.type || "").trim().toLowerCase();
    let shouldMark = false;
    const itemId = String(item?.id || "").trim();
    if (itemId && normalizedIds.has(itemId)) {
      shouldMark = true;
    }
    if (
      normalizedProductId &&
      String(item?.productId || "").trim() === normalizedProductId &&
      (normalizedTypes.size === 0 || normalizedTypes.has(itemType))
    ) {
      shouldMark = true;
    }
    if (
      normalizedFeedbackId &&
      String(item?.feedbackId || "").trim() === normalizedFeedbackId
    ) {
      shouldMark = true;
    }
    if (
      normalizedAdminId &&
      normalizeAdminTenantId(item?.adminId, "") === normalizedAdminId &&
      (normalizedTypes.size === 0 || normalizedTypes.has(itemType))
    ) {
      shouldMark = true;
    }
    if (!shouldMark) {
      return item;
    }
    didChange = true;
    return markSuperAdminNotificationRecordRead(item, readAt);
  });
  if (didChange) {
    await writeSuperAdminNotifications(next);
  }
  return { didChange, notifications: next };
}

async function syncHandledSuperAdminNotifications(notifications, {
  pendingProductIds = [],
  feedbackEntries = [],
} = {}) {
  const pendingIds = new Set(
    (Array.isArray(pendingProductIds) ? pendingProductIds : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  );
  const resolvedFeedbackIds = new Set(
    (Array.isArray(feedbackEntries) ? feedbackEntries : [])
      .filter((entry) => normalizePlatformFeedbackStatus(entry?.status) === "resolved")
      .map((entry) => String(entry?.id || "").trim())
      .filter(Boolean),
  );
  const readAt = new Date().toISOString();
  let didChange = false;
  const next = (Array.isArray(notifications) ? notifications : []).map((item) => {
    if (!isLinkedNotificationUnread(item)) {
      return item;
    }
    const itemType = String(item?.type || "").trim().toLowerCase();
    const productId = String(item?.productId || "").trim();
    if (
      productId &&
      ["product-submitted", "product-resubmitted", "product-created"].includes(itemType) &&
      !pendingIds.has(productId)
    ) {
      didChange = true;
      return markSuperAdminNotificationRecordRead(item, readAt);
    }
    const feedbackId = String(item?.feedbackId || "").trim();
    if (
      feedbackId &&
      ["seller-feedback", "user-feedback"].includes(itemType) &&
      resolvedFeedbackIds.has(feedbackId)
    ) {
      didChange = true;
      return markSuperAdminNotificationRecordRead(item, readAt);
    }
    return item;
  });
  if (didChange) {
    await writeSuperAdminNotifications(next);
  }
  return next;
}

async function writeSuperAdminNotifications(notifications) {