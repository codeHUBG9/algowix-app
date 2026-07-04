export type SubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELLED" | "INCOMPLETE";

export interface Subscription {
  id: string;
  productSlug: string;
  productName: string;
  planId: string;
  planSlug: string;
  planName: string;
  status: SubscriptionStatus;
  seatCount: number;
  maxSeats: number | null;
  billingCycle: string;
  trialEndsAt: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
}

export interface SubscriptionHistoryEntry {
  id: string;
  action: string;
  createdAt: string;
}

export interface FeatureAccessResult {
  allowed: boolean;
  reason?: string;
}
