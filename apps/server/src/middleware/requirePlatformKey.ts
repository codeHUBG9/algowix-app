import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";
import { UnauthorizedError } from "../utils/errors.js";

// Gates internal/platform-admin routes (tenant suspend/reactivate/purge) per
// 07-Tenant-Management.md §7.6 — staff access must be distinct from
// org-member RBAC and separately auditable. Deliberately minimal: a shared
// secret header, not a full staff-account/SSO system, since there's no
// admin portal yet — this is meant to be called by internal tooling
// (billing dunning jobs, support scripts), not end users.
export function requirePlatformKey(req: Request, _res: Response, next: NextFunction): void {
  const key = req.headers["x-platform-key"];
  if (key !== env.PLATFORM_ADMIN_KEY) {
    return next(new UnauthorizedError("Invalid platform admin key"));
  }
  next();
}
