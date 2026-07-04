import type { NextFunction, Request, Response } from "express";
import path from "node:path";
import { billingService } from "./billing.service.js";
import { checkoutSchema, addPaymentMethodSchema, validateCouponSchema, invoiceQuerySchema, refundInvoiceSchema } from "./billing.schema.js";
import { env } from "../../config/env.js";
import { sendSuccess, sendPaginated } from "../../utils/respond.js";
import { NotFoundError, UnauthorizedError, ValidationError } from "../../utils/errors.js";

function actor(req: Request) {
  if (!req.auth) throw new UnauthorizedError();
  return { userId: req.auth.userId, email: req.auth.email };
}

function productSlugFromQuery(req: Request): string {
  const slug = req.query.product;
  if (typeof slug !== "string" || !slug) throw new ValidationError("product query param is required");
  return slug;
}

export const billingController = {
  async checkout(req: Request, res: Response) {
    if (!req.tenant) throw new UnauthorizedError();
    const input = checkoutSchema.parse(req.body);
    const session = await billingService.checkout(req.tenant, actor(req), input);
    sendSuccess(res, session, 201);
  },

  async listInvoices(req: Request, res: Response) {
    if (!req.auth) throw new UnauthorizedError();
    const query = invoiceQuerySchema.parse(req.query);
    const { invoices, total } = await billingService.listInvoices(req.auth.organizationId, query);
    sendPaginated(res, invoices, { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) });
  },

  async getInvoice(req: Request, res: Response) {
    if (!req.auth) throw new UnauthorizedError();
    const invoice = await billingService.getInvoice(req.auth.organizationId, req.params.id!);
    sendSuccess(res, invoice);
  },

  async downloadInvoice(req: Request, res: Response, next: NextFunction) {
    if (!req.auth) throw new UnauthorizedError();
    const { filename, invoiceNumber } = await billingService.getInvoicePdfPath(req.auth.organizationId, req.params.id!);
    const absolutePath = path.resolve(env.INVOICE_STORAGE_DIR, filename);
    res.download(absolutePath, `${invoiceNumber}.pdf`, (err) => {
      if (err && !res.headersSent) next(new NotFoundError("Invoice PDF not found"));
    });
  },

  async listPaymentMethods(req: Request, res: Response) {
    if (!req.auth) throw new UnauthorizedError();
    const methods = await billingService.listPaymentMethods(req.auth.organizationId);
    sendSuccess(res, methods);
  },

  async addPaymentMethod(req: Request, res: Response) {
    if (!req.auth) throw new UnauthorizedError();
    const input = addPaymentMethodSchema.parse(req.body);
    const method = await billingService.addPaymentMethod(req.auth.organizationId, actor(req), {
      gatewayProvider: "MOCK",
      gatewayMethodId: input.gatewayMethodId,
      type: input.type,
      brand: input.brand || null,
      last4: input.last4 || null,
      expiryMonth: input.expiryMonth ?? null,
      expiryYear: input.expiryYear ?? null,
      isDefault: input.isDefault,
    });
    sendSuccess(res, method, 201);
  },

  async removePaymentMethod(req: Request, res: Response) {
    if (!req.auth) throw new UnauthorizedError();
    await billingService.removePaymentMethod(req.auth.organizationId, actor(req), req.params.id!);
    sendSuccess(res, { removed: true });
  },

  async setDefaultPaymentMethod(req: Request, res: Response) {
    if (!req.auth) throw new UnauthorizedError();
    const method = await billingService.setDefaultPaymentMethod(req.auth.organizationId, req.params.id!);
    sendSuccess(res, method);
  },

  async usage(req: Request, res: Response) {
    if (!req.auth) throw new UnauthorizedError();
    const summary = await billingService.usageSummary(req.auth.organizationId, productSlugFromQuery(req));
    sendSuccess(res, summary);
  },

  async upcoming(req: Request, res: Response) {
    if (!req.auth) throw new UnauthorizedError();
    const preview = await billingService.upcomingInvoicePreview(req.auth.organizationId, productSlugFromQuery(req));
    sendSuccess(res, preview);
  },

  async validateCoupon(req: Request, res: Response) {
    if (!req.auth) throw new UnauthorizedError();
    const input = validateCouponSchema.parse(req.body);
    const result = await billingService.validateCoupon(req.auth.organizationId, input.code, input.productSlug);
    sendSuccess(res, result);
  },

  async refundInvoice(req: Request, res: Response) {
    if (!req.auth) throw new UnauthorizedError();
    const input = refundInvoiceSchema.parse(req.body);
    const result = await billingService.refundInvoice(req.auth.organizationId, actor(req), req.params.id!, input);
    sendSuccess(res, result);
  },
};
