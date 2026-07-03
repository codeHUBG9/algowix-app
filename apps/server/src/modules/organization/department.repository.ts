import type { Prisma } from "@prisma/client";
import { tenantScopedClient } from "../../database/tenant-scope.js";
import { prisma } from "../../database/prisma.js";

export const departmentRepository = {
  list(organizationId: string) {
    return tenantScopedClient(organizationId).department.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
  },

  findById(organizationId: string, id: string) {
    return tenantScopedClient(organizationId).department.findFirst({ where: { id, deletedAt: null } });
  },

  findByCode(organizationId: string, code: string) {
    return tenantScopedClient(organizationId).department.findFirst({ where: { code, deletedAt: null } });
  },

  countChildren(organizationId: string, parentId: string) {
    return tenantScopedClient(organizationId).department.count({ where: { parentId, deletedAt: null } });
  },

  create(organizationId: string, data: Omit<Prisma.DepartmentUncheckedCreateInput, "organizationId">) {
    return tenantScopedClient(organizationId).department.create({
      data: data as Prisma.DepartmentUncheckedCreateInput,
    });
  },

  update(organizationId: string, id: string, data: Prisma.DepartmentUpdateInput) {
    return tenantScopedClient(organizationId).department.update({ where: { id }, data });
  },

  softDelete(organizationId: string, id: string) {
    return tenantScopedClient(organizationId).department.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  findActiveMembership(organizationId: string, userId: string) {
    return prisma.orgMembership.findFirst({ where: { organizationId, userId, status: "ACTIVE" } });
  },

  findHeadUsers(userIds: string[]) {
    return prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
  },
};
