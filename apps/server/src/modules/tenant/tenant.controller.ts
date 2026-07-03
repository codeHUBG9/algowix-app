import type { Request, Response } from "express";
import { tenantService } from "./tenant.service.js";
import { updateTenantSchema } from "./tenant.schema.js";
import { sendSuccess } from "../../utils/respond.js";
import { UnauthorizedError } from "../../utils/errors.js";
import type { LifecycleActor } from "./tenant.service.js";

function actorFromRequest(req: Request): LifecycleActor {
  if (!req.auth) throw new UnauthorizedError();
  return {
    actorId: req.auth.userId,
    actorType: "USER",
    actorEmail: req.auth.email,
    ipAddress: req.ip,
  };
}

export const tenantController = {
  async getCurrent(req: Request, res: Response) {
    if (!req.tenant) throw new UnauthorizedError();
    sendSuccess(res, tenantService.toPublicTenant(req.tenant));
  },

  async updateCurrent(req: Request, res: Response) {
    if (!req.auth) throw new UnauthorizedError();
    const input = updateTenantSchema.parse(req.body);
    const updated = await tenantService.updateTenant(req.auth.organizationId, input, actorFromRequest(req));
    sendSuccess(res, tenantService.toPublicTenant(updated));
  },

  async listMembers(req: Request, res: Response) {
    if (!req.auth) throw new UnauthorizedError();
    const members = await tenantService.listMembers(req.auth.organizationId);
    sendSuccess(
      res,
      members.map((m) => ({
        id: m.id,
        status: m.status,
        isPrimary: m.isPrimary,
        joinedAt: m.joinedAt,
        user: m.user,
        role: m.role,
      }))
    );
  },

  async cancel(req: Request, res: Response) {
    if (!req.auth) throw new UnauthorizedError();
    const updated = await tenantService.cancelTenant(req.auth.organizationId, actorFromRequest(req));
    sendSuccess(res, tenantService.toPublicTenant(updated));
  },
};
