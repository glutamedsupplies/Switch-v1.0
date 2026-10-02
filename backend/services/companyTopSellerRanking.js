"use strict";

const COMPANY_TOP_SELLER_RULES = Object.freeze({
  evaluationDays: 90,
  ratingPoints: 28,
  reviewPoints: 18,
  responsePoints: 24,
  operationsPoints: 18,
  trustPoints: 12,
  ratingPrior: 3.5,
  ratingPriorWeight: 8,
  reviewsFullAt: 80,
  completedOrdersFullAt: 40,
  unitsSoldFullAt: 200,
  minTimedReplies: 3,
  fastReplyHours: 1,
  slowReplyHours: 12,
  chatsPartialAt: 8,
  maxCancelRate: 0.3,
  blockedAccountStates: Object.freeze([
    "banned",
    "restricted",
    "suspended",
    "deactivated",
    "pending-deletion",
    "deleted",
    "pending-review",
  ]),
});

const DAY_MS = 24 * 60 * 60 * 1000;

function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundScore(value) {
  return Math.round(asNumber(value) * 10) / 10;
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

function logScale(value, fullAt, maxPoints) {
  const amount = Math.max(0, asNumber(value));
  const cap = Math.max(1, asNumber(fullAt, 1));
  if (amount <= 0 || maxPoints <= 0) {
    return 0;
  }
  return Math.min(
    maxPoints,
    (Math.log10(amount + 1) / Math.log10(cap + 1)) * maxPoints,
  );
}

function bayesianRating(rating, reviews) {
  const stars = clamp(asNumber(rating), 0, 5);
  const count = Math.max(0, Math.trunc(asNumber(reviews)));
  const priorWeight = COMPANY_TOP_SELLER_RULES.ratingPriorWeight;
  return (
    (count / (count + priorWeight)) * stars
    + (priorWeight / (count + priorWeight)) * COMPANY_TOP_SELLER_RULES.ratingPrior
  );
}

function getCompanyStartTime(source = {}) {
  return asEpoch(
    source.createdAt
      ?? source.created_at
      ?? source.approvedAt
      ?? source.approved_at
      ?? source.registeredAt
      ?? source.registered_at
      ?? source.dateCreated
      ?? source.joinedAt,
  );
}

function getAccountStateToken(source = {}) {
  return String(
    source.accountState
      ?? source.companyStatus
      ?? source.companyEnforcementStatus
      ?? source.status
      ?? "",
  )
    .trim()
    .toLowerCase();
}

function isBlockedTopSellerAccount(source = {}) {
  const token = getAccountStateToken(source);
  return COMPANY_TOP_SELLER_RULES.blockedAccountStates.some((state) => (
    token === state || token.includes(state)
  ));
}

function getCompanyTopSellerEvaluation(source = {}, now = Date.now()) {
  const startedAt = getCompanyStartTime(source);
  const evaluationMs = COMPANY_TOP_SELLER_RULES.evaluationDays * DAY_MS;
  if (!startedAt) {
    return {
      eligible: false,
      evaluating: true,
      blocked: isBlockedTopSellerAccount(source),
      startedAt: "",
      endsAt: "",
      daysRemaining: COMPANY_TOP_SELLER_RULES.evaluationDays,
      evaluationDays: COMPANY_TOP_SELLER_RULES.evaluationDays,
      progress: 0,
    };
  }

  const endsAt = startedAt + evaluationMs;
  const remainingMs = Math.max(0, endsAt - now);
  const elapsedMs = Math.max(0, now - startedAt);
  const blocked = isBlockedTopSellerAccount(source);
  const windowComplete = now >= endsAt;
  return {
    eligible: windowComplete && !blocked,
    evaluating: !windowComplete && !blocked,
    blocked,
    startedAt: new Date(startedAt).toISOString(),
    endsAt: new Date(endsAt).toISOString(),
    daysRemaining: Math.ceil(remainingMs / DAY_MS),
    evaluationDays: COMPANY_TOP_SELLER_RULES.evaluationDays,
    progress: clamp(elapsedMs / evaluationMs, 0, 1),
  };
}

function scoreResponseQuality(input = {}) {
  const chats = Math.max(0, Math.trunc(asNumber(input.chats ?? input.chatThreads)));
  const timedReplies = Math.max(0, Math.trunc(asNumber(input.timedReplies)));
  const hours = input.avgFirstResponseHours == null
    ? null
    : asNumber(input.avgFirstResponseHours, Number.POSITIVE_INFINITY);
  const maxPoints = COMPANY_TOP_SELLER_RULES.responsePoints;

  if (hours != null && Number.isFinite(hours) && timedReplies >= COMPANY_TOP_SELLER_RULES.minTimedReplies) {
    if (hours <= COMPANY_TOP_SELLER_RULES.fastReplyHours) {
      return maxPoints;
    }
    if (hours >= COMPANY_TOP_SELLER_RULES.slowReplyHours) {
      return 0;
    }
    const span = COMPANY_TOP_SELLER_RULES.slowReplyHours - COMPANY_TOP_SELLER_RULES.fastReplyHours;
    return maxPoints * (1 - (hours - COMPANY_TOP_SELLER_RULES.fastReplyHours) / span);
  }

  if (chats >= COMPANY_TOP_SELLER_RULES.chatsPartialAt) {
    return maxPoints * 0.42;
  }
  if (chats > 0) {
    return maxPoints * 0.2;
  }
  return 0;
}

function scoreTrustQuality(input = {}, reviews = 0, completedOrders = 0) {
  const chats = Math.max(0, Math.trunc(asNumber(input.chats ?? input.chatThreads)));
  const timedReplies = Math.max(0, Math.trunc(asNumber(input.timedReplies)));
  const cancelRate = clamp(asNumber(input.cancelRate), 0, 1);
  const openStaleConcerns = Math.max(0, Math.trunc(asNumber(input.openStaleConcerns)));
  const openReports = Math.max(0, Math.trunc(asNumber(input.openReports)));
  const needsWarning = input.needsWarning === true;
  const evidence = clamp(
    0.35 * Math.min(1, reviews / COMPANY_TOP_SELLER_RULES.ratingPriorWeight)
    + 0.35 * Math.min(1, completedOrders / COMPANY_TOP_SELLER_RULES.ratingPriorWeight)
    + 0.3 * Math.min(1, Math.max(timedReplies, chats) / COMPANY_TOP_SELLER_RULES.ratingPriorWeight),
    0,
    1,
  );
  let trustPts = COMPANY_TOP_SELLER_RULES.trustPoints * evidence;
  if (cancelRate > COMPANY_TOP_SELLER_RULES.maxCancelRate) {
    trustPts -= 5;
  }
  if (openStaleConcerns > 0) {
    trustPts -= Math.min(5, openStaleConcerns * 2.5);
  }
  if (openReports > 2) {
    trustPts -= 3;
  }
  if (needsWarning) {
    trustPts = 0;
  }
  return clamp(trustPts, 0, COMPANY_TOP_SELLER_RULES.trustPoints);
}

function computeCompanyTopSellerBreakdown(input = {}) {
  const rating = clamp(asNumber(input.rating), 0, 5);
  const reviews = Math.max(
    0,
    Math.trunc(asNumber(input.reviews ?? input.commentCount ?? input.reviewCount)),
  );
  const completedOrders = Math.max(
    0,
    Math.trunc(asNumber(input.completedOrders ?? input.orders)),
  );
  const unitsSold = Math.max(0, Math.trunc(asNumber(input.unitsSold)));
  const cancelRate = clamp(asNumber(input.cancelRate), 0, 1);
  const priorWeight = COMPANY_TOP_SELLER_RULES.ratingPriorWeight;
  const ratingConfidence = reviews / (reviews + priorWeight);
  const ratingPts = (bayesianRating(rating, reviews) / 5)
    * COMPANY_TOP_SELLER_RULES.ratingPoints
    * ratingConfidence;
  const reviewPts = logScale(
    reviews,
    COMPANY_TOP_SELLER_RULES.reviewsFullAt,
    COMPANY_TOP_SELLER_RULES.reviewPoints,
  );
  const responsePts = scoreResponseQuality(input);
  const volumePts = logScale(
    completedOrders,
    COMPANY_TOP_SELLER_RULES.completedOrdersFullAt,
    12,
  ) + logScale(
    unitsSold,
    COMPANY_TOP_SELLER_RULES.unitsSoldFullAt,
    6,
  );
  const operationsPts = volumePts * (1 - cancelRate * 0.7);
  const trustPts = scoreTrustQuality(input, reviews, completedOrders);
  const breakdown = {
    rating: roundScore(ratingPts),
    reviews: roundScore(reviewPts),
    response: roundScore(responsePts),
    operations: roundScore(operationsPts),
    trust: roundScore(trustPts),
  };
  return {
    breakdown,
    score: roundScore(
      breakdown.rating
        + breakdown.reviews
        + breakdown.response
        + breakdown.operations
        + breakdown.trust,
    ),
  };
}

function scoreCompanyTopSeller(input = {}, now = Date.now()) {
  const evaluation = getCompanyTopSellerEvaluation(input, now);
  const emptyBreakdown = {
    rating: 0,
    reviews: 0,
    response: 0,
    operations: 0,
    trust: 0,
  };

  if (evaluation.blocked) {
    return {
      eligible: false,
      evaluating: false,
      blocked: true,
      score: 0,
      earlyScore: 0,
      evaluation,
      breakdown: emptyBreakdown,
    };
  }

  const computed = computeCompanyTopSellerBreakdown(input);
  return {
    eligible: evaluation.eligible,
    evaluating: evaluation.evaluating,
    blocked: false,
    score: computed.score,
    earlyScore: computed.score,
    evaluation,
    breakdown: computed.breakdown,
  };
}

function scoreStoreTypeRankingItem(input = {}) {
  const unitsSold = Math.max(0, Math.trunc(asNumber(input.unitsSold ?? input.sold)));
  const income = Math.max(0, asNumber(input.income));
  const rating = clamp(asNumber(input.rating), 0, 5);
  const ratingCount = Math.max(
    0,
    Math.trunc(asNumber(input.ratingCount ?? input.reviewCount ?? input.reviews)),
  );
  const ratingConfidence = ratingCount / (ratingCount + COMPANY_TOP_SELLER_RULES.ratingPriorWeight);
  const breakdown = {
    sold: roundScore(logScale(unitsSold, 200, 40)),
    income: roundScore(logScale(income, 50000, 20)),
    rating: roundScore((rating / 5) * 25 * ratingConfidence),
    reviews: roundScore(logScale(ratingCount, 80, 15)),
  };
  return {
    score: roundScore(
      breakdown.sold + breakdown.income + breakdown.rating + breakdown.reviews,
    ),
    breakdown,
  };
}

function compareCompanyTopSellerRows(left, right) {
  const scoreDiff = asNumber(right?.score) - asNumber(left?.score);
  if (scoreDiff) {
    return scoreDiff;
  }
  const ratingDiff = asNumber(right?.rating) - asNumber(left?.rating);
  if (ratingDiff) {
    return ratingDiff;
  }
  const reviewDiff = asNumber(right?.reviewCount ?? right?.reviews)
    - asNumber(left?.reviewCount ?? left?.reviews);
  if (reviewDiff) {
    return reviewDiff;
  }
  const leftHours = Number.isFinite(Number(left?.avgFirstResponseHours))
    ? Number(left.avgFirstResponseHours)
    : Number.POSITIVE_INFINITY;
  const rightHours = Number.isFinite(Number(right?.avgFirstResponseHours))
    ? Number(right.avgFirstResponseHours)
    : Number.POSITIVE_INFINITY;
  if (leftHours !== rightHours) {
    return leftHours - rightHours;
  }
  return String(left?.companyName || "").localeCompare(String(right?.companyName || ""), undefined, {
    sensitivity: "base",
  });
}

module.exports = {
  COMPANY_TOP_SELLER_RULES,
  getCompanyTopSellerEvaluation,
  scoreCompanyTopSeller,
  scoreStoreTypeRankingItem,
  compareCompanyTopSellerRows,
};
