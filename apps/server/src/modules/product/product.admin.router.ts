import { Router } from "express";
import { productAdminController } from "./product.admin.controller.js";
import { requirePlatformKey } from "../../middleware/requirePlatformKey.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const productAdminRouter = Router();

productAdminRouter.use(requirePlatformKey);

productAdminRouter.get("/", asyncHandler(productAdminController.list));
productAdminRouter.post("/health-check", asyncHandler(productAdminController.checkAll));
productAdminRouter.post("/:slug/health-check", asyncHandler(productAdminController.checkOne));
