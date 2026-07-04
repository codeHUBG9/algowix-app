import Stripe from "stripe";
import { env } from "../../../config/env.js";
import type {
  CreateOrderInput,
  CreateOrderResult,
  GatewayWebhookEvent,
  PaymentGatewayAdapter,
} from "./payment-gateway.types.js";

// 11-Billing.md §2/§8 — real Stripe integration for international customers.
// Only constructed when STRIPE_SECRET_KEY is set (see gateway/index.ts); a
// PaymentIntent stands in for the doc's "order" concept since Stripe has no
// separate orders API for this use case.
function client() {
  return new Stripe(env.STRIPE_SECRET_KEY!, { apiVersion: "2026-06-24.dahlia" });
}

export const stripeGateway: PaymentGatewayAdapter = {
  provider: "STRIPE",

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const intent = await client().paymentIntents.create({
      amount: input.amountMinorUnits,
      currency: input.currency.toLowerCase(),
      metadata: input.notes,
    });
    return {
      orderId: intent.id,
      amountMinorUnits: intent.amount,
      currency: intent.currency,
      checkoutKey: intent.client_secret,
    };
  },

  parseWebhook(rawBody, headers): GatewayWebhookEvent | null {
    const signature = headers["stripe-signature"];
    if (typeof signature !== "string" || !env.STRIPE_WEBHOOK_SECRET) return null;

    let event: Stripe.Event;
    try {
      event = client().webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch {
      return null;
    }

    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as Stripe.PaymentIntent;
      return { type: "payment.captured", gatewayOrderId: intent.id, gatewayPaymentId: intent.id, method: intent.payment_method as string | undefined };
    }
    if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as Stripe.PaymentIntent;
      return { type: "payment.failed", gatewayOrderId: intent.id, failureReason: intent.last_payment_error?.message ?? "Payment failed" };
    }
    return null;
  },
};
