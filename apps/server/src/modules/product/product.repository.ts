import { prisma } from "../../database/prisma.js";

export const productRepository = {
  findAllActive() {
    return prisma.product.findMany({
      where: { isActive: true, isPublic: true },
      orderBy: { sortOrder: "asc" },
      include: { plans: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
    });
  },

  findBySlug(slug: string) {
    return prisma.product.findUnique({
      where: { slug },
      include: { plans: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
    });
  },

  findAll() {
    return prisma.product.findMany({ orderBy: { sortOrder: "asc" } });
  },

  findBySlugs(slugs: string[]) {
    return prisma.product.findMany({ where: { slug: { in: slugs } } });
  },

  findSubscription(organizationId: string, productId: string) {
    return prisma.subscription.findUnique({
      where: { organizationId_productId: { organizationId, productId } },
      include: { plan: true },
    });
  },
};
