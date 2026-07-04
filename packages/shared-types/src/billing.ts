export type GatewayProvider = "RAZORPAY" | "STRIPE" | "MOCK";
export type InvoiceStatus = "DRAFT" | "OPEN" | "PAID" | "VOID";
export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED";
export type PaymentMethodType = "CARD" | "UPI" | "NETBANKING" | "SEPA" | "ACH";

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string;
  amount: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  currency: string;
  subtotal: string;
  discountAmount: string;
  creditApplied: string;
  isIGST: boolean;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  taxAmount: string;
  total: string;
  amountDue: string;
  billingCycle: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  paidAt: string | null;
  voidedAt: string | null;
  pdfUrl: string | null;
  lineItems: InvoiceLineItem[];
  createdAt: string;
}

export interface PaymentMethod {
  id: string;
  gatewayProvider: GatewayProvider;
  type: PaymentMethodType;
  brand: string | null;
  last4: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  isDefault: boolean;
  createdAt: string;
}

export interface CheckoutSession {
  invoiceId: string | null;
  orderId: string;
  amount: number;
  currency: string;
  gatewayProvider: GatewayProvider;
  checkoutKey: string | null;
  prefill: { email: string; name: string };
}

export interface UpcomingInvoicePreview {
  subtotal: string;
  taxAmount: string;
  total: string;
  periodStart: string;
  periodEnd: string;
}

export interface CouponValidation {
  valid: boolean;
  reason?: string;
  code?: string;
  type?: "PERCENTAGE" | "FIXED_AMOUNT";
  value?: number;
}

export interface UsageSummary {
  seatsUsed: number;
  seatLimit: number | null;
}
