import { Router } from "express";
import { authController } from "./auth.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authRateLimiter } from "../../middleware/rateLimiter.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { env } from "../../config/env.js";

export const authRouter = Router();

authRouter.post("/register", authRateLimiter, asyncHandler(authController.register));
authRouter.post("/login", authRateLimiter, asyncHandler(authController.login));
authRouter.post("/verify-email", authRateLimiter, asyncHandler(authController.verifyEmail));
authRouter.post("/refresh", asyncHandler(authController.refresh));
authRouter.post("/logout", asyncHandler(authController.logout));
authRouter.get("/me", authenticate, asyncHandler(authController.me));
authRouter.get("/sessions", authenticate, asyncHandler(authController.sessions));

// Dev/test-only backdoor for .http request collections and the E2E suite —
// there's no email provider wired up (06-Authentication.md defers it), so
// this is how anything outside a human reading server stdout gets the
// verification token. Never registered in production.
if (env.NODE_ENV !== "production") {
  authRouter.get("/test/verification-token", asyncHandler(authController.getTestVerificationToken));
}
