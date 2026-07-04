import type { Organization } from "@prisma/client";
import { env } from "../../../config/env.js";
import { razorpayGateway } from "./razorpay.gateway.js";
import { stripeGateway } from "./stripe.gateway.js";
import { mockGateway } from "./mock.gateway.js";
import type { GatewayProvider, PaymentGatewayAdapter } from "./payment-gateway.types.js";

// 11-Billing.md §2 selectPaymentGateway, extended to fall back to MockGateway
// whenever the relevant real-gateway keys aren't configured — which is always
// true in this environment (no merchant account), but the fallback also
// means real keys can be dropped into .env.local later with zero code changes.
export function selectGateway(organization: Pick<Organization, "country">): PaymentGatewayAdapter {
  return organization.country === "IN" ? getGateway("RAZORPAY") : getGateway("STRIPE");
}

export function getGateway(provider: Exclude<GatewayProvider, "MOCK">): PaymentGatewayAdapter {
  if (provider === "RAZORPAY") {
    return env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET ? razorpayGateway : mockGateway;
  }
  return env.STRIPE_SECRET_KEY ? stripeGateway : mockGateway;
}

export { razorpayGateway, stripeGateway, mockGateway };
