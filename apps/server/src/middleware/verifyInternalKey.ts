import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";
import { verifySignature } from "../utils/internalKey.js";
import { UnauthorizedError } from "../utils/errors.js";

// Gates /api/internal/* (product -> platform push, 09-Product-Integration.md
// §5) the same way products are expected to gate their own contract API —
// verifies the HMAC signature over the exact raw request body (see
// app.ts's express.json({ verify }) which stashes req.rawBody).
export function verifyInternalKey(req: Request, _res: Response, next: NextFunction): void {
  const signature = req.headers["platform-internal-key"];
  const timestamp = req.headers["platform-internal-timestamp"];

  if (typeof signature !== "string" || typeof timestamp !== "string") {
    return next(new UnauthorizedError("Missing internal key headers"));
  }

  const rawBody = req.rawBody ?? "";
  if (!verifySignature(rawBody, timestamp, signature, env.PRODUCT_INTERNAL_SECRET)) {
    return next(new UnauthorizedError("Invalid or expired internal key signature"));
  }

  next();
}
