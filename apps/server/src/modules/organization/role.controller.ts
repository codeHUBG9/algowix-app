import type { Request, Response } from "express";
import { prisma } from "../../database/prisma.js";
import { sendSuccess } from "../../utils/respond.js";

// Minimal roles list for the invite/member-filter UI — full RBAC management
// (custom role creation, permission editing) is 13-RBAC.md, not this phase.
export const roleController = {
  async list(req: Request, res: Response) {
    const organizationId = req.params.id!;
    const roles = await prisma.role.findMany({
      where: { OR: [{ organizationId }, { organizationId: null, isSystem: true }] },
      select: { id: true, name: true, isSystem: true },
      orderBy: { name: "asc" },
    });
    sendSuccess(res, roles);
  },
};
