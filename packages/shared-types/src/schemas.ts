import { z } from "zod";

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/\d/, "Password must contain a number"),
  organizationName: z.string().trim().min(2, "Organization name is required").max(255),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
  organizationSlug: z.string().trim().optional(),
});

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(1, "Verification token is required"),
});

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Organization name is required").max(255).optional(),
  legalName: z.string().trim().max(255).optional().or(z.literal("")),
  logoUrl: z.string().trim().url("Enter a valid URL").max(500).optional().or(z.literal("")),
  industry: z.string().trim().max(100).optional(),
  size: z.enum(["MICRO", "SMALL", "MEDIUM", "LARGE", "ENTERPRISE"]).optional().or(z.literal("")),
  foundedYear: z.coerce.number().int().min(1800).max(2100).optional().or(z.literal("")),
  website: z.string().trim().url("Enter a valid URL").max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().email("Enter a valid email").optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  state: z.string().trim().max(100).optional().or(z.literal("")),
  pincode: z.string().trim().max(20).optional().or(z.literal("")),
  timezone: z.string().trim().max(50).optional(),
  currency: z.string().trim().length(3, "Use a 3-letter currency code").optional().or(z.literal("")),
});

// ============================================================
// 08-Organization-Management.md
// ============================================================

export const createBranchSchema = z.object({
  name: z.string().trim().min(1, "Branch name is required").max(255),
  code: z.string().trim().max(50).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  state: z.string().trim().max(100).optional().or(z.literal("")),
  country: z.string().trim().max(100).optional().or(z.literal("")),
  pincode: z.string().trim().max(20).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  isHeadOffice: z.boolean().optional(),
});

export const updateBranchSchema = createBranchSchema.partial();

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(1, "Department name is required").max(255),
  code: z.string().trim().max(50).optional().or(z.literal("")),
  parentId: z.string().trim().optional().or(z.literal("")),
  headUserId: z.string().trim().optional().or(z.literal("")),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

