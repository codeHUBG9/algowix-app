import { Router } from "express";
import { marketplaceController } from "./marketplace.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { tieredRateLimiter } from "../../middleware/rateLimiter.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const marketplaceRouter = Router();

marketplaceRouter.use(authenticate, tieredRateLimiter);

marketplaceRouter.get("/", asyncHandler(marketplaceController.browse));
marketplaceRouter.post("/:id/install", requirePermission("marketplace.manage"), asyncHandler(marketplaceController.install));
marketplaceRouter.delete("/:id/uninstall", requirePermission("marketplace.manage"), asyncHandler(marketplaceController.uninstall));
