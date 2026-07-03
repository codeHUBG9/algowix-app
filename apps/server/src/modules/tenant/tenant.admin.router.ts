import { Router } from "express";
import { tenantAdminController } from "./tenant.admin.controller.js";
import { requirePlatformKey } from "../../middleware/requirePlatformKey.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const tenantAdminRouter = Router();

tenantAdminRouter.use(requirePlatformKey);

tenantAdminRouter.get("/:orgId", asyncHandler(tenantAdminController.getById));
tenantAdminRouter.post("/:orgId/suspend", asyncHandler(tenantAdminController.suspend));
tenantAdminRouter.post("/:orgId/reactivate", asyncHandler(tenantAdminController.reactivate));
tenantAdminRouter.post("/:orgId/purge", asyncHandler(tenantAdminController.purge));
