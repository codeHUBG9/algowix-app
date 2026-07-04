import type { Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma.js";
import { tenantScopedClient } from "../../database/tenant-scope.js";

export const webhookRepository = {
  list(organizationId: string) {
    return tenantScopedClient(organizationId).webhook.findMany({ orderBy: { createdAt: "desc" } });
  },

  findById(organizationId: string, id: string) {
    return tenantScopedClient(organizationId).webhook.findFirst({ where: { id } });
  },

  create(organizationId: string, data: { name: string; url: string; secret: string; events: string }) {
    return tenantScopedClient(organizationId).webhook.create({ data: data as Prisma.WebhookUncheckedCreateInput });
  },

  update(organizationId: string, id: string, data: Partial<{ name: string; url: string; events: string; isActive: boolean }>) {
    return tenantScopedClient(organizationId).webhook.update({ where: { id }, data });
  },

  delete(organizationId: string, id: string) {
    return tenantScopedClient(organizationId).webhook.delete({ where: { id } });
  },

  // Active webhooks across ALL orgs subscribed to a given event — used by the
  // dispatcher, which fires from platform code that already knows the
  // organizationId, so it queries directly rather than via tenantScopedClient
  // (there's no single org context at the call site's caller boundary).
  findActiveSubscribed(organizationId: string, eventType: string) {
    return prisma.webhook.findMany({
      where: { organizationId, isActive: true, events: { contains: eventType } },
    });
  },

  recordDelivery(data: {
    webhookId: string;
    eventType: string;
    payload: string;
    statusCode: number | null;
    response: string | null;
    success: boolean;
  }) {
    return prisma.webhookDelivery.create({ data: { ...data, deliveredAt: new Date() } });
  },

  touchTriggered(webhookId: string, success: boolean) {
    return prisma.webhook.update({
      where: { id: webhookId },
      data: success
        ? { lastTriggeredAt: new Date(), failureCount: 0 }
        : { lastTriggeredAt: new Date(), failureCount: { increment: 1 } },
    });
  },

  deliveries(organizationId: string, webhookId: string, limit: number) {
    return prisma.webhookDelivery.findMany({
      where: { webhookId, webhook: { organizationId } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },
};
