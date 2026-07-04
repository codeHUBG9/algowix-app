import { prisma } from "../../database/prisma.js";

export const permissionRepository = {
  findAll() {
    return prisma.permission.findMany({ orderBy: [{ resource: "asc" }, { action: "asc" }] });
  },

  findByIds(ids: string[]) {
    return prisma.permission.findMany({ where: { id: { in: ids } } });
  },
};
