import { prisma } from "../../database/prisma.js";
import { tenantScopedClient } from "../../database/tenant-scope.js";

export const marketplaceRepository = {
  listApproved() {
    return prisma.marketplaceListing.findMany({ where: { status: "APPROVED" }, orderBy: { installCount: "desc" } });
  },

  findBySlug(slug: string) {
    return prisma.marketplaceListing.findUnique({ where: { slug } });
  },

  findInstall(organizationId: string, listingId: string) {
    return tenantScopedClient(organizationId).marketplaceInstall.findUnique({
      where: { organizationId_listingId: { organizationId, listingId } },
    });
  },

  listInstalls(organizationId: string) {
    return tenantScopedClient(organizationId).marketplaceInstall.findMany({
      where: { status: "ACTIVE" },
      include: { listing: true },
    });
  },

  async install(organizationId: string, listingId: string, installedById: string) {
    const [install] = await prisma.$transaction([
      tenantScopedClient(organizationId).marketplaceInstall.upsert({
        where: { organizationId_listingId: { organizationId, listingId } },
        create: { organizationId, listingId, installedById, status: "ACTIVE" },
        update: { status: "ACTIVE", installedAt: new Date(), uninstalledAt: null },
      }),
      prisma.marketplaceListing.update({ where: { id: listingId }, data: { installCount: { increment: 1 } } }),
    ]);
    return install;
  },

  uninstall(organizationId: string, listingId: string) {
    return tenantScopedClient(organizationId).marketplaceInstall.update({
      where: { organizationId_listingId: { organizationId, listingId } },
      data: { status: "UNINSTALLED", uninstalledAt: new Date() },
    });
  },
};
