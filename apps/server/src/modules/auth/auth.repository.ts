import { prisma } from "../../database/prisma.js";

export const authRepository = {
  findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findOrgBySlug(slug: string) {
    return prisma.organization.findUnique({ where: { slug } });
  },

  async slugExists(slug: string): Promise<boolean> {
    const org = await prisma.organization.findUnique({ where: { slug }, select: { id: true } });
    return org !== null;
  },

  findSystemRoleByName(name: string) {
    return prisma.role.findFirst({ where: { name, isSystem: true, organizationId: null } });
  },

  findMembership(userId: string, organizationId: string) {
    return prisma.orgMembership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      include: {
        organization: true,
        user: { select: { email: true } },
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });
  },

  findPrimaryMembership(userId: string) {
    return prisma.orgMembership.findFirst({
      where: { userId, status: "ACTIVE" },
      orderBy: { isPrimary: "desc" },
      include: {
        organization: true,
        user: { select: { email: true } },
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });
  },

  createSession(data: {
    userId: string;
    organizationId?: string;
    refreshTokenHash: string;
    userAgent?: string;
    ipAddress?: string;
    expiresAt: Date;
  }) {
    return prisma.session.create({ data });
  },

  findActiveSessionByHash(refreshTokenHash: string) {
    return prisma.session.findUnique({ where: { refreshTokenHash } });
  },

  findSessionByReplacedHash(replacedByHash: string) {
    return prisma.session.findFirst({ where: { replacedByHash } });
  },

  revokeSession(id: string, replacedByHash?: string) {
    return prisma.session.update({
      where: { id },
      data: { revokedAt: new Date(), replacedByHash },
    });
  },

  revokeAllUserSessions(userId: string) {
    return prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  listActiveSessions(userId: string) {
    return prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastActiveAt: "desc" },
    });
  },

  recordLoginSuccess(userId: string, ip: string | undefined) {
    return prisma.user.update({
      where: { id: userId },
      data: { loginAttempts: 0, lastLoginAt: new Date(), lastLoginIp: ip },
    });
  },

  recordLoginFailure(userId: string, attempts: number, lockedUntil: Date | null) {
    return prisma.user.update({
      where: { id: userId },
      data: { loginAttempts: attempts, lockedUntil },
    });
  },

  createEmailVerification(userId: string, token: string, expiresAt: Date) {
    return prisma.emailVerification.create({ data: { userId, token, expiresAt } });
  },

  findEmailVerificationByToken(token: string) {
    return prisma.emailVerification.findUnique({ where: { token } });
  },

  findLatestVerificationTokenForEmail(email: string) {
    return prisma.emailVerification.findFirst({
      where: { user: { email }, usedAt: null },
      orderBy: { createdAt: "desc" },
    });
  },

  async markEmailVerified(userId: string, verificationId: string): Promise<void> {
    await prisma.$transaction([
      prisma.emailVerification.update({ where: { id: verificationId }, data: { usedAt: new Date() } }),
      prisma.user.update({
        where: { id: userId },
        data: { emailVerified: true, emailVerifiedAt: new Date() },
      }),
    ]);
  },

  async registerOrganization(input: {
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
    organizationName: string;
    slug: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          passwordHash: input.passwordHash,
        },
      });

      const organization = await tx.organization.create({
        data: {
          slug: input.slug,
          name: input.organizationName,
          country: "IN",
          billingEmail: input.email,
        },
      });

      const ownerRole = await tx.role.findFirst({
        where: { name: "Owner", isSystem: true, organizationId: null },
      });
      if (!ownerRole) {
        throw new Error("System role 'Owner' is not seeded. Run prisma:seed first.");
      }

      const membership = await tx.orgMembership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          roleId: ownerRole.id,
          isPrimary: true,
        },
      });

      const starterPlan = await tx.productPlan.findFirst({
        where: { product: { slug: "crm" }, slug: "free" },
      });

      if (starterPlan) {
        const now = new Date();
        const trialEnd = new Date(now.getTime() + starterPlan.trialDays * 24 * 60 * 60 * 1000);
        await tx.subscription.create({
          data: {
            organizationId: organization.id,
            productId: starterPlan.productId,
            planId: starterPlan.id,
            status: "TRIALING",
            trialStartsAt: now,
            trialEndsAt: trialEnd,
            currentPeriodStart: now,
            currentPeriodEnd: trialEnd,
          },
        });
      }

      return { user, organization, membership };
    });
  },
};
