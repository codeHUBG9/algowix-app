import { prisma } from "../../database/prisma.js";
import { tenantScopedClient } from "../../database/tenant-scope.js";

export const subscriptionRepository = {
  findAll(organizationId: string) {
    return tenantScopedClient(organizationId).subscription.findMany({
      include: { plan: true, product: true },
      orderBy: { createdAt: "desc" },
    });
  },

  findById(organizationId: string, id: string) {
    return tenantScopedClient(organizationId).subscription.findFirst({
      where: { id },
      include: { plan: true, product: true },
    });
  },

  findByOrgAndProduct(organizationId: string, productId: string) {
    return prisma.subscription.findUnique({
      where: { organizationId_productId: { organizationId, productId } },
      include: { plan: true, product: true },
    });
  },

  updatePlanAndPeriod(
    id: string,
    data: { planId: string; currentPeriodStart?: Date; currentPeriodEnd?: Date }
  ) {
    return prisma.subscription.update({
      where: { id },
      data,
      include: { plan: true, product: true },
    });
  },

  updateStatus(id: string, status: string, extra: Record<string, unknown> = {}) {
    return prisma.subscription.update({ where: { id }, data: { status, ...extra } });
  },

  updateSeatCount(id: string, seatCount: number) {
    return prisma.subscription.update({ where: { id }, data: { seatCount } });
  },

  countActiveSeats(organizationId: string) {
    return prisma.orgMembership.count({ where: { organizationId, status: { in: ["ACTIVE", "INVITED"] } } });
  },

  history(organizationId: string, subscriptionId: string) {
    return tenantScopedClient(organizationId).auditLog.findMany({
      where: { resource: "subscription", resourceId: subscriptionId },
      orderBy: { createdAt: "desc" },
    });
  },

  writeAuditLog(entry: { organizationId: string; actorId?: string; actorEmail?: string; actorType?: string; action: string; resourceId?: string }) {
    return prisma.auditLog.create({
      data: {
        organizationId: entry.organizationId,
        actorId: entry.actorId,
        actorType: entry.actorType ?? "USER",
        actorEmail: entry.actorEmail,
        action: entry.action,
        resource: "subscription",
        resourceId: entry.resourceId,
        severity: "CRITICAL",
      },
    });
  },

  findFreePlanForProduct(productId: string) {
    return prisma.productPlan.findFirst({ where: { productId, monthlyPrice: 0, isActive: true } });
  },
};
