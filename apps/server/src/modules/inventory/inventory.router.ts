import { Router } from "express";
import { inventoryController } from "./inventory.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { resolveTenantContext } from "../../middleware/tenantContext.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { tieredRateLimiter } from "../../middleware/rateLimiter.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

// Phase 25 §5 — built directly into the platform (not an SSO-launched
// external product like CRM/HRMS), so it follows the same flat,
// caller's-own-org convention as billing/products.
export const inventoryRouter = Router();

inventoryRouter.use(authenticate, tieredRateLimiter, resolveTenantContext);

inventoryRouter.get("/low-stock", requirePermission("inventory.read"), asyncHandler(inventoryController.lowStock));

inventoryRouter.get("/", requirePermission("inventory.read"), asyncHandler(inventoryController.list));
inventoryRouter.post("/", requirePermission("inventory.manage"), asyncHandler(inventoryController.create));
inventoryRouter.get("/:id", requirePermission("inventory.read"), asyncHandler(inventoryController.getById));
inventoryRouter.patch("/:id", requirePermission("inventory.manage"), asyncHandler(inventoryController.update));
inventoryRouter.delete("/:id", requirePermission("inventory.manage"), asyncHandler(inventoryController.remove));
inventoryRouter.post("/:id/movement", requirePermission("inventory.manage"), asyncHandler(inventoryController.recordMovement));
