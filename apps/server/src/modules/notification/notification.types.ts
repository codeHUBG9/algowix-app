// 14-Notifications.md §2 — notification type catalog, grouped by category so
// the preferences UI can gate email delivery per-category (billing/team/product).
export const NOTIFICATION_TYPES = {
  EMAIL_VERIFICATION: "auth.email_verification",
  PASSWORD_RESET: "auth.password_reset",
  SECURITY_ALERT: "auth.security_alert",
  TRIAL_EXPIRING: "billing.trial_expiring",
  SUBSCRIPTION_ACTIVATED: "billing.subscription_activated",
  PAYMENT_FAILED: "billing.payment_failed",
  INVOICE_PAID: "billing.invoice_paid",
  USER_INVITED: "team.user_invited",
  USER_JOINED: "team.user_joined",
  PRODUCT_DOWN: "product.health_down",
  USAGE_LIMIT_WARNING: "product.usage_limit_warning",
} as const;

export type NotificationTypeValue = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export function categoryForType(type: string): "security" | "billing" | "team" | "product" {
  if (type === "auth.security_alert") return "security";
  const prefix = type.split(".")[0];
  if (prefix === "billing") return "billing";
  if (prefix === "team") return "team";
  if (prefix === "product") return "product";
  return "security";
}
