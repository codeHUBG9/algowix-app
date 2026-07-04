import { Router } from "express";
import { productController } from "./product.controller.js";
import { optionalAuthenticate } from "../../middleware/optionalAuthenticate.js";
import { authenticate } from "../../middleware/authenticate.js";
import { resolveTenantContext } from "../../middleware/tenantContext.js";
import { tieredRateLimiter } from "../../middleware/rateLimiter.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const productRouter = Router();

// Public catalog (09-Product-Integration.md §2) — subscription status is
// enriched in when a valid session/API key is present, omitted otherwise.
productRouter.use(optionalAuthenticate);

/**
 * @openapi
 * /products:
 *   get:
 *     summary: List active products
 *     description: Returns the public product catalog. Includes the caller's organization's subscription status when authenticated.
 *     security: [{ bearerAuth: [] }, { apiKey: [] }, {}]
 *     responses:
 *       200:
 *         description: Product catalog
 */
productRouter.get("/", asyncHandler(productController.list));

/**
 * @openapi
 * /products/{slug}:
 *   get:
 *     summary: Get a single product
 *     security: [{ bearerAuth: [] }, { apiKey: [] }, {}]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product detail
 *       404:
 *         description: Product not found
 */
productRouter.get("/:slug", asyncHandler(productController.getBySlug));

/**
 * @openapi
 * /products/{slug}/plans:
 *   get:
 *     summary: List a product's active pricing plans
 *     security: [{ bearerAuth: [] }, { apiKey: [] }, {}]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Plan list
 */
productRouter.get("/:slug/plans", asyncHandler(productController.getPlans));

/**
 * @openapi
 * /products/{slug}/launch:
 *   get:
 *     summary: Mint an SSO launch token for a subscribed product
 *     description: 04-System-Design.md §4.2 — requires an active subscription and (if the caller's role opts into RoleProductAccess) explicit product access. Returns a redirect URL carrying a short-lived, product-scoped JWT.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Launch URL
 *       403:
 *         description: No active subscription, or the caller's role lacks access to this product
 */
productRouter.get(
  "/:slug/launch",
  authenticate,
  tieredRateLimiter,
  resolveTenantContext,
  asyncHandler(productController.launch)
);
