import type { Request, Response } from "express";
import { notificationService } from "./notification.service.js";
import { notificationListQuerySchema, notificationPreferencesSchema } from "./notification.schema.js";
import { sendSuccess, sendPaginated } from "../../utils/respond.js";

export const notificationController = {
  async list(req: Request, res: Response) {
    const query = notificationListQuerySchema.parse(req.query);
    const { data, total } = await notificationService.list(req.auth!.organizationId, req.auth!.userId, query);
    sendPaginated(res, data, { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) });
  },

  async unreadCount(req: Request, res: Response) {
    const count = await notificationService.unreadCount(req.auth!.organizationId, req.auth!.userId);
    sendSuccess(res, { count });
  },

  async markRead(req: Request, res: Response) {
    const notification = await notificationService.markRead(req.auth!.organizationId, req.auth!.userId, req.params.id!);
    sendSuccess(res, notification);
  },

  async markAllRead(req: Request, res: Response) {
    await notificationService.markAllRead(req.auth!.organizationId, req.auth!.userId);
    sendSuccess(res, { success: true });
  },

  async remove(req: Request, res: Response) {
    await notificationService.delete(req.auth!.organizationId, req.auth!.userId, req.params.id!);
    sendSuccess(res, { success: true });
  },

  async getPreferences(req: Request, res: Response) {
    const prefs = await notificationService.getPreferences(req.auth!.userId);
    sendSuccess(res, prefs);
  },

  async updatePreferences(req: Request, res: Response) {
    const input = notificationPreferencesSchema.parse(req.body);
    const prefs = await notificationService.updatePreferences(req.auth!.userId, input);
    sendSuccess(res, prefs);
  },

  // 14-Notifications.md §4 — Server-Sent Events stream. Not behind
  // asyncHandler's normal JSON-response flow since it never resolves; the
  // connection is held open until the client disconnects.
  async stream(req: Request, res: Response) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const userId = req.auth!.userId;
    notificationService.registerClient(userId, res);
    res.write(":connected\n\n");

    const heartbeat = setInterval(() => {
      res.write(":heartbeat\n\n");
    }, 30000);

    req.on("close", () => {
      clearInterval(heartbeat);
      notificationService.unregisterClient(userId, res);
    });
  },
};
