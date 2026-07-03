import type { Request, Response, NextFunction } from "express";
import { ForbiddenError, UnauthorizedError } from "../utils/errors.js";

export function requirePermission(permission: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) return next(new UnauthorizedError());
    if (!req.auth.permissions.includes(permission)) {
      return next(new ForbiddenError(`Missing required permission: ${permission}`));
    }
    next();
  };
}
