import { Router } from "express";
import { auditController } from "./audit.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { tieredRateLimiter } from "../../middleware/rateLimiter.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const auditRouter = Router();

auditRouter.use(authenticate, tieredRateLimiter, requirePermission("audit_logs.read"));

auditRouter.get("/export", asyncHandler(auditController.export));
auditRouter.get("/stats", asyncHandler(auditController.stats));
auditRouter.get("/", asyncHandler(auditController.list));
auditRouter.get("/:id", asyncHandler(auditController.getById));
