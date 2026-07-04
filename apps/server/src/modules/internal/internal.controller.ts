import type { Request, Response } from "express";
import { prisma } from "../../database/prisma.js";
import { pushNotificationSchema, pushAuditEventSchema } from "./internal.schema.js";
import { sendSuccess } from "../../utils/respond.js";

// 09-Product-Integration.md §5 — product -> platform push. Callers are
// products (identified only by a valid HMAC signature via verifyInternalKey,
// see app.ts), not end users, so there's no req.auth / permission check here.
export const internalController = {
  async pushNotification(req: Request, res: Response) {
    const input = pushNotificationSchema.parse(req.body);
    const notification = await prisma.notification.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        actionUrl: input.actionUrl,
      },
    });
    sendSuccess(res, { id: notification.id }, 201);
  },

  async pushAuditEvent(req: Request, res: Response) {
    const input = pushAuditEventSchema.parse(req.body);
    const entry = await prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorId: input.actorId,
        actorType: "SYSTEM",
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,
        before: input.before !== undefined ? JSON.stringify(input.before) : undefined,
        after: input.after !== undefined ? JSON.stringify(input.after) : undefined,
      },
    });
    sendSuccess(res, { id: entry.id }, 201);
  },
};
