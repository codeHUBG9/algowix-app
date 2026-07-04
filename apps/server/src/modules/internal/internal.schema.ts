import { z } from "zod";

// 09-Product-Integration.md §5 — product -> platform push payloads.
// Note: the doc's examples include a free-form `metadata` object, but
// neither Notification nor AuditLog has a metadata column in this schema
// (05-Database-Design.md's tables as built) — not accepted here rather than
// silently dropped or bolted onto an unrelated column.
export const pushNotificationSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.string().min(1),
  title: z.string().min(1).max(255),
  body: z.string().min(1).max(1000),
  actionUrl: z.string().url().optional(),
});

export const pushAuditEventSchema = z.object({
  organizationId: z.string().uuid(),
  actorId: z.string().uuid().optional(),
  action: z.string().min(1).max(200),
  resource: z.string().min(1).max(100),
  resourceId: z.string().max(255).optional(),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
});

export type PushNotificationInput = z.infer<typeof pushNotificationSchema>;
export type PushAuditEventInput = z.infer<typeof pushAuditEventSchema>;
