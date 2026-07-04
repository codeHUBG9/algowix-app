import { randomUUID } from "node:crypto";
import { verifySignature } from "../../../utils/internalKey.js";
import { env } from "../../../config/env.js";
import type {
  CreateOrderInput,
  CreateOrderResult,
  GatewayWebhookEvent,
  PaymentGatewayAdapter,
} from "./payment-gateway.types.js";

// Dev/test stand-in used whenever no real gateway keys are configured (see
// gateway/index.ts). Orders are fake IDs; the "webhook" is simulated by
// POSTing to /webhooks/mock with a body signed via the same HMAC helper
// 09-Product-Integration.md already introduced for internal server-to-server
// calls (utils/internalKey.ts) — the dev-only /dev/billing/sign-mock-webhook
// route (internal.dev.router.ts) produces a valid signature for .http/E2E
// tests, mirroring the existing /dev/sign-internal-key pattern.
export const mockGateway: PaymentGatewayAdapter = {
  provider: "MOCK",

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    return {
      orderId: `mock_order_${randomUUID()}`,
      amountMinorUnits: input.amountMinorUnits,
      currency: input.currency,
      checkoutKey: null,
    };
  },

  parseWebhook(rawBody, headers): GatewayWebhookEvent | null {
    const signature = headers["x-mock-signature"];
    const timestamp = headers["x-mock-timestamp"];
    if (typeof signature !== "string" || typeof timestamp !== "string") return null;
    if (!verifySignature(rawBody, timestamp, signature, env.MOCK_GATEWAY_WEBHOOK_SECRET)) return null;

    let body: { event?: string; orderId?: string; paymentId?: string; failureReason?: string };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return null;
    }
    if (!body.orderId) return null;

    if (body.event === "payment.captured") {
      return { type: "payment.captured", gatewayOrderId: body.orderId, gatewayPaymentId: body.paymentId ?? `mock_pay_${randomUUID()}`, method: "mock" };
    }
    if (body.event === "payment.failed") {
      return { type: "payment.failed", gatewayOrderId: body.orderId, failureReason: body.failureReason ?? "Mock payment declined" };
    }
    return null;
  },
};
