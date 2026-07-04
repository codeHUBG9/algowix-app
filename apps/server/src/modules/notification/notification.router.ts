import { Router } from "express";
import { notificationController } from "./notification.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { tieredRateLimiter } from "../../middleware/rateLimiter.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const notificationRouter = Router();

// The SSE stream is authenticated but deliberately not behind
// tieredRateLimiter — it's one long-lived connection per client, not a
// burst of requests, and the rate limiter would only count against the org's
// per-minute ceiling for no reason.
notificationRouter.get("/stream", authenticate, notificationController.stream);

notificationRouter.use(authenticate, tieredRateLimiter);

notificationRouter.get("/preferences", asyncHandler(notificationController.getPreferences));
notificationRouter.put("/preferences", asyncHandler(notificationController.updatePreferences));
notificationRouter.get("/unread-count", asyncHandler(notificationController.unreadCount));
notificationRouter.patch("/read-all", asyncHandler(notificationController.markAllRead));
notificationRouter.get("/", asyncHandler(notificationController.list));
notificationRouter.patch("/:id/read", asyncHandler(notificationController.markRead));
notificationRouter.delete("/:id", asyncHandler(notificationController.remove));
