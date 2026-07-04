import { Router } from "express";
import { subscriptionController } from "./subscription.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { resolveTenantContext } from "../../middleware/tenantContext.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { tieredRateLimiter } from "../../middleware/rateLimiter.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

// 12-Subscriptions.md §5 — flat, self-service paths, same convention as
// billing.router.ts / tenant.router.ts's /tenants/me.
export const subscriptionRouter = Router();

subscriptionRouter.use(authenticate, tieredRateLimiter, resolveTenantContext);

subscriptionRouter.get("/", requirePermission("subscriptions.read"), asyncHandler(subscriptionController.list));
subscriptionRouter.post("/", requirePermission("subscriptions.manage"), asyncHandler(subscriptionController.create));
subscriptionRouter.get("/feature-access", requirePermission("subscriptions.read"), asyncHandler(subscriptionController.featureAccess));
subscriptionRouter.get("/:id", requirePermission("subscriptions.read"), asyncHandler(subscriptionController.getById));
subscriptionRouter.post("/:id/upgrade", requirePermission("subscriptions.manage"), asyncHandler(subscriptionController.upgrade));
subscriptionRouter.post("/:id/downgrade", requirePermission("subscriptions.manage"), asyncHandler(subscriptionController.downgrade));
subscriptionRouter.post("/:id/cancel", requirePermission("subscriptions.manage"), asyncHandler(subscriptionController.cancel));
subscriptionRouter.post("/:id/reactivate", requirePermission("subscriptions.manage"), asyncHandler(subscriptionController.reactivate));
subscriptionRouter.get("/:id/usage", requirePermission("subscriptions.read"), asyncHandler(subscriptionController.usage));
subscriptionRouter.get("/:id/history", requirePermission("subscriptions.read"), asyncHandler(subscriptionController.history));
subscriptionRouter.post("/:id/seats", requirePermission("subscriptions.manage"), asyncHandler(subscriptionController.updateSeats));
