import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { requestId } from "./middleware/requestId.js";
import { publicRateLimiter } from "./middleware/rateLimiter.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { verifyInternalKey } from "./middleware/verifyInternalKey.js";
import { apiRouter } from "./api.router.js";
import { internalRouter } from "./modules/internal/internal.router.js";
import { billingWebhookRouter } from "./modules/billing/webhooks/index.js";
import { getJwks } from "./services/jwt.service.js";
import { openApiSpec } from "./docs/openapi.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      // Exact bytes of the request body, captured by express.json()'s
      // `verify` hook below — needed to check an HMAC signature computed
      // over the same bytes the sender signed (re-serializing req.body
      // isn't guaranteed to produce an identical string).
      rawBody?: string;
    }
  }
}

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.ALLOWED_ORIGINS.split(","),
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      (req as express.Request).rawBody = buf.toString("utf8");
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(requestId);
if (env.NODE_ENV !== "test") app.use(morgan("dev"));
app.use(publicRateLimiter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: "0.1.0" });
});

app.get("/.well-known/jwks.json", async (_req, res, next) => {
  try {
    // 10-API-Gateway.md §6 cacheable-endpoints table — 15 minutes.
    res.set("Cache-Control", "public, max-age=900");
    res.json(await getJwks());
  } catch (err) {
    next(err);
  }
});

// 09-Product-Integration.md §5 — product -> platform push (notifications,
// audit events). Outside /api/v1 to match the doc's literal path, and
// signature-gated instead of JWT-gated since callers are products, not users.
app.use("/api/internal", verifyInternalKey, internalRouter);

// 11-Billing.md §8 — gateway webhooks are signature-gated per-route (not JWT),
// so they're mounted outside /api/v1 like /api/internal above.
app.use("/webhooks", billingWebhookRouter);

app.use("/api/v1", apiRouter);

// 10-API-Gateway.md §8 — self-hosted developer portal substitute (see
// docs/openapi.ts). Same non-production gate as the test-verification-token
// route — this is a docs surface for developers, not something to expose
// unauthenticated in production without further hardening.
if (env.NODE_ENV !== "production") {
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
}

app.use(errorHandler);

export default app;
