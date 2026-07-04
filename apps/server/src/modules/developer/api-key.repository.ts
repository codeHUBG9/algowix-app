import type { Prisma } from "@prisma/client";
import { tenantScopedClient } from "../../database/tenant-scope.js";
import { prisma } from "../../database/prisma.js";

export const apiKeyRepository = {
  list(organizationId: string) {
    return tenantScopedClient(organizationId).apiKey.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  findById(organizationId: string, id: string) {
    return tenantScopedClient(organizationId).apiKey.findFirst({ where: { id } });
  },

  create(organizationId: string, data: Omit<Prisma.ApiKeyUncheckedCreateInput, "organizationId">) {
    return tenantScopedClient(organizationId).apiKey.create({ data: data as Prisma.ApiKeyUncheckedCreateInput });
  },

  revoke(organizationId: string, id: string) {
    return tenantScopedClient(organizationId).apiKey.update({ where: { id }, data: { isActive: false } });
  },

  // Auth-time lookup happens before an organization/tenant is known — has to
  // go through the raw prisma client (tenantScopedClient requires an
  // organizationId up front, which is exactly what we're trying to resolve).
  findActiveByHash(keyHash: string) {
    return prisma.apiKey.findFirst({
      where: { keyHash, isActive: true },
      include: { organization: true },
    });
  },

  touchLastUsed(id: string) {
    return prisma.apiKey.update({ where: { id }, data: { lastUsedAt: new Date() } });
  },
};
