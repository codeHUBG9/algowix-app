import { Router } from "express";
import { signPayload } from "../../utils/internalKey.js";
import { env } from "../../config/env.js";
import { prisma } from "../../database/prisma.js";
import { sendSuccess } from "../../utils/respond.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const internalDevRouter = Router();

// Dev/test-only — 13-RBAC.md §4 gates custom-role creation behind a Growth+
// Organization.plan, but nothing in the product exposes an endpoint to change
// that field directly (it's set once at registration and never mutated by any
// real flow yet — upgrading Organization.plan itself, as opposed to a
// per-product Subscription's plan, isn't built). Same "backdoor so .http/E2E
// can drive a flow with no real UI for it yet" precedent as the mock-webhook
// signer and the email-verification-token lookup above.
internalDevRouter.post(
  "/set-org-plan",
  asyncHandler(async (req, res) => {
    const organization = await prisma.organization.update({
      where: { id: req.body.organizationId },
      data: { plan: req.body.plan },
    });
    sendSuccess(res, { id: organization.id, plan: organization.plan });
  })
);

// Dev/test-only — same idea as /sign-internal-key below, but for the mock
// payment gateway's webhook signature (see modules/billing/gateway/mock.gateway.ts).
// Signs { event, orderId, paymentId?, failureReason? } and hands back the exact
// rawBody string to replay verbatim as the POST /webhooks/mock body, alongside
// the headers that route expects.
internalDevRouter.post(
  "/billing/sign-mock-webhook",
  asyncHandler(async (req, res) => {
    const rawBody = JSON.stringify({
      event: req.body.event,
      orderId: req.body.orderId,
      paymentId: req.body.paymentId,
      failureReason: req.body.failureReason,
    });
    const { signature, timestamp } = signPayload(rawBody, env.MOCK_GATEWAY_WEBHOOK_SECRET);
    sendSuccess(res, { rawBody, headers: { "x-mock-signature": signature, "x-mock-timestamp": timestamp } });
  })
);

// Dev/test-only helper — mirrors the auth module's test/verification-token
// backdoor. .http request collections can't compute an HMAC themselves, so
// this signs a caller-supplied payload with the real server secret and hands
// back the exact bodyStr to replay verbatim as the next request's raw body
// (byte-for-byte, since the signature is over those exact bytes).
internalDevRouter.post(
  "/sign-internal-key",
  asyncHandler(async (req, res) => {
    const bodyStr = JSON.stringify(req.body.payload ?? {});
    const { signature, timestamp } = signPayload(bodyStr, env.PRODUCT_INTERNAL_SECRET);
    sendSuccess(res, { bodyStr, signature, timestamp });
  })
);
