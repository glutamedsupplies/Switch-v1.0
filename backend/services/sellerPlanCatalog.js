"use strict";

const SELLER_PLANS = Object.freeze([
  Object.freeze({
    id: "seller-free",
    name: "Free",
    billingCycle: "monthly",
    amount: 0,
    yearlyAmount: 0,
    currencyCode: "PHP",
    popular: false,
    free: true,
    firstCompanyOnly: true,
    extraCompanySlots: 0,
    legitimateBadge: false,
    comingSoon: false,
    description:
      "Every seller gets one free company. The legitimate badge is earned from shop performance, not a paid plan.",
    features: Object.freeze([
      "1 company per account",
      "No subscription",
      "Seller admin after Super Admin review",
      "Legitimate badge from ratings, speed, and service",
    ]),
  }),
]);

function clonePlan(plan) {
  return {
    ...plan,
    features: [...plan.features],
  };
}

function getSellerPlanCatalog(paymentPartners = [], entitlement = {}) {
  const occupied = Number(entitlement.existingCompanyCount) || 0;
  return {
    plans: [],
    freePlan: clonePlan(SELLER_PLANS[0]),
    paymentPartners: [],
    firstCompanyFree: true,
    requiresPaidPlan: false,
    existingCompanyCount: occupied,
    canSubmitFreeFirst: occupied === 0 || Boolean(entitlement.canSubmitFreeFirst),
    oneCompanyPerAccount: true,
    subscriptionsRetired: true,
    paidExtraSlot: null,
  };
}

function invalidPlanError(message, code = "SELLER_PLAN_INVALID") {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = code;
  return error;
}

function findSellerPlan(input = {}) {
  const requestedId = String(input.planId ?? input.id ?? "").trim().toLowerCase();
  const requestedName = String(input.planName ?? input.name ?? "").trim().toLowerCase();
  if (!requestedId && !requestedName) {
    return SELLER_PLANS[0];
  }
  return SELLER_PLANS.find((plan) => (
    (requestedId && plan.id.toLowerCase() === requestedId)
    || (requestedName && (plan.name.toLowerCase() === requestedName || requestedName === "free plan"))
  )) || null;
}

function resolveSellerPlanSelection(input = {}, options = {}) {
  const selected = findSellerPlan(input);
  if (!selected) {
    throw invalidPlanError(
      "Subscriptions are retired. Every account gets one free company.",
      "SELLER_PLANS_RETIRED",
    );
  }
  if (options.requirePaid === true) {
    throw invalidPlanError(
      "Paid seller plans were removed. This account can have only one free company.",
      "SELLER_PLANS_RETIRED",
    );
  }
  return {
    planId: selected.id,
    planName: selected.name,
    billingCycle: "monthly",
    amount: 0,
    currencyCode: selected.currencyCode,
    free: true,
    firstCompanyOnly: true,
    extraCompanySlots: 0,
    legitimateBadge: false,
    comingSoon: false,
    slotBilling: "none",
  };
}

function resolveFirstCompanyFreePlan() {
  return resolveSellerPlanSelection({ planId: "seller-free" }, { allowFree: true });
}

function nextMonthlySlotExpiry() {
  return null;
}

function sellerPlanHasLegitimateBadge() {
  return false;
}

function sellerPlanMatchesIntent(selection, intent = {}) {
  return (
    String(intent.planName || "").trim().toLowerCase() === String(selection.planName || "").toLowerCase()
    && Number(intent.amount || 0) === Number(selection.amount || 0)
  );
}

module.exports = {
  SELLER_PLANS,
  getSellerPlanCatalog,
  resolveSellerPlanSelection,
  resolveFirstCompanyFreePlan,
  nextMonthlySlotExpiry,
  sellerPlanHasLegitimateBadge,
  sellerPlanMatchesIntent,
};
