import { Router } from "express";
import { reportsController } from "./reports.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { tieredRateLimiter } from "../../middleware/rateLimiter.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const reportsRouter = Router();

reportsRouter.use(authenticate, tieredRateLimiter, requirePermission("reports.read"));

reportsRouter.get("/dashboard", asyncHandler(reportsController.dashboard));
reportsRouter.get("/users", asyncHandler(reportsController.users));
reportsRouter.get("/billing", asyncHandler(reportsController.billing));
reportsRouter.get("/products", asyncHandler(reportsController.products));
reportsRouter.get("/audit-summary", asyncHandler(reportsController.auditSummary));
reportsRouter.get("/export", asyncHandler(reportsController.export));
