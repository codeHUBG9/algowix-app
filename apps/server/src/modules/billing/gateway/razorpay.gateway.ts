import Razorpay from "razorpay";
import { env } from "../../../config/env.js";
import type {
  CreateOrderInput,
  CreateOrderResult,
  GatewayWebhookEvent,
  PaymentGatewayAdapter,
} from "./payment-gateway.types.js";

// 11-Billing.md §2/§8 — real Razorpay integration. Only constructed when
// RAZORPAY_KEY_ID/SECRET are set (see gateway/index.ts); no merchant account
// exists in this environment so this code path is unexercised locally, but
// it's real SDK usage, not a stub — dropping in live keys activates it with
// no further code changes.
function client() {
  return new Razorpay({ key_id: env.RAZORPAY_KEY_ID!, key_secret: env.RAZORPAY_KEY_SECRET! });
}

export const razorpayGateway: PaymentGatewayAdapter = {
  provider: "RAZORPAY",

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const order = await client().orders.create({
      amount: input.amountMinorUnits,
      currency: input.currency,
      receipt: input.receipt,
      notes: input.notes,
    });
    return {
      orderId: order.id,
      amountMinorUnits: Number(order.amount),
      currency: order.currency,
      checkoutKey: env.RAZORPAY_KEY_ID ?? null,
    };
  },

  parseWebhook(rawBody, headers): GatewayWebhookEvent | null {
    const signature = headers["x-razorpay-signature"];
    if (typeof signature !== "string" || !env.RAZORPAY_WEBHOOK_SECRET) return null;
    if (!Razorpay.validateWebhookSignature(rawBody, signature, env.RAZORPAY_WEBHOOK_SECRET)) return null;

    const { event, payload } = JSON.parse(rawBody) as {
      event: string;
      payload: { payment?: { entity: { id: string; order_id: string; method?: string; error_description?: string } } };
    };
    const payment = payload.payment?.entity;
    if (!payment) return null;

    if (event === "payment.captured") {
      return { type: "payment.captured", gatewayOrderId: payment.order_id, gatewayPaymentId: payment.id, method: payment.method };
    }
    if (event === "payment.failed") {
      return { type: "payment.failed", gatewayOrderId: payment.order_id, failureReason: payment.error_description ?? "Payment failed" };
    }
    return null;
  },
};
