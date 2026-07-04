import { Router } from "express";
import { developerController } from "./developer.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { tieredRateLimiter } from "../../middleware/rateLimiter.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const developerRouter = Router();

developerRouter.use(authenticate, tieredRateLimiter, requirePermission("api_keys.manage"));

developerRouter.get("/rate-limits", asyncHandler(developerController.rateLimits));
developerRouter.get("/usage", asyncHandler(developerController.usage));
developerRouter.get("/logs", asyncHandler(developerController.logs));
developerRouter.get("/api-keys/:keyId/usage", asyncHandler(developerController.apiKeyUsage));
