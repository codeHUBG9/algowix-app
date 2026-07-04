import { Router } from "express";
import { permissionController } from "./permission.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { resolveTenantContext } from "../../middleware/tenantContext.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { tieredRateLimiter } from "../../middleware/rateLimiter.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

// 13-RBAC.md §7 — read-only catalog backing the role editor UI. Gated on
// roles.read since it's only useful alongside role management.
export const permissionRouter = Router();

permissionRouter.use(authenticate, tieredRateLimiter, resolveTenantContext, requirePermission("roles.read"));

permissionRouter.get("/", asyncHandler(permissionController.list));
permissionRouter.get("/catalog", asyncHandler(permissionController.catalog));
