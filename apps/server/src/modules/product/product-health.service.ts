import type { Product } from "@prisma/client";
import { prisma } from "../../database/prisma.js";
import { signedGet } from "./signed-fetch.js";
import { notificationService } from "../notification/notification.service.js";
import { NOTIFICATION_TYPES } from "../notification/notification.types.js";
import type { ProductHealthResponse } from "./product-contract.types.js";

// 09-Product-Integration.md §6 — health polling doc says "runs every minute"
// via a background job. No BullMQ/Redis in this repo yet (same reason
// 07-Tenant-Management's purge job is deferred), so this is exposed as an
// admin-triggered endpoint rather than a real cron.
export const productHealthService = {
  async checkOne(product: Product) {
    try {
      const health = await signedGet<ProductHealthResponse>(product.baseUrl, `${product.contractApiPath}/health`, 5000);

      return prisma.product.update({
        where: { id: product.id },
        data: {
          healthStatus: health.status,
          version: health.version ?? product.version,
          lastHealthCheckAt: new Date(),
          lastHealthSuccessAt: new Date(),
          consecutiveFailures: 0,
        },
      });
    } catch {
      const consecutiveFailures = product.consecutiveFailures + 1;
      const updated = await prisma.product.update({
        where: { id: product.id },
        data: {
          healthStatus: "down",
          lastHealthCheckAt: new Date(),
          consecutiveFailures,
        },
      });

      // 14-Notifications.md product.health_down — notify each subscribed
      // org's owner only on the transition into "down" (first failure), not
      // on every repeated check, to avoid spamming.
      if (consecutiveFailures === 1) {
        await notifySubscribedOwners(product);
      }

      return updated;
    }
  },

  async checkAll() {
    const products = await prisma.product.findMany({ where: { isActive: true } });
    return Promise.all(products.map((p) => this.checkOne(p)));
  },
};

async function notifySubscribedOwners(product: Product): Promise<void> {
  const subscriptions = await prisma.subscription.findMany({
    where: { productId: product.id, status: { in: ["TRIALING", "ACTIVE", "PAST_DUE"] } },
    select: { organizationId: true },
  });

  for (const sub of subscriptions) {
    const owner = await prisma.orgMembership.findFirst({
      where: { organizationId: sub.organizationId, isPrimary: true },
      select: { userId: true },
    });
    if (!owner) continue;
    await notificationService.notify({
      organizationId: sub.organizationId,
      userId: owner.userId,
      type: NOTIFICATION_TYPES.PRODUCT_DOWN,
      title: `${product.name} is experiencing issues`,
      body: `We're seeing connectivity issues with ${product.name}. Your data is safe — this is a temporary service disruption.`,
      actionUrl: "/dashboard/products",
    });
  }
}
