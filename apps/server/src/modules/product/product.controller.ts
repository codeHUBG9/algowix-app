import type { Request, Response } from "express";
import { productService } from "./product.service.js";
import { launchService } from "./launch.service.js";
import { sendSuccess } from "../../utils/respond.js";
import { UnauthorizedError, ValidationError } from "../../utils/errors.js";

// 10-API-Gateway.md §6 — public catalog is cacheable (5 minutes).
const CATALOG_CACHE_CONTROL = "public, max-age=300";

function slugFromParams(req: Request): string {
  const slug = req.params.slug;
  if (!slug) throw new ValidationError("slug is required");
  return slug;
}

export const productController = {
  async list(req: Request, res: Response) {
    const products = await productService.list(req.auth?.organizationId);
    res.set("Cache-Control", CATALOG_CACHE_CONTROL);
    sendSuccess(res, products);
  },

  async getBySlug(req: Request, res: Response) {
    const product = await productService.getBySlug(slugFromParams(req), req.auth?.organizationId);
    res.set("Cache-Control", CATALOG_CACHE_CONTROL);
    sendSuccess(res, product);
  },

  async getPlans(req: Request, res: Response) {
    const plans = await productService.getPlans(slugFromParams(req));
    res.set("Cache-Control", CATALOG_CACHE_CONTROL);
    sendSuccess(res, plans);
  },

  async launch(req: Request, res: Response) {
    if (!req.auth) throw new UnauthorizedError();
    const result = await launchService.launch(slugFromParams(req), req.auth);
    sendSuccess(res, result);
  },
};
