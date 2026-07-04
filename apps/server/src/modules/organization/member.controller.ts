import type { Request, Response } from "express";
import { memberService } from "./member.service.js";
import { memberQuerySchema, updateMemberStatusSchema, updateMemberRoleSchema } from "./organization.schema.js";
import { sendPaginated, sendSuccess } from "../../utils/respond.js";
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

export const memberController = {
  async list(req: Request, res: Response) {
    const query = memberQuerySchema.parse(req.query);
    const { items, meta } = await memberService.list(req.params.id!, query);
    sendPaginated(res, items, meta);
  },

  async updateStatus(req: Request, res: Response) {
    const input = updateMemberStatusSchema.parse(req.body);
    const member = await memberService.updateStatus(req.params.id!, req.params.userId!, input, actorFromRequest(req));
    sendSuccess(res, member);
  },

  async updateRole(req: Request, res: Response) {
    const input = updateMemberRoleSchema.parse(req.body);
    const member = await memberService.updateRole(req.params.id!, req.params.userId!, input.roleId, actorFromRequest(req));
    sendSuccess(res, member);
  },

  async remove(req: Request, res: Response) {
    await memberService.remove(req.params.id!, req.params.userId!, actorFromRequest(req));
    sendSuccess(res, { removed: true });
  },
};
