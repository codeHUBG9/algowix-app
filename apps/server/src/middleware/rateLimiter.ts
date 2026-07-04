import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

// In-memory store for local dev. Swap to a Redis store (rate-limit-redis)
// before deploying multiple instances, per 03-Platform-Architecture.md.
//
// Dev gets a much higher ceiling: localhost traffic from multiple open tabs
// all shares this one IP-keyed bucket, and React Query's background refetches
// (window focus/reconnect, Strict Mode double-invoke) can burn through 300/min
// on their own without any real usage.
//
// Renamed from `apiRateLimiter` (10-API-Gateway.md §3) — this is the
// unauthenticated/global limiter mounted ahead of everything in app.ts,
// keyed by IP. `tieredRateLimiter` below is the plan-aware one, mounted
// only on routers that run after `authenticate` has resolved req.auth.
//
// The doc's unauthenticated tier is 30/min, but that's a single shared IP
// bucket — the E2E suite registers/verifies/loads several pages per test
// from one IP, so it needs the same NODE_ENV=test relaxation authRateLimiter
// already has, or nearly every test times out waiting for a page navigation
// that a silently-swallowed 429 never let happen.
export const publicRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.NODE_ENV === "development" ? 2000 : env.NODE_ENV === "test" ? 1000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
});

// 10-API-Gateway.md §3 — per-organization ceiling based on plan tier.
// Falls back to the IP for the (rare) case this runs before req.auth exists.
const PLAN_LIMITS: Record<string, number> = {
  STARTER: 60,
  GROWTH: 300,
  BUSINESS: 1000,
  ENTERPRISE: 10000,
};

export const tieredRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: (req) => {
    if (env.NODE_ENV === "development") return 2000;
    if (env.NODE_ENV === "test") return 1000;
    if (!req.auth) return 30;
    return PLAN_LIMITS[req.auth.plan] ?? 60;
  },
  keyGenerator: (req) => req.auth?.organizationId ?? req.ip ?? "unknown",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: { code: "RATE_LIMITED", message: "Too many requests. Please slow down." },
    });
  },
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
