import { Router } from "express";
import type { Request, Response } from "express";
import { getGateway, mockGateway } from "../gateway/index.js";
import type { GatewayProvider } from "../gateway/payment-gateway.types.js";
import { billingService } from "../billing.service.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

// 11-Billing.md §8 — outside /api/v1, matching the doc's literal
// /webhooks/razorpay path (same "flat, non-versioned webhook path" precedent
// as /api/internal in app.ts). Verified via req.rawBody (captured globally by
// express.json()'s verify hook in app.ts) rather than re-serialized JSON,
// since a gateway signs the exact bytes it sent.
export const billingWebhookRouter = Router();

async function handleWebhook(provider: GatewayProvider, req: Request, res: Response): Promise<void> {
  const rawBody = req.rawBody ?? "";
  const gateway = provider === "MOCK" ? mockGateway : getGateway(provider);
  const event = gateway.parseWebhook(rawBody, req.headers);

  if (!event) {
    res.status(400).json({ received: false, error: "Invalid signature or unrecognized event" });
    return;
  }

  if (event.type === "payment.captured") {
    await billingService.handlePaymentSuccess(event);
  } else if (event.type === "payment.failed") {
    await billingService.handlePaymentFailure(event);
  }

  res.json({ received: true });
}

billingWebhookRouter.post("/razorpay", asyncHandler((req, res) => handleWebhook("RAZORPAY", req, res)));
billingWebhookRouter.post("/stripe", asyncHandler((req, res) => handleWebhook("STRIPE", req, res)));
// Dev/test-only path — this is what actually fires locally, since
// selectGateway() falls back to MockGateway when no real keys are configured.
// See internal.dev.router.ts's /dev/billing/sign-mock-webhook for how
// .http/E2E tests produce a valid signature to POST here.
billingWebhookRouter.post("/mock", asyncHandler((req, res) => handleWebhook("MOCK", req, res)));
