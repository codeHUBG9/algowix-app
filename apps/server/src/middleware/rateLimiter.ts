import rateLimit from "express-rate-limit";

// In-memory store for local dev. Swap to a Redis store (rate-limit-redis)
// before deploying multiple instances, per 03-Platform-Architecture.md.
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "RATE_LIMITED", message: "Too many attempts, please try again later" },
  },
});
