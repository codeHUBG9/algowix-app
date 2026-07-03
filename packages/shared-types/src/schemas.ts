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
  logoUrl: z.string().trim().url("Enter a valid URL").max(500).optional().or(z.literal("")),
  industry: z.string().trim().max(100).optional(),
  size: z.enum(["MICRO", "SMALL", "MEDIUM", "LARGE", "ENTERPRISE"]).optional().or(z.literal("")),
  timezone: z.string().trim().max(50).optional(),
  currency: z.string().trim().length(3, "Use a 3-letter currency code").optional().or(z.literal("")),
});

export type RegisterFormInput = z.infer<typeof registerSchema>;
export type LoginFormInput = z.infer<typeof loginSchema>;
export type VerifyEmailFormInput = z.infer<typeof verifyEmailSchema>;
export type UpdateOrganizationFormInput = z.infer<typeof updateOrganizationSchema>;
