import type { Request, Response } from "express";
import { productRepository } from "./product.repository.js";
import { productHealthService } from "./product-health.service.js";
import { sendSuccess } from "../../utils/respond.js";
import { NotFoundError, ValidationError } from "../../utils/errors.js";

// 09-Product-Integration.md §6 — health status, exposed to internal tooling
// only (there's no admin portal yet, same convention as tenant.admin.*).
export const productAdminController = {
  async list(_req: Request, res: Response) {
    const products = await productRepository.findAll();
    sendSuccess(res, products);
  },

  async checkOne(req: Request, res: Response) {
    const slug = req.params.slug;
    if (!slug) throw new ValidationError("slug is required");
    const product = await productRepository.findBySlug(slug);
    if (!product) throw new NotFoundError("Product not found");
    const updated = await productHealthService.checkOne(product);
    sendSuccess(res, updated);
  },

  async checkAll(_req: Request, res: Response) {
    const updated = await productHealthService.checkAll();
    sendSuccess(res, updated);
  },
};
