import type { Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma.js";
import { tenantScopedClient } from "../../database/tenant-scope.js";

export const fileRepository = {
  create(
    organizationId: string,
    data: {
      id?: string;
      uploadedById: string;
      filename: string;
      originalName: string;
      mimeType: string;
      sizeBytes: bigint;
      blobUrl: string;
      folder: string | null;
      isPublic: boolean;
    }
  ) {
    // organizationId is auto-injected by the tenant-scope extension's
    // "create" handling — the cast matches apiKeyRepository's precedent.
    return tenantScopedClient(organizationId).fileRecord.create({ data: data as Prisma.FileRecordUncheckedCreateInput });
  },

  findById(organizationId: string, id: string) {
    return tenantScopedClient(organizationId).fileRecord.findFirst({ where: { id, deletedAt: null } });
  },

  list(organizationId: string, opts: { folder?: string; page: number; limit: number }) {
    const where = { deletedAt: null, ...(opts.folder ? { folder: opts.folder } : {}) };
    return Promise.all([
      tenantScopedClient(organizationId).fileRecord.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
      tenantScopedClient(organizationId).fileRecord.count({ where }),
    ]);
  },

  markReady(organizationId: string, id: string, cdnUrl: string) {
    return tenantScopedClient(organizationId).fileRecord.update({ where: { id }, data: { cdnUrl } });
  },

  softDelete(organizationId: string, id: string) {
    return tenantScopedClient(organizationId).fileRecord.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  async totalStorageUsed(organizationId: string): Promise<number> {
    const result = await tenantScopedClient(organizationId).fileRecord.aggregate({
      where: { deletedAt: null },
      _sum: { sizeBytes: true },
    });
    return Number(result._sum.sizeBytes ?? 0n);
  },

  getOrganizationPlan(organizationId: string) {
    return prisma.organization.findUnique({ where: { id: organizationId }, select: { plan: true } });
  },

  updateUserAvatar(userId: string, avatarUrl: string) {
    return prisma.user.update({ where: { id: userId }, data: { avatarUrl } });
  },

  getUserAvatar(userId: string) {
    return prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });
  },

  updateOrgLogo(organizationId: string, logoUrl: string) {
    return prisma.organization.update({ where: { id: organizationId }, data: { logoUrl } });
  },
};
