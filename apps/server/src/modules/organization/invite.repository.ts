import { randomBytes } from "node:crypto";
import { prisma } from "../../database/prisma.js";
import { tenantScopedClient } from "../../database/tenant-scope.js";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const inviteRepository = {
  generateToken(): string {
    return randomBytes(32).toString("hex");
  },

  findRole(organizationId: string, roleId: string) {
    return prisma.role.findFirst({
      where: { id: roleId, OR: [{ organizationId }, { organizationId: null, isSystem: true }] },
    });
  },

  findRoleByName(organizationId: string, name: string) {
    return prisma.role.findFirst({
      where: { name, OR: [{ organizationId }, { organizationId: null, isSystem: true }] },
    });
  },

  findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findMembership(userId: string, organizationId: string) {
    return prisma.orgMembership.findUnique({ where: { userId_organizationId: { userId, organizationId } } });
  },

  countActiveOrInvitedMembers(organizationId: string) {
    return tenantScopedClient(organizationId).orgMembership.count({
      where: { status: { in: ["ACTIVE", "INVITED"] } },
    });
  },

  // 12-Subscriptions.md §4 — POST /subscriptions/:id/seats raises
  // Subscription.seatCount to buy more seats beyond the plan's default
  // allotment. Before 12, this read plan.maxSeats only, so buying seats had
  // no effect on who could be invited. Fixed to take the larger of
  // seatCount and plan.maxSeats per subscription — never *lower* than the
  // plan's own cap (every subscription starts at the schema's seatCount
  // default of 1, which must not shrink an org's existing invite ceiling),
  // but raised once seats are actually purchased above that.
  maxSeatLimit(organizationId: string) {
    return prisma.subscription
      .findMany({
        where: { organizationId, status: { in: ["TRIALING", "ACTIVE"] } },
        select: { seatCount: true, plan: { select: { maxSeats: true } } },
      })
      .then((subs) => {
        const limits = subs
          .map((s) => (s.plan.maxSeats === null ? null : Math.max(s.seatCount, s.plan.maxSeats)))
          .filter((n): n is number => n !== null);
        return limits.length > 0 ? Math.max(...limits) : null;
      });
  },

  findPendingInviteByEmail(organizationId: string, email: string) {
    return tenantScopedClient(organizationId).orgInvite.findFirst({ where: { email, status: "PENDING" } });
  },

  // Dev/test only — see the route guard in invite-accept.router.ts. Same idea
  // as auth's /auth/test/verification-token: no email provider is wired up.
  findLatestPendingInviteForEmail(email: string) {
    return prisma.orgInvite.findFirst({ where: { email, status: "PENDING" }, orderBy: { createdAt: "desc" } });
  },

  list(organizationId: string) {
    return tenantScopedClient(organizationId)
      .orgInvite.findMany({
        where: { status: "PENDING" },
        include: { organization: { select: { id: true } } },
        orderBy: { createdAt: "desc" },
      })
      .then((invites) =>
        Promise.all(
          invites.map(async (invite) => {
            const role = await prisma.role.findUnique({ where: { id: invite.roleId }, select: { id: true, name: true } });
            return { ...invite, role };
          })
        )
      );
  },

  create(organizationId: string, data: { email: string; roleId: string; invitedById: string; message?: string | null }) {
    const token = inviteRepository.generateToken();
    return tenantScopedClient(organizationId).orgInvite.create({
      data: {
        // organizationId is also auto-injected by the tenant-scope extension,
        // but Prisma's static create-input type still requires it here.
        organizationId,
        email: data.email,
        roleId: data.roleId,
        invitedById: data.invitedById,
        message: data.message ?? null,
        token,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    });
  },

  findByToken(token: string) {
    return prisma.orgInvite.findUnique({
      where: { token },
      include: { organization: true },
    });
  },

  findById(organizationId: string, id: string) {
    return tenantScopedClient(organizationId).orgInvite.findFirst({ where: { id } });
  },

  markCancelled(organizationId: string, id: string) {
    return tenantScopedClient(organizationId).orgInvite.update({ where: { id }, data: { status: "CANCELLED" } });
  },

  markAccepted(id: string) {
    return prisma.orgInvite.update({ where: { id }, data: { status: "ACCEPTED", acceptedAt: new Date() } });
  },

  createUser(data: { email: string; firstName: string; lastName: string; passwordHash: string }) {
    return prisma.user.create({
      data: { ...data, emailVerified: true, emailVerifiedAt: new Date() },
    });
  },

  async createMembership(userId: string, organizationId: string, roleId: string) {
    const hasOtherMembership = await prisma.orgMembership.findFirst({ where: { userId } });
    return prisma.orgMembership.create({
      data: {
        userId,
        organizationId,
        roleId,
        status: "ACTIVE",
        isPrimary: !hasOtherMembership,
      },
    });
  },

  writeAuditLog(entry: { organizationId: string; actorId?: string; actorEmail?: string; action: string; resourceId?: string }) {
    return prisma.auditLog.create({
      data: {
        organizationId: entry.organizationId,
        actorId: entry.actorId,
        actorType: "USER",
        actorEmail: entry.actorEmail,
        action: entry.action,
        resource: "org_invite",
        resourceId: entry.resourceId,
        severity: "INFO",
      },
    });
  },
};
