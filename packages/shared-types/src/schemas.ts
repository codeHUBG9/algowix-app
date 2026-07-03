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
