import { Router } from "express";
import { authController } from "./auth.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authRateLimiter } from "../../middleware/rateLimiter.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const authRouter = Router();

authRouter.post("/register", authRateLimiter, asyncHandler(authController.register));
authRouter.post("/login", authRateLimiter, asyncHandler(authController.login));
authRouter.post("/refresh", asyncHandler(authController.refresh));
authRouter.post("/logout", asyncHandler(authController.logout));
authRouter.get("/me", authenticate, asyncHandler(authController.me));
authRouter.get("/sessions", authenticate, asyncHandler(authController.sessions));
