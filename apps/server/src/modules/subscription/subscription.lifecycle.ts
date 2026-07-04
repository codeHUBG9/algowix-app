import { ConflictError } from "../../utils/errors.js";

// 12-Subscriptions.md §1 — Created → TRIALING → ACTIVE → PAST_DUE → SUSPENDED → CANCELLED,
// with an INCOMPLETE branch off TRIALING for "payment pending" (first checkout attempt
// failed but hasn't given up yet). Same shape as tenant.lifecycle.ts's org-level state
// machine, but this one tracks the per-product Subscription, not the Organization.
export const SUBSCRIPTION_STATUSES = [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "SUSPENDED",
  "CANCELLED",
  "INCOMPLETE",
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  TRIALING: ["ACTIVE", "CANCELLED", "INCOMPLETE"],
  INCOMPLETE: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["PAST_DUE", "CANCELLED"],
  PAST_DUE: ["ACTIVE", "SUSPENDED", "CANCELLED"],
  SUSPENDED: ["ACTIVE", "CANCELLED"],
  CANCELLED: [],
};

export function assertSubscriptionTransitionAllowed(from: SubscriptionStatus, to: SubscriptionStatus): void {
  if (!ALLOWED_TRANSITIONS[from]?.includes(to)) {
    throw new ConflictError(`Cannot transition subscription from ${from} to ${to}`);
  }
}

export function canSubscriptionTransition(from: SubscriptionStatus, to: SubscriptionStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
