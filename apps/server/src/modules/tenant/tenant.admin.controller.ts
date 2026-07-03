import type { Request, Response } from "express";
import { tenantService } from "./tenant.service.js";
import { suspendTenantSchema } from "./tenant.schema.js";
import { sendSuccess } from "../../utils/respond.js";
import { ValidationError } from "../../utils/errors.js";
import type { LifecycleActor } from "./tenant.service.js";

function platformActor(req: Request, reason?: string): LifecycleActor {
  return { actorType: "PLATFORM_ADMIN", reason, ipAddress: req.ip };
}

function orgIdFromParams(req: Request): string {
  const orgId = req.params.orgId;
  if (!orgId) throw new ValidationError("orgId is required");
  return orgId;
}

export const tenantAdminController = {
  async getById(req: Request, res: Response) {
    const tenant = await tenantService.getTenantById(orgIdFromParams(req));
    sendSuccess(res, tenantService.toPublicTenant(tenant));
  },

  async suspend(req: Request, res: Response) {
    const { reason } = suspendTenantSchema.parse(req.body);
    const updated = await tenantService.suspendTenant(orgIdFromParams(req), platformActor(req, reason));
    sendSuccess(res, tenantService.toPublicTenant(updated));
  },

  async reactivate(req: Request, res: Response) {
    const updated = await tenantService.reactivateTenant(orgIdFromParams(req), platformActor(req));
    sendSuccess(res, tenantService.toPublicTenant(updated));
  },

  async purge(req: Request, res: Response) {
    const updated = await tenantService.purgeTenant(orgIdFromParams(req), platformActor(req));
    sendSuccess(res, tenantService.toPublicTenant(updated));
  },
};
