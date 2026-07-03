import type { Prisma } from "@prisma/client";
import { tenantScopedClient } from "../../database/tenant-scope.js";
import { prisma } from "../../database/prisma.js";

const memberInclude = {
  members: {
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
    },
    orderBy: { joinedAt: "asc" as const },
  },
};

export const teamRepository = {
  list(organizationId: string) {
    return tenantScopedClient(organizationId).team.findMany({
      where: { deletedAt: null },
      include: memberInclude,
      orderBy: { createdAt: "asc" },
    });
  },

  findById(organizationId: string, id: string) {
    return tenantScopedClient(organizationId).team.findFirst({
      where: { id, deletedAt: null },
      include: memberInclude,
    });
  },

  create(organizationId: string, data: Omit<Prisma.TeamUncheckedCreateInput, "organizationId">) {
    return tenantScopedClient(organizationId).team.create({
      data: data as Prisma.TeamUncheckedCreateInput,
      include: memberInclude,
    });
  },

  update(organizationId: string, id: string, data: Prisma.TeamUpdateInput) {
    return tenantScopedClient(organizationId).team.update({ where: { id }, data, include: memberInclude });
  },

  softDelete(organizationId: string, id: string) {
    return tenantScopedClient(organizationId).team.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  addMember(teamId: string, userId: string, role: string) {
    return prisma.teamMember.create({
      data: { teamId, userId, role },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
      },
    });
  },

  findMember(teamId: string, userId: string) {
    return prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
  },

  removeMember(teamId: string, userId: string) {
    return prisma.teamMember.delete({ where: { teamId_userId: { teamId, userId } } });
  },

  findActiveMembership(organizationId: string, userId: string) {
    return prisma.orgMembership.findFirst({ where: { organizationId, userId, status: "ACTIVE" } });
  },
};
