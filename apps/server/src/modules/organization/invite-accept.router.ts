import { Router } from "express";
import { inviteAcceptController } from "./invite-accept.controller.js";
import { optionalAuthenticate } from "../../middleware/optionalAuthenticate.js";
import { authRateLimiter } from "../../middleware/rateLimiter.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { env } from "../../config/env.js";

export const inviteAcceptRouter = Router();

// Dev/test-only backdoor, same rationale as auth's /auth/test/verification-token
// — no email provider is wired up. Must be registered before the dynamic
// "/:token" route below so "/test/token" doesn't get swallowed as a token value.
if (env.NODE_ENV !== "production") {
  inviteAcceptRouter.get("/test/token", asyncHandler(inviteAcceptController.getTestToken));
}

// Top-level (not /organizations/:id) per 08-Organization-Management.md §7 —
// the invitee has no org context yet, that's exactly what accepting grants them.
inviteAcceptRouter.get("/:token", asyncHandler(inviteAcceptController.validate));
inviteAcceptRouter.post(
  "/:token/accept",
  authRateLimiter,
  optionalAuthenticate,
  asyncHandler(inviteAcceptController.accept)
);
