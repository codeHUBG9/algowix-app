import { Router } from "express";
import { internalController } from "./internal.controller.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const internalRouter = Router();

internalRouter.post("/notifications", asyncHandler(internalController.pushNotification));
internalRouter.post("/audit", asyncHandler(internalController.pushAuditEvent));
