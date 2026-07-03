import type { Request, Response, NextFunction } from "express";
import type { Organization } from "@prisma/client";
import { tenantRepository } from "../modules/tenant/tenant.repository.js";
import { AppError, NotFoundError, UnauthorizedError } from "../utils/errors.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenant?: Organization;
    }
  }
}

// In-memory TTL cache for org lookups, per 07-Tenant-Management.md §5.
// Same interim approach as middleware/rateLimiter.ts: fine for a single
// instance, swap for a Redis-backed cache before a multi-instance deploy.
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { org: Organization; expiresAt: number }>();

function getCached(organizationId: string): Organization | undefined {
  const hit = cache.get(organizationId);
  if (!hit) return undefined;
  if (hit.expiresAt < Date.now()) {
    cache.delete(organizationId);
    return undefined;
  }
  return hit.org;
}

export function cacheTenant(org: Organization): void {
  cache.set(org.id, { org, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function invalidateTenantCache(organizationId: string): void {
  cache.delete(organizationId);
}

export async function resolveTenantContext(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const { organizationId } = req.auth;

    let org = getCached(organizationId);
    if (!org) {
      const fetched = await tenantRepository.findById(organizationId);
      if (!fetched) throw new NotFoundError("Organization not found");
      org = fetched;
      cacheTenant(org);
    }

    // Distinct codes (not the generic ForbiddenError's fixed "FORBIDDEN") so
    // API consumers can branch on the specific reason instead of parsing message text.
    if (org.status === "SUSPENDED") {
      throw new AppError(403, "TENANT_SUSPENDED", "This organization is suspended.");
    }
    if (org.status === "CANCELLED") {
      throw new AppError(403, "TENANT_CANCELLED", "This organization has been cancelled.");
    }
    if (org.status === "PURGED") {
      throw new AppError(403, "TENANT_PURGED", "This organization no longer exists.");
    }

    req.tenant = org;
    next();
  } catch (err) {
    next(err);
  }
}
