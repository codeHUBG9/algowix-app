import type { Request, Response } from "express";
import { tenantService } from "../tenant/tenant.service.js";
import { updateTenantSchema } from "../tenant/tenant.schema.js";
import { sendSuccess } from "../../utils/respond.js";
import { UnauthorizedError } from "../../utils/errors.js";
import type { LifecycleActor } from "../tenant/tenant.service.js";

function actorFromRequest(req: Request): LifecycleActor {
  if (!req.auth) throw new UnauthorizedError();
  return {
    actorId: req.auth.userId,
    actorType: "USER",
    actorEmail: req.auth.email,
    ipAddress: req.ip,
  };
}

// Thin aliases satisfying 08-Organization-Management.md §10's literal
// GET/PUT /api/v1/organizations/:id — deliberately reuse tenantService rather
// than duplicating org-profile logic that already lives behind /tenants/me
// (07-Tenant-Management.md). No DELETE alias: deletion stays lifecycle-gated
// (cancel -> retention -> purge) via the tenant-admin routes, not a hard delete.
export const organizationProfileController = {
  async getOne(req: Request, res: Response) {
    const org = await tenantService.getTenantById(req.params.id!);
    sendSuccess(res, tenantService.toPublicTenant(org));
  },

  async updateOne(req: Request, res: Response) {
    const input = updateTenantSchema.parse(req.body);
    const updated = await tenantService.updateTenant(req.params.id!, input, actorFromRequest(req));
    sendSuccess(res, tenantService.toPublicTenant(updated));
  },
};
