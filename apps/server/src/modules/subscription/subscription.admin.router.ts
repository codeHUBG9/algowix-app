import { Router } from "express";
import { subscriptionAdminController } from "./subscription.admin.controller.js";
import { requirePlatformKey } from "../../middleware/requirePlatformKey.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const subscriptionAdminRouter = Router();

subscriptionAdminRouter.use(requirePlatformKey);

subscriptionAdminRouter.post("/run-trial-expiry", asyncHandler(subscriptionAdminController.runTrialExpiry));
subscriptionAdminRouter.post("/send-trial-warnings", asyncHandler(subscriptionAdminController.sendTrialWarnings));
