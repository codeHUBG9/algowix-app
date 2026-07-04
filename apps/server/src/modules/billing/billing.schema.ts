import { z } from "zod";
import * as sharedTypes from "@algowix/shared-types";

export const checkoutSchema = sharedTypes.checkoutSchema;
export const addPaymentMethodSchema = sharedTypes.addPaymentMethodSchema;
export const validateCouponSchema = sharedTypes.validateCouponSchema;

export type CheckoutInput = sharedTypes.CheckoutFormInput;
export type AddPaymentMethodInput = sharedTypes.AddPaymentMethodFormInput;
export type ValidateCouponInput = sharedTypes.ValidateCouponFormInput;

// Server-only schemas (query params, admin-only inputs) — not shared with web forms.

export const invoiceQuerySchema = z.object({
  status: z.enum(["DRAFT", "OPEN", "PAID", "VOID"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type InvoiceQueryInput = z.infer<typeof invoiceQuerySchema>;

export const refundInvoiceSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});
export type RefundInvoiceInput = z.infer<typeof refundInvoiceSchema>;

export const issueCreditSchema = z.object({
  amount: z.coerce.number().positive(),
  reason: z.string().trim().min(1).max(255),
});
export type IssueCreditInput = z.infer<typeof issueCreditSchema>;
