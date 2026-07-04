import { Router } from "express";
import { tenantController } from "./tenant.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { resolveTenantContext } from "../../middleware/tenantContext.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { tieredRateLimiter } from "../../middleware/rateLimiter.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const tenantRouter = Router();

tenantRouter.use(authenticate, tieredRateLimiter, resolveTenantContext);

tenantRouter.get("/me", asyncHandler(tenantController.getCurrent));
tenantRouter.patch("/me", requirePermission("organization.update"), asyncHandler(tenantController.updateCurrent));
tenantRouter.get("/me/members", requirePermission("organization.read"), asyncHandler(tenantController.listMembers));
tenantRouter.post("/me/cancel", requirePermission("organization.update"), asyncHandler(tenantController.cancel));
