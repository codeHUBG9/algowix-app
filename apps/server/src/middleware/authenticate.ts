import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../services/jwt.service.js";
import { UnauthorizedError } from "../utils/errors.js";
import { hashToken } from "../utils/hash-token.js";
import { apiKeyRepository } from "../modules/developer/api-key.repository.js";
import { prisma } from "../database/prisma.js";
import type { AccessTokenPayload } from "@algowix/shared-types";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload;
    }
  }
}

// 10-API-Gateway.md §5 — the gateway accepts either a JWT or an API key and
// forwards the same resolved identity downstream. Rather than duplicating
// every requirePermission()-gated route for a second auth scheme, an API
// key is resolved into the exact same AccessTokenPayload shape a JWT
// produces, so every existing route accepts either transparently.
async function authenticateWithApiKey(rawKey: string): Promise<AccessTokenPayload> {
  const keyHash = hashToken(rawKey);
  const apiKey = await apiKeyRepository.findActiveByHash(keyHash);
  if (!apiKey) throw new UnauthorizedError("Invalid API key");
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) throw new UnauthorizedError("API key has expired");

  void apiKeyRepository.touchLastUsed(apiKey.id).catch(() => {});

  return {
    userId: apiKey.createdById,
    organizationId: apiKey.organizationId,
    orgSlug: apiKey.organization.slug,
    email: "",
    role: "API_KEY",
    plan: apiKey.organization.plan,
    permissions: JSON.parse(apiKey.scopes) as string[],
    sessionId: apiKey.id,
  };
}

// 20-Developer-Portal.md §7 — backs GET /developer/usage and /developer/logs.
// Only logs requests actually authenticated via an API key, not every
// JWT-authenticated dashboard request. Registered here (the one choke point
// every authenticated route passes through) rather than as a separate global
// middleware, since req.auth isn't populated until authenticate() runs, and
// that runs per-router, not globally in app.ts.
function logApiKeyRequest(req: Request, res: Response, apiKeyId: string, organizationId: string, start: number): void {
  res.on("finish", () => {
    void prisma.apiRequestLog
      .create({
        data: {
          organizationId,
          apiKeyId,
          method: req.method,
          path: req.originalUrl.split("?")[0]!.slice(0, 255),
          statusCode: res.statusCode,
          latencyMs: Date.now() - start,
        },
      })
      .catch(() => {});
  });
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const start = Date.now();
  try {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith("ApiKey ")) {
      req.auth = await authenticateWithApiKey(authHeader.slice("ApiKey ".length));
      logApiKeyRequest(req, res, req.auth.sessionId, req.auth.organizationId, start);
      return next();
    }

    const bearer = authHeader?.replace("Bearer ", "");
    const token = req.cookies?.access_token ?? bearer;

    if (!token) throw new UnauthorizedError("No authentication token");

    req.auth = await verifyAccessToken(token);
    next();
  } catch {
    next(new UnauthorizedError("Invalid or expired token"));
  }
}
