import { z } from "zod";

export const updateTenantSchema = z
  .object({
    name: z.string().trim().min(2).max(255).optional(),
    legalName: z.string().trim().max(255).optional().nullable(),
    logoUrl: z.string().trim().url().max(500).optional().nullable(),
    industry: z.string().trim().max(100).optional().nullable(),
    size: z.enum(["MICRO", "SMALL", "MEDIUM", "LARGE", "ENTERPRISE"]).optional().nullable(),
    foundedYear: z.coerce.number().int().min(1800).max(2100).optional().nullable(),
    website: z.string().trim().url().max(255).optional().nullable(),
    phone: z.string().trim().max(20).optional().nullable(),
    email: z.string().trim().toLowerCase().email().optional().nullable(),
    address: z.string().trim().max(500).optional().nullable(),
    city: z.string().trim().max(100).optional().nullable(),
    state: z.string().trim().max(100).optional().nullable(),
    pincode: z.string().trim().max(20).optional().nullable(),
    timezone: z.string().trim().max(50).optional(),
    currency: z.string().trim().length(3).optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: "At least one field is required" });

export const suspendTenantSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type SuspendTenantInput = z.infer<typeof suspendTenantSchema>;
