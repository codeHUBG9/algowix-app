// 11-Billing.md §2/§8 — one adapter shape for every payment gateway. Real
// gateways (Razorpay/Stripe) implement this against their actual SDKs; the
// MockGateway implements the exact same shape so the checkout -> webhook ->
// invoice-paid flow is identical regardless of which one is selected. No
// merchant account exists in this environment, so MockGateway is what
// actually runs day to day (see gateway/index.ts's selection logic).

export type GatewayProvider = "RAZORPAY" | "STRIPE" | "MOCK";

export interface CreateOrderInput {
  amountMinorUnits: number; // paise / cents
  currency: string;
  receipt: string;
  notes: Record<string, string>;
}

export interface CreateOrderResult {
  orderId: string;
  amountMinorUnits: number;
  currency: string;
  checkoutKey: string | null;
}

export type GatewayWebhookEventType = "payment.captured" | "payment.failed" | "refund.processed";

export interface GatewayWebhookEvent {
  type: GatewayWebhookEventType;
  gatewayOrderId: string;
  gatewayPaymentId?: string;
  method?: string;
  failureReason?: string;
}

export interface PaymentGatewayAdapter {
  readonly provider: GatewayProvider;
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
  // Returns null when the signature doesn't verify or the event isn't one we act on.
  parseWebhook(rawBody: string, headers: Record<string, string | string[] | undefined>): GatewayWebhookEvent | null;
}
