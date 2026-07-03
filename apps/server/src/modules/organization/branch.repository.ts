import type { Prisma } from "@prisma/client";
import { tenantScopedClient } from "../../database/tenant-scope.js";

export const branchRepository = {
  list(organizationId: string) {
    return tenantScopedClient(organizationId).branch.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
  },

  findById(organizationId: string, id: string) {
    return tenantScopedClient(organizationId).branch.findFirst({ where: { id, deletedAt: null } });
  },

  findByCode(organizationId: string, code: string) {
    return tenantScopedClient(organizationId).branch.findFirst({ where: { code, deletedAt: null } });
  },

  findHeadOffice(organizationId: string) {
    return tenantScopedClient(organizationId).branch.findFirst({ where: { isHeadOffice: true, deletedAt: null } });
  },

  create(organizationId: string, data: Omit<Prisma.BranchUncheckedCreateInput, "organizationId">) {
    return tenantScopedClient(organizationId).branch.create({ data: data as Prisma.BranchUncheckedCreateInput });
  },

  update(organizationId: string, id: string, data: Prisma.BranchUpdateInput) {
    return tenantScopedClient(organizationId).branch.update({ where: { id }, data });
  },

  softDelete(organizationId: string, id: string) {
    return tenantScopedClient(organizationId).branch.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  unsetHeadOffice(organizationId: string, exceptId?: string) {
    return tenantScopedClient(organizationId).branch.updateMany({
      where: { isHeadOffice: true, ...(exceptId ? { id: { not: exceptId } } : {}) },
      data: { isHeadOffice: false },
    });
  },
};
