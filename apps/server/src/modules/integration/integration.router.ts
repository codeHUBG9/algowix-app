import { Router } from "express";
import { integrationController } from "./integration.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { tieredRateLimiter } from "../../middleware/rateLimiter.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const integrationRouter = Router();

integrationRouter.use(authenticate, tieredRateLimiter, requirePermission("integrations.manage"));

integrationRouter.get("/", asyncHandler(integrationController.list));
integrationRouter.post("/:provider/connect", asyncHandler(integrationController.connect));
integrationRouter.delete("/:provider", asyncHandler(integrationController.disconnect));
