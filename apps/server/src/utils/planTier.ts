// Shared ordering for Organization.plan (STARTER/GROWTH/BUSINESS/ENTERPRISE) —
// same tier set rateLimiter.ts's tieredRateLimiter uses, exposed here so any
// module can gate a feature behind a minimum plan without hardcoding the order.
const PLAN_TIER_ORDER = ["STARTER", "GROWTH", "BUSINESS", "ENTERPRISE"] as const;

export function isPlanAtLeast(orgPlan: string, minimum: (typeof PLAN_TIER_ORDER)[number]): boolean {
  const current = PLAN_TIER_ORDER.indexOf(orgPlan as (typeof PLAN_TIER_ORDER)[number]);
  const required = PLAN_TIER_ORDER.indexOf(minimum);
  return current >= required;
}
