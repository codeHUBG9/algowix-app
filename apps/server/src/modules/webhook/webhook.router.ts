import { Router } from "express";
import { webhookController } from "./webhook.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { tieredRateLimiter } from "../../middleware/rateLimiter.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const webhookRouter = Router();

webhookRouter.use(authenticate, tieredRateLimiter);

webhookRouter.get("/events", asyncHandler(webhookController.listEvents));
webhookRouter.get("/", requirePermission("webhooks.manage"), asyncHandler(webhookController.list));
webhookRouter.post("/", requirePermission("webhooks.manage"), asyncHandler(webhookController.create));
webhookRouter.post("/retry-failed", requirePermission("webhooks.manage"), asyncHandler(webhookController.retryFailed));
webhookRouter.get("/:id", requirePermission("webhooks.manage"), asyncHandler(webhookController.getById));
webhookRouter.put("/:id", requirePermission("webhooks.manage"), asyncHandler(webhookController.update));
webhookRouter.delete("/:id", requirePermission("webhooks.manage"), asyncHandler(webhookController.remove));
webhookRouter.get("/:id/deliveries", requirePermission("webhooks.manage"), asyncHandler(webhookController.deliveries));
webhookRouter.post("/:id/test", requirePermission("webhooks.manage"), asyncHandler(webhookController.test));
