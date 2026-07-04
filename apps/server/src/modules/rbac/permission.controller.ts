import type { Request, Response } from "express";
import { permissionRepository } from "./permission.repository.js";
import { categoryFor, labelFor } from "./permission.catalog.js";
import { sendSuccess } from "../../utils/respond.js";

function toPublicPermission(p: { id: string; resource: string; action: string; scope: string; description: string | null }) {
  return {
    id: p.id,
    resource: p.resource,
    action: p.action,
    scope: p.scope,
    key: `${p.resource}.${p.action}`,
    label: labelFor(p.resource, p.action),
    description: p.description,
  };
}

export const permissionController = {
  async list(_req: Request, res: Response) {
    const permissions = await permissionRepository.findAll();
    sendSuccess(res, permissions.map(toPublicPermission));
  },

  // §8 — grouped for the permissions-assignment UI (checkbox list per category).
  async catalog(_req: Request, res: Response) {
    const permissions = await permissionRepository.findAll();
    const groups = new Map<string, ReturnType<typeof toPublicPermission>[]>();

    for (const permission of permissions) {
      const category = categoryFor(permission.resource);
      const list = groups.get(category) ?? [];
      list.push(toPublicPermission(permission));
      groups.set(category, list);
    }

    sendSuccess(
      res,
      Array.from(groups.entries()).map(([category, items]) => ({ category, permissions: items }))
    );
  },
};
