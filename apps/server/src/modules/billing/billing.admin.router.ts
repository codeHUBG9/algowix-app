import { Router } from "express";
import { billingAdminController } from "./billing.admin.controller.js";
import { requirePlatformKey } from "../../middleware/requirePlatformKey.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

// Internal-tooling only (support scripts, ops), same access model as
// tenant.admin.router.ts / product.admin.router.ts — no BullMQ/Redis in this
// environment, so dunning runs on-demand instead of a real daily cron.
export const billingAdminRouter = Router();

billingAdminRouter.use(requirePlatformKey);

billingAdminRouter.post("/run-dunning", asyncHandler(billingAdminController.runDunning));
billingAdminRouter.post("/organizations/:orgId/credits", asyncHandler(billingAdminController.issueCredit));
