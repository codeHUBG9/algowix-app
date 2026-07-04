import type { Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma.js";
import { tenantScopedClient } from "../../database/tenant-scope.js";

export const memberRepository = {
  async list(organizationId: string, where: Prisma.OrgMembershipWhereInput, page: number, limit: number) {
    const client = tenantScopedClient(organizationId);
    const [items, total] = await Promise.all([
      client.orgMembership.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true, lastLoginAt: true } },
          role: { select: { id: true, name: true } },
        },
        orderBy: { joinedAt: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      client.orgMembership.count({ where }),
    ]);
    return { items, total };
  },

  findById(organizationId: string, userId: string) {
    return tenantScopedClient(organizationId).orgMembership.findFirst({
      where: { userId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true, lastLoginAt: true } },
        role: { select: { id: true, name: true } },
      },
    });
  },

  countActiveOwners(organizationId: string) {
    return prisma.orgMembership.count({
      where: { organizationId, status: "ACTIVE", role: { name: "Owner", isSystem: true } },
    });
  },

  updateStatus(organizationId: string, userId: string, status: string) {
    return tenantScopedClient(organizationId).orgMembership.updateMany({ where: { userId }, data: { status } });
  },

  updateRole(organizationId: string, userId: string, roleId: string) {
    return tenantScopedClient(organizationId).orgMembership.updateMany({ where: { userId }, data: { roleId } });
  },

  findRoleForOrg(organizationId: string, roleId: string) {
    return prisma.role.findFirst({ where: { id: roleId, OR: [{ organizationId }, { organizationId: null, isSystem: true }] } });
  },

  remove(organizationId: string, userId: string) {
    return tenantScopedClient(organizationId).orgMembership.deleteMany({ where: { userId } });
  },

  revokeSessionsForUserInOrg(userId: string, organizationId: string) {
    return prisma.session.updateMany({
      where: { userId, organizationId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  listActiveSubscriptionProductSlugs(organizationId: string) {
    return prisma.subscription
      .findMany({
        where: { organizationId, status: { in: ["TRIALING", "ACTIVE"] } },
        include: { product: { select: { slug: true } } },
      })
      .then((subs) => subs.map((s) => s.product.slug));
  },

  writeAuditLog(entry: Prisma.AuditLogUncheckedCreateInput) {
    return prisma.auditLog.create({ data: entry });
  },
};
