import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

// In-memory store for local dev. Swap to a Redis store (rate-limit-redis)
// before deploying multiple instances, per 03-Platform-Architecture.md.
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// The E2E suite (apps/e2e) registers/logs in a fresh user per test — a real
// brute-force-resistant limit here would exhaust itself partway through a
// single run. Only relaxed for NODE_ENV=test (see apps/e2e/playwright.config.ts),
// never for development/production.
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === "test" ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "RATE_LIMITED", message: "Too many attempts, please try again later" },
  },
});
