import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../services/jwt.service.js";

// Used by the invite-accept flow (08-Organization-Management.md §7), which must
// work both for an already-logged-in user (identify them, skip password) and
// for a brand-new visitor (no token at all) — unlike `authenticate`, a
// missing/invalid token is not an error here, it just leaves req.auth unset.
export async function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const bearer = req.headers.authorization?.replace("Bearer ", "");
  const token = req.cookies?.access_token ?? bearer;

  if (!token) return next();

  try {
    req.auth = await verifyAccessToken(token);
  } catch {
    // Ignore — treat as unauthenticated rather than rejecting the request.
  }
  next();
}
