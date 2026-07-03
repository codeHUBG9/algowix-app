import { prisma } from "../../database/prisma.js";
import { tenantScopedClient } from "../../database/tenant-scope.js";
import type { Prisma } from "@prisma/client";

export const tenantRepository = {
  findById(id: string) {
    return prisma.organization.findUnique({ where: { id } });
  },

  findBySlug(slug: string) {
    return prisma.organization.findUnique({ where: { slug } });
  },

  update(id: string, data: Prisma.OrganizationUpdateInput) {
    return prisma.organization.update({ where: { id }, data });
  },

  listMembers(organizationId: string) {
    return tenantScopedClient(organizationId).orgMembership.findMany({
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true } },
        role: { select: { id: true, name: true } },
      },
      orderBy: { joinedAt: "asc" },
    });
  },

  listSubscriptions(organizationId: string) {
    return tenantScopedClient(organizationId).subscription.findMany({ include: { product: true } });
  },

  cancelSubscriptions(organizationId: string) {
    return tenantScopedClient(organizationId).subscription.updateMany({
      where: { cancelAtPeriodEnd: false },
      data: { cancelAtPeriodEnd: true, cancelledAt: new Date() },
    });
  },

  writeAuditLog(entry: Prisma.AuditLogUncheckedCreateInput) {
    return prisma.auditLog.create({ data: entry });
  },
};
