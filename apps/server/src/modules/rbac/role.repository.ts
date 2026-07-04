import { prisma } from "../../database/prisma.js";

const roleInclude = {
  permissions: { include: { permission: true } },
  productAccess: { include: { product: { select: { id: true, slug: true, name: true } } } },
} as const;

export const roleRepository = {
  listForOrg(organizationId: string) {
    return prisma.role.findMany({
      where: { OR: [{ organizationId }, { organizationId: null, isSystem: true }] },
      include: roleInclude,
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    });
  },

  findForOrg(id: string, organizationId: string) {
    return prisma.role.findFirst({
      where: { id, OR: [{ organizationId }, { organizationId: null, isSystem: true }] },
      include: roleInclude,
    });
  },

  findByName(organizationId: string, name: string) {
    return prisma.role.findFirst({ where: { organizationId, name } });
  },

  countMemberships(roleId: string) {
    return prisma.orgMembership.count({ where: { roleId } });
  },

  create(organizationId: string, name: string, description: string | null, permissionIds: string[], productIds: string[]) {
    return prisma.role.create({
      data: {
        organizationId,
        name,
        description,
        isSystem: false,
        permissions: { create: permissionIds.map((permissionId) => ({ permissionId })) },
        productAccess: { create: productIds.map((productId) => ({ productId })) },
      },
      include: roleInclude,
    });
  },

  async update(
    roleId: string,
    data: { name?: string; description?: string | null },
    permissionIds: string[] | undefined,
    productIds: string[] | undefined
  ) {
    return prisma.$transaction(async (tx) => {
      if (data.name !== undefined || data.description !== undefined) {
        await tx.role.update({ where: { id: roleId }, data });
      }
      if (permissionIds) {
        await tx.rolePermission.deleteMany({ where: { roleId } });
        await tx.rolePermission.createMany({ data: permissionIds.map((permissionId) => ({ roleId, permissionId })) });
      }
      if (productIds) {
        await tx.roleProductAccess.deleteMany({ where: { roleId } });
        await tx.roleProductAccess.createMany({ data: productIds.map((productId) => ({ roleId, productId })) });
      }
      return tx.role.findUniqueOrThrow({ where: { id: roleId }, include: roleInclude });
    });
  },

  // RolePermission/RoleProductAccess have no cascade at the DB level for the
  // Role side (only RoleProductAccess.product cascades) — clear them first or
  // the delete 500s with a FK violation.
  delete(roleId: string) {
    return prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId } }),
      prisma.roleProductAccess.deleteMany({ where: { roleId } }),
      prisma.role.delete({ where: { id: roleId } }),
    ]);
  },
};
