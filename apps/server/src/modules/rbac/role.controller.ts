import type { Request, Response } from "express";
import { roleService } from "./role.service.js";
import { createRoleSchema, updateRoleSchema } from "./role.schema.js";
import { sendSuccess } from "../../utils/respond.js";
import { UnauthorizedError } from "../../utils/errors.js";

function requireAuth(req: Request) {
  if (!req.auth) throw new UnauthorizedError();
  return req.auth;
}

export const roleController = {
  async list(req: Request, res: Response) {
    const auth = requireAuth(req);
    const roles = await roleService.list(auth.organizationId);
    sendSuccess(res, roles);
  },

  async getById(req: Request, res: Response) {
    const auth = requireAuth(req);
    const role = await roleService.getById(auth.organizationId, req.params.id!);
    sendSuccess(res, role);
  },

  async create(req: Request, res: Response) {
    const auth = requireAuth(req);
    const input = createRoleSchema.parse(req.body);
    const role = await roleService.create(auth.organizationId, auth.plan, auth.permissions, input);
    sendSuccess(res, role, 201);
  },

  async update(req: Request, res: Response) {
    const auth = requireAuth(req);
    const input = updateRoleSchema.parse(req.body);
    const role = await roleService.update(auth.organizationId, req.params.id!, auth.permissions, input);
    sendSuccess(res, role);
  },

  async remove(req: Request, res: Response) {
    const auth = requireAuth(req);
    await roleService.remove(auth.organizationId, req.params.id!);
    sendSuccess(res, { removed: true });
  },
};
