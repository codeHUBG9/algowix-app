import { Router } from "express";
import { roleController } from "./role.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { resolveTenantContext } from "../../middleware/tenantContext.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { tieredRateLimiter } from "../../middleware/rateLimiter.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

// 13-RBAC.md §7 — flat paths, same self-service convention as /billing and
// /subscriptions: every route operates on the caller's own org (resolved from
// the JWT via resolveTenantContext), not nested under /organizations/:id.
export const roleRouter = Router();

roleRouter.use(authenticate, tieredRateLimiter, resolveTenantContext);

roleRouter.get("/", requirePermission("roles.read"), asyncHandler(roleController.list));
roleRouter.post("/", requirePermission("roles.create"), asyncHandler(roleController.create));
roleRouter.get("/:id", requirePermission("roles.read"), asyncHandler(roleController.getById));
roleRouter.put("/:id", requirePermission("roles.update"), asyncHandler(roleController.update));
roleRouter.delete("/:id", requirePermission("roles.delete"), asyncHandler(roleController.remove));
