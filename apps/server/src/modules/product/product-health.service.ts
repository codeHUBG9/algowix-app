import type { Product } from "@prisma/client";
import { prisma } from "../../database/prisma.js";
import { signedGet } from "./signed-fetch.js";
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
      return prisma.product.update({
        where: { id: product.id },
        data: {
          healthStatus: "down",
          lastHealthCheckAt: new Date(),
          consecutiveFailures,
        },
      });
    }
  },

  async checkAll() {
    const products = await prisma.product.findMany({ where: { isActive: true } });
    return Promise.all(products.map((p) => this.checkOne(p)));
  },
};
