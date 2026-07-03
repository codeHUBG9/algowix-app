import type { Request, Response, NextFunction } from "express";
import { ForbiddenError, UnauthorizedError } from "../utils/errors.js";

// Per 08-Organization-Management.md §10, endpoints are addressed as
// /organizations/:id/... . The platform has no cross-org API-key access yet
// (see 07-Tenant-Management.md), so :id must always match the caller's own
// session organization — this just enforces that instead of silently
// ignoring the param.
export function requireOwnOrganization(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth) return next(new UnauthorizedError());
  if (req.params.id !== req.auth.organizationId) {
    return next(new ForbiddenError("You do not have access to this organization"));
  }
  next();
}