export const createTeamSchema = z.object({
  name: z.string().trim().min(1, "Team name is required").max(255),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  memberIds: z.array(z.string()).optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const addTeamMemberSchema = z.object({
  userId: z.string().trim().min(1, "User is required"),
  role: z.enum(["LEAD", "MEMBER", "OBSERVER"]).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  roleId: z.string().trim().min(1, "Role is required"),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const updateMemberStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export const acceptInviteSchema = z.object({
  password: z.string().min(8).max(128).optional(),
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
});

export const brandingSettingsSchema = z.object({
  logoUrl: z.string().trim().url("Enter a valid URL").max(500).optional().or(z.literal("")),
  primaryColor: z.string().trim().max(20).optional().or(z.literal("")),
  faviconUrl: z.string().trim().url("Enter a valid URL").max(500).optional().or(z.literal("")),
  emailHeaderUrl: z.string().trim().url("Enter a valid URL").max(500).optional().or(z.literal("")),
});

export const securitySettingsSchema = z.object({
  passwordMinLength: z.coerce.number().int().min(8).max(128).optional(),
  sessionTimeoutMinutes: z.coerce.number().int().min(5).max(43200).optional(),
  allowedIps: z.string().trim().max(2000).optional().or(z.literal("")),
  twoFactorRequired: z.boolean().optional(),
});

export const notificationSettingsSchema = z.object({
  memberInvited: z.boolean().optional(),
  memberSuspended: z.boolean().optional(),
  billingAlerts: z.boolean().optional(),
  securityAlerts: z.boolean().optional(),
});

export const generalSettingsSchema = z.object({
  name: z.string().trim().min(2).max(255).optional(),
  timezone: z.string().trim().max(50).optional(),
  language: z.string().trim().max(10).optional(),
  currency: z.string().trim().length(3).optional(),
  dateFormat: z.string().trim().max(20).optional(),
});

// ============================================================
// 11-Billing.md / 12-Subscriptions.md
// ============================================================

export const checkoutSchema = z.object({
  productSlug: z.string().trim().min(1, "Product is required"),
  planSlug: z.string().trim().min(1, "Plan is required"),
  billingCycle: z.enum(["MONTHLY", "ANNUAL"]).default("MONTHLY"),
  couponCode: z.string().trim().max(50).optional().or(z.literal("")),
});

export const addPaymentMethodSchema = z.object({
  gatewayMethodId: z.string().trim().min(1, "Gateway method id is required"),
  type: z.enum(["CARD", "UPI", "NETBANKING", "SEPA", "ACH"]),
  brand: z.string().trim().max(30).optional().or(z.literal("")),
  last4: z.string().trim().length(4).optional().or(z.literal("")),
  expiryMonth: z.coerce.number().int().min(1).max(12).optional(),
  expiryYear: z.coerce.number().int().min(2024).max(2100).optional(),
  isDefault: z.boolean().optional(),
});

export const validateCouponSchema = z.object({
  code: z.string().trim().min(1, "Coupon code is required"),
  productSlug: z.string().trim().optional(),
});

export const createSubscriptionSchema = z.object({
  productSlug: z.string().trim().min(1, "Product is required"),
  planSlug: z.string().trim().min(1, "Plan is required"),
});

export const upgradeSubscriptionSchema = z.object({
  newPlanSlug: z.string().trim().min(1, "New plan is required"),
});

export const downgradeSubscriptionSchema = z.object({
  newPlanSlug: z.string().trim().min(1, "New plan is required"),
});

export const updateSeatsSchema = z.object({
  seatCount: z.coerce.number().int().min(1, "At least 1 seat is required"),
});

export const cancelSubscriptionSchema = z.object({
  immediately: z.boolean().optional(),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

// ============================================================
// 13-RBAC.md
// ============================================================

export const createRoleSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  permissionIds: z.array(z.string().trim().min(1)).min(1, "Select at least one permission"),
  productAccess: z.array(z.string().trim().min(1)).optional().default([]),
});

export const updateRoleSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  permissionIds: z.array(z.string().trim().min(1)).min(1, "Select at least one permission").optional(),
  productAccess: z.array(z.string().trim().min(1)).optional(),
});

export const updateMemberRoleSchema = z.object({
  roleId: z.string().trim().min(1, "Role is required"),
});

export type RegisterFormInput = z.infer<typeof registerSchema>;
export type LoginFormInput = z.infer<typeof loginSchema>;
export type VerifyEmailFormInput = z.infer<typeof verifyEmailSchema>;
export type UpdateOrganizationFormInput = z.infer<typeof updateOrganizationSchema>;

export type CreateBranchFormInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchFormInput = z.infer<typeof updateBranchSchema>;
export type CreateDepartmentFormInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentFormInput = z.infer<typeof updateDepartmentSchema>;
export type CreateTeamFormInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamFormInput = z.infer<typeof updateTeamSchema>;
export type AddTeamMemberFormInput = z.infer<typeof addTeamMemberSchema>;
export type InviteMemberFormInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberStatusFormInput = z.infer<typeof updateMemberStatusSchema>;
export type AcceptInviteFormInput = z.infer<typeof acceptInviteSchema>;
export type BrandingSettingsFormInput = z.infer<typeof brandingSettingsSchema>;
export type SecuritySettingsFormInput = z.infer<typeof securitySettingsSchema>;
export type NotificationSettingsFormInput = z.infer<typeof notificationSettingsSchema>;
export type GeneralSettingsFormInput = z.infer<typeof generalSettingsSchema>;

export type CheckoutFormInput = z.infer<typeof checkoutSchema>;
export type AddPaymentMethodFormInput = z.infer<typeof addPaymentMethodSchema>;
export type ValidateCouponFormInput = z.infer<typeof validateCouponSchema>;
export type CreateSubscriptionFormInput = z.infer<typeof createSubscriptionSchema>;
export type UpgradeSubscriptionFormInput = z.infer<typeof upgradeSubscriptionSchema>;
export type DowngradeSubscriptionFormInput = z.infer<typeof downgradeSubscriptionSchema>;
export type UpdateSeatsFormInput = z.infer<typeof updateSeatsSchema>;
export type CancelSubscriptionFormInput = z.infer<typeof cancelSubscriptionSchema>;

export type CreateRoleFormInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleFormInput = z.infer<typeof updateRoleSchema>;
export type UpdateMemberRoleFormInput = z.infer<typeof updateMemberRoleSchema>;

// ============================================================
// 14-Notifications.md
// ============================================================

export const notificationPreferencesSchema = z.object({
  email: z.object({
    billing: z.boolean().default(true),
    team: z.boolean().default(true),
    product: z.boolean().default(true),
    digest: z.boolean().default(false),
    digestTime: z.string().trim().max(5).default("09:00"),
    digestTimezone: z.string().trim().max(50).default("Asia/Kolkata"),
  }),
  push: z.object({
    enabled: z.boolean().default(true),
    types: z.array(z.string()).default([]),
  }),
});

export type NotificationPreferencesFormInput = z.infer<typeof notificationPreferencesSchema>;

// ============================================================
// 16-Files.md
// ============================================================

export const filePresignedUrlSchema = z.object({
  filename: z.string().trim().min(1, "Filename is required").max(255),
  mimeType: z.string().trim().min(1, "Mime type is required").max(150),
  sizeBytes: z.coerce.number().int().positive("File size must be positive"),
  folder: z.string().trim().max(255).optional().or(z.literal("")),
});

export type FilePresignedUrlFormInput = z.infer<typeof filePresignedUrlSchema>;

// ============================================================
// 18-Integrations.md
// ============================================================

export const createWebhookSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  url: z
    .string()
    .trim()
    .url("Enter a valid URL")
    .max(500)
    .refine((url) => url.startsWith("https://"), "Webhook URL must use HTTPS"),
  events: z.array(z.string().trim().min(1)).min(1, "Select at least one event"),
});

export const updateWebhookSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  url: z
    .string()
    .trim()
    .url("Enter a valid URL")
    .max(500)
    .refine((url) => url.startsWith("https://"), "Webhook URL must use HTTPS")
    .optional(),
  events: z.array(z.string().trim().min(1)).optional(),
  isActive: z.boolean().optional(),
});

export type CreateWebhookFormInput = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookFormInput = z.infer<typeof updateWebhookSchema>;
