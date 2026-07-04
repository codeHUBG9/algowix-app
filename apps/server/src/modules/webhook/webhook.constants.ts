// 18-Integrations.md §2
export const WEBHOOK_EVENTS = [
  "organization.updated",
  "user.created",
  "user.updated",
  "user.removed",
  "subscription.created",
  "subscription.activated",
  "subscription.cancelled",
  "subscription.past_due",
  "invoice.paid",
  "invoice.created",
  "payment.succeeded",
  "payment.failed",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];
