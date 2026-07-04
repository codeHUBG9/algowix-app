import { z } from "zod";

export const auditQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  actorId: z.string().trim().optional(),
  action: z.string().trim().optional(),
  resource: z.string().trim().optional(),
  severity: z.enum(["INFO", "WARNING", "CRITICAL"]).optional(),
  ipAddress: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type AuditQueryInput = z.infer<typeof auditQuerySchema>;

export const auditExportQuerySchema = auditQuerySchema
  .omit({ page: true, limit: true })
  .extend({ format: z.enum(["csv", "json"]).default("csv") });

export type AuditExportQueryInput = z.infer<typeof auditExportQuerySchema>;
