"use strict";

const BADGE_RULES = Object.freeze({
  minRating: 4.5,
  minReviews: 8,
  minCompletedOrders: 15,
  minChats: 8,
  minTimedReplies: 3,
  maxFirstResponseHours: 4,
  maxResolutionHours: 48,
  maxCancelRate: 0.3,
  maxOpenReports: 2,
});

const COMPLETED_STAGES = new Set([
  "received",
  "toreview",
  "to_review",
  "completed",
  "delivered",
  "done",
]);

const CANCELLED_STAGES = new Set([
  "cancelled",
  "canceled",
  "cancel",
]);

function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asEpoch(value) {
  if (value == null || value === "") {
    return 0;
  }
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : 0;
  }
  const number = Number(value);
  if (Number.isFinite(number) && number > 0) {
    if (number > 1e12) {
      return number;
    }
    if (number > 1e9) {
      return number * 1000;
    }
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function orderStage(order) {
  return String(order?.stage ?? order?.status ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "");
}

function isCompletedOrder(order) {
  const stage = orderStage(order);
  return COMPLETED_STAGES.has(stage) || Number(order?.customerReceivedAtEpochMs || 0) > 0;
}

function isCancelledOrder(order) {
  const stage = orderStage(order);
  return CANCELLED_STAGES.has(stage) || Number(order?.cancelledAtEpochMs || 0) > 0;
}

function messageTimeMs(message) {
  return asEpoch(
    message?.timestamp
    ?? message?.sentAt
    ?? message?.createdAt
    ?? message?.sent_at,
  );
}

function isSellerMessage(message) {
  if (!message || message.deletedAt) {
    return false;
  }
  const role = String(message.senderRole ?? message.source ?? "").trim().toLowerCase();
  return message.isFromSupport === true
    || role === "seller"
    || role === "support"
    || role === "admin"
    || role === "employee";
}

function firstResponseHoursForThread(thread) {
  const messages = (Array.isArray(thread?.messages) ? thread.messages : [])
    .filter((message) => messageTimeMs(message) > 0)
    .sort((left, right) => messageTimeMs(left) - messageTimeMs(right));
  const firstBuyer = messages.find((message) => !isSellerMessage(message));
  if (!firstBuyer) {
    return null;
  }
  const buyerAt = messageTimeMs(firstBuyer);
  const firstSeller = messages.find((message) => (
    isSellerMessage(message) && messageTimeMs(message) >= buyerAt
  ));
  if (!firstSeller) {
    return null;
  }
  return Math.max(0, (messageTimeMs(firstSeller) - buyerAt) / 36e5);
}

function concernWindowHours(order) {
  const requestedAt = asEpoch(
    order?.cancelRequestSubmittedAtEpochMs
    || order?.returnRequestSubmittedAtEpochMs
    || order?.returnRequestedAtEpochMs
    || order?.returnRequestedAt
    || order?.cancelRequestedAt,
  );
  if (!requestedAt) {
    return null;
  }
  const resolvedAt = asEpoch(
    order?.cancelRequestResolvedAtEpochMs
    || order?.returnRequestResolvedAtEpochMs
    || order?.cancelledAtEpochMs
    || order?.cancelledAt
    || order?.returnResolvedAt,
  );
  if (resolvedAt && resolvedAt >= requestedAt) {
    return {
      hours: (resolvedAt - requestedAt) / 36e5,
      open: false,
    };
  }
  return {
    hours: (Date.now() - requestedAt) / 36e5,
    open: true,
  };
}

function average(values) {
  const numbers = values.filter((value) => Number.isFinite(value));
  if (!numbers.length) {
    return null;
  }
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function buildSellerPerformanceMetrics({
  orders = [],
  chatThreads = [],
  reportSummary = {},
  accountState = "",
} = {}) {
  const orderList = Array.isArray(orders) ? orders : [];
  const threads = Array.isArray(chatThreads) ? chatThreads : [];
  const completedOrders = orderList.filter(isCompletedOrder).length;
  const cancelledOrders = orderList.filter(isCancelledOrder).length;
  const decidedOrders = completedOrders + cancelledOrders;
  const cancelRate = decidedOrders > 0 ? cancelledOrders / decidedOrders : 0;
  const replyHours = threads
    .map(firstResponseHoursForThread)
    .filter((value) => Number.isFinite(value));
  const concernWindows = orderList
    .map(concernWindowHours)
    .filter(Boolean);
  const resolvedHours = concernWindows
    .filter((entry) => entry.open === false)
    .map((entry) => entry.hours);
  const openStaleConcerns = concernWindows.filter((entry) => (
    entry.open === true && entry.hours > BADGE_RULES.maxResolutionHours
  )).length;

  return {
    completedOrders,
    cancelledOrders,
    cancelRate,
    chats: threads.length,
    timedReplies: replyHours.length,
    avgFirstResponseHours: average(replyHours),
    resolvedConcerns: resolvedHours.length,
    avgResolutionHours: average(resolvedHours),
    openStaleConcerns,
    openReports: asNumber(reportSummary.openCount ?? reportSummary.pendingCount, 0),
    needsWarning: reportSummary.needsWarning === true,
    accountState: String(accountState || "").trim().toLowerCase(),
  };
}

function evaluateSellerPerformanceBadge(input = {}) {
  const counts = input.counts && typeof input.counts === "object" ? input.counts : {};
  const metrics = input.metrics && typeof input.metrics === "object"
    ? input.metrics
    : {};
  const rating = asNumber(input.rating ?? counts.rating);
  const reviews = Math.trunc(asNumber(
    input.reviews ?? input.commentCount ?? counts.commentCount ?? counts.reviewCount,
  ));
  const orders = Math.trunc(asNumber(
    input.completedOrders
    ?? counts.completedOrders
    ?? metrics.completedOrders
    ?? input.orders
    ?? counts.orders,
  ));
  const chats = Math.trunc(asNumber(
    input.chats ?? input.chatThreads ?? counts.chatThreads ?? counts.chats ?? metrics.chats,
  ));
  const cancelRate = asNumber(
    input.cancelRate ?? counts.cancelRate ?? metrics.cancelRate,
    0,
  );
  const timedReplies = Math.trunc(asNumber(
    input.timedReplies ?? counts.timedReplies ?? metrics.timedReplies,
  ));
  const responseHours = input.avgFirstResponseHours == null && counts.avgFirstResponseHours == null
    && metrics.avgFirstResponseHours == null
    ? null
    : asNumber(
      input.avgFirstResponseHours ?? counts.avgFirstResponseHours ?? metrics.avgFirstResponseHours,
      Number.POSITIVE_INFINITY,
    );
  const resolutionHours = input.avgResolutionHours == null && counts.avgResolutionHours == null
    && metrics.avgResolutionHours == null
    ? null
    : asNumber(
      input.avgResolutionHours ?? counts.avgResolutionHours ?? metrics.avgResolutionHours,
      Number.POSITIVE_INFINITY,
    );
  const openStaleConcerns = Math.trunc(asNumber(
    input.openStaleConcerns ?? counts.openStaleConcerns ?? metrics.openStaleConcerns,
  ));
  const reportSummary = input.reportSummary && typeof input.reportSummary === "object"
    ? input.reportSummary
    : {};
  const openReports = Math.trunc(asNumber(
    input.openReports ?? counts.openReports ?? metrics.openReports ?? reportSummary.openCount,
  ));
  const needsWarning = input.needsWarning === true
    || counts.needsWarning === true
    || metrics.needsWarning === true
    || reportSummary.needsWarning === true;
  const accountState = String(
    input.accountState ?? counts.accountState ?? metrics.accountState ?? "",
  ).trim().toLowerCase();

  const shopPerformance = {
    key: "shopPerformance",
    label: "Strong shop performance",
    ok: orders >= BADGE_RULES.minCompletedOrders && cancelRate <= BADGE_RULES.maxCancelRate,
    detail: `${orders} completed orders (need ${BADGE_RULES.minCompletedOrders}+) · ${(cancelRate * 100).toFixed(0)}% cancel/return (max ${(BADGE_RULES.maxCancelRate * 100).toFixed(0)}%)`,
  };
  const ratingPillar = {
    key: "rating",
    label: "High buyer rating",
    ok: rating >= BADGE_RULES.minRating && reviews >= BADGE_RULES.minReviews,
    detail: `${rating.toFixed(1)} from ${reviews} reviews (need ${BADGE_RULES.minRating}+ and ${BADGE_RULES.minReviews}+ reviews)`,
  };
  const responseOk = responseHours != null && timedReplies >= BADGE_RULES.minTimedReplies
    ? responseHours <= BADGE_RULES.maxFirstResponseHours
    : chats >= BADGE_RULES.minChats;
  const responsePillar = {
    key: "response",
    label: "Fast client response",
    ok: responseOk,
    detail: responseHours != null && timedReplies >= BADGE_RULES.minTimedReplies
      ? `${responseHours.toFixed(1)}h average first reply (need ≤ ${BADGE_RULES.maxFirstResponseHours}h)`
      : `${chats} buyer chats (need ${BADGE_RULES.minChats}+ replied conversations)`,
  };
  const resolutionOk = openStaleConcerns === 0 && (
    resolutionHours == null
      ? shopPerformance.ok && ratingPillar.ok
      : resolutionHours <= BADGE_RULES.maxResolutionHours
  );
  const resolutionPillar = {
    key: "resolution",
    label: "Fast problem resolution",
    ok: resolutionOk,
    detail: openStaleConcerns > 0
      ? `${openStaleConcerns} buyer concern${openStaleConcerns === 1 ? "" : "s"} still open past ${BADGE_RULES.maxResolutionHours}h`
      : resolutionHours == null
        ? "No cancel/return cases yet — keep ratings and completed orders strong"
        : `${resolutionHours.toFixed(1)}h average concern close (need ≤ ${BADGE_RULES.maxResolutionHours}h)`,
  };
  const blockedState = ["banned", "restricted", "suspended", "deactivated"].includes(accountState);
  const trustPillar = {
    key: "trust",
    label: "Clean buyer trust",
    ok: !blockedState && !needsWarning && openReports <= BADGE_RULES.maxOpenReports,
    detail: blockedState
      ? `Company is ${accountState}`
      : needsWarning
        ? "Too many distinct buyer reports — Super Admin warning threshold reached"
        : `${openReports} open reports (max ${BADGE_RULES.maxOpenReports})`,
  };

  const pillars = [shopPerformance, ratingPillar, responsePillar, resolutionPillar, trustPillar];
  const earned = pillars.every((pillar) => pillar.ok);
  return {
    earned,
    source: "performance",
    rules: BADGE_RULES,
    pillars,
    missing: pillars.filter((pillar) => !pillar.ok).map((pillar) => pillar.label),
  };
}

function accountHasLegitimatePerformanceBadge(account, counts = null) {
  return evaluateSellerPerformanceBadge({
    ...(account && typeof account === "object" ? account : {}),
    counts: counts || account?.counts || {},
    reportSummary: account?.reportSummary,
    accountState: account?.accountState || account?.companyStatus || account?.companyEnforcementStatus,
  }).earned;
}

module.exports = {
  BADGE_RULES,
  evaluateSellerPerformanceBadge,
  accountHasLegitimatePerformanceBadge,
  buildSellerPerformanceMetrics,
  isCompletedOrder,
  isCancelledOrder,
};
