import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { env } from "./config/env.js";
import { requestId } from "./middleware/requestId.js";
import { apiRateLimiter } from "./middleware/rateLimiter.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiRouter } from "./api.router.js";
import { getJwks } from "./services/jwt.service.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.ALLOWED_ORIGINS.split(","),
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(requestId);
if (env.NODE_ENV !== "test") app.use(morgan("dev"));
app.use(apiRateLimiter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: "0.1.0" });
});

app.get("/.well-known/jwks.json", async (_req, res, next) => {
  try {
    res.json(await getJwks());
  } catch (err) {
    next(err);
  }
});

app.use("/api/v1", apiRouter);

app.use(errorHandler);

export default app;
