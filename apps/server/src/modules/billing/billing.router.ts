import { Router } from "express";
import { billingController } from "./billing.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { resolveTenantContext } from "../../middleware/tenantContext.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { tieredRateLimiter } from "../../middleware/rateLimiter.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

// 11-Billing.md §10 — self-service, flat paths (not nested under
// /organizations/:id), same convention as /tenants/me: every route operates
// on the caller's own org, resolved from the JWT via resolveTenantContext.
export const billingRouter = Router();

billingRouter.use(authenticate, tieredRateLimiter, resolveTenantContext);

billingRouter.post("/checkout", requirePermission("billing.manage"), asyncHandler(billingController.checkout));

billingRouter.get("/invoices", requirePermission("billing.read"), asyncHandler(billingController.listInvoices));
billingRouter.get("/invoices/:id", requirePermission("billing.read"), asyncHandler(billingController.getInvoice));
billingRouter.get("/invoices/:id/download", requirePermission("billing.read"), asyncHandler(billingController.downloadInvoice));
billingRouter.post("/invoices/:id/refund", requirePermission("billing.manage"), asyncHandler(billingController.refundInvoice));

billingRouter.get("/payment-methods", requirePermission("billing.read"), asyncHandler(billingController.listPaymentMethods));
billingRouter.post("/payment-methods", requirePermission("billing.manage"), asyncHandler(billingController.addPaymentMethod));
billingRouter.delete("/payment-methods/:id", requirePermission("billing.manage"), asyncHandler(billingController.removePaymentMethod));
billingRouter.patch(
  "/payment-methods/:id/default",
  requirePermission("billing.manage"),
  asyncHandler(billingController.setDefaultPaymentMethod)
);

billingRouter.get("/usage", requirePermission("billing.read"), asyncHandler(billingController.usage));
billingRouter.get("/upcoming", requirePermission("billing.read"), asyncHandler(billingController.upcoming));
billingRouter.post("/coupon/validate", requirePermission("billing.manage"), asyncHandler(billingController.validateCoupon));
