import { randomBytes } from "node:crypto";
import { authRepository } from "./auth.repository.js";
import { hashPassword, verifyPassword } from "../../services/password.service.js";
import { generateAccessToken } from "../../services/jwt.service.js";
import { generateOpaqueToken, hashToken } from "../../utils/hash-token.js";
import { slugify } from "../../utils/slug.js";
import { UnauthorizedError, ConflictError, ForbiddenError, NotFoundError } from "../../utils/errors.js";
import { env } from "../../config/env.js";
import { tenantService } from "../tenant/tenant.service.js";
import type { RegisterInput, LoginInput, VerifyEmailInput } from "./auth.schema.js";
import type { RequestContext, TokenPair } from "./auth.types.js";
import type { AuthUser, AuthOrganization, LoginResponse } from "@algowix/shared-types";

const MAX_LOGIN_ATTEMPTS = 10;
const LOCK_DURATION_MS = 30 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

type MembershipWithRole = NonNullable<
  Awaited<ReturnType<typeof authRepository.findPrimaryMembership>>
>;

function toAuthUser(user: { id: string; email: string; firstName: string; lastName: string; avatarUrl: string | null; emailVerified: boolean; twoFactorEnabled: boolean }): AuthUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    emailVerified: user.emailVerified,
    twoFactorEnabled: user.twoFactorEnabled,
  };
}

function toAuthOrganization(org: { id: string; slug: string; name: string; plan: string; status: string }): AuthOrganization {
  return { id: org.id, slug: org.slug, name: org.name, plan: org.plan, status: org.status };
}

async function issueTokenPair(
  userId: string,
  organizationId: string,
  context: RequestContext
): Promise<TokenPair> {
  const refreshToken = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await authRepository.createSession({
    userId,
    organizationId,
    refreshTokenHash: hashToken(refreshToken),
    userAgent: context.userAgent,
    ipAddress: context.ipAddress,
    expiresAt,
  });

  const membership = await authRepository.findMembership(userId, organizationId);
  if (!membership) throw new ForbiddenError("No active membership for this organization");

  const accessToken = await generateAccessTokenForMembership(membership);

  return { accessToken, refreshToken, expiresAt };
}

async function generateAccessTokenForMembership(membership: MembershipWithRole): Promise<string> {
  const permissions = membership.role.permissions.map(
    (rp) => `${rp.permission.resource}.${rp.permission.action}`
  );

  return generateAccessToken({
    userId: membership.userId,
    organizationId: membership.organizationId,
    orgSlug: membership.organization.slug,
    email: membership.user.email,
    role: membership.role.name,
    plan: membership.organization.plan,
    permissions,
    sessionId: membership.id,
  });
}

export const authService = {
  // Reused by the invite-accept flow (08-Organization-Management.md §7), which
  // must auto-login the user into the org they just joined, same as register/login.
  issueTokensForOrgMember(userId: string, organizationId: string, context: RequestContext) {
    return issueTokenPair(userId, organizationId, context);
  },


  async register(input: RegisterInput, context: RequestContext) {
    const existing = await authRepository.findUserByEmail(input.email);
    if (existing) throw new ConflictError("An account with this email already exists");

    const baseSlug = slugify(input.organizationName) || "org";
    let slug = baseSlug;
    let suffix = 0;
    while (await authRepository.slugExists(slug)) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    const passwordHash = await hashPassword(input.password);

    const { user, organization } = await authRepository.registerOrganization({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      passwordHash,
      organizationName: input.organizationName,
      slug,
    });

    const verificationToken = randomBytes(32).toString("hex");
    await authRepository.createEmailVerification(
      user.id,
      verificationToken,
      new Date(Date.now() + 24 * 60 * 60 * 1000)
    );
    // TODO: dispatch verification email via notification service (14-Notifications.md)
    console.log(`[dev] Email verification token (POST /api/v1/auth/verify-email {"token":"..."}): ${verificationToken}`);

    const tokens = await issueTokenPair(user.id, organization.id, context);

    const response: LoginResponse = {
      user: toAuthUser(user),
      organization: toAuthOrganization(organization),
      expiresAt: tokens.expiresAt.toISOString(),
    };

    return { response, tokens };
  },

  async login(input: LoginInput, context: RequestContext) {
    const user = await authRepository.findUserByEmail(input.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError("Invalid credentials");
    }

    if (user.status !== "ACTIVE") {
      throw new UnauthorizedError("This account is not active");
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedError("Account is temporarily locked due to failed login attempts");
    }

    const validPassword = await verifyPassword(user.passwordHash, input.password);
    if (!validPassword) {
      const attempts = user.loginAttempts + 1;
      const lockedUntil = attempts >= MAX_LOGIN_ATTEMPTS ? new Date(Date.now() + LOCK_DURATION_MS) : null;
      await authRepository.recordLoginFailure(user.id, attempts, lockedUntil);
      throw new UnauthorizedError("Invalid credentials");
    }

    const membership = input.organizationSlug
      ? await (async () => {
          const org = await authRepository.findOrgBySlug(input.organizationSlug!);
          if (!org) return null;
          return authRepository.findMembership(user.id, org.id);
        })()
      : await authRepository.findPrimaryMembership(user.id);

    if (!membership) {
      throw new ForbiddenError("No organization membership found for this account");
    }

    await authRepository.recordLoginSuccess(user.id, context.ipAddress);

    const tokens = await issueTokenPair(user.id, membership.organizationId, context);

    const response: LoginResponse = {
      user: toAuthUser(user),
      organization: toAuthOrganization(membership.organization),
      expiresAt: tokens.expiresAt.toISOString(),
    };

    return { response, tokens };
  },

  async refresh(refreshToken: string, context: RequestContext): Promise<TokenPair> {
    const incomingHash = hashToken(refreshToken);
    const session = await authRepository.findActiveSessionByHash(incomingHash);

    if (!session) {
      // Check if this hash was already rotated away — indicates token theft/reuse.
      const staleSession = await authRepository.findSessionByReplacedHash(incomingHash);
      if (staleSession) {
        await authRepository.revokeAllUserSessions(staleSession.userId);
        throw new UnauthorizedError("Session security violation detected. Please log in again.");
      }
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    if (session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    const newRefreshToken = generateOpaqueToken();
    const newHash = hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await authRepository.revokeSession(session.id, newHash);
    await authRepository.createSession({
      userId: session.userId,
      organizationId: session.organizationId ?? undefined,
      refreshTokenHash: newHash,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      expiresAt,
    });

    if (!session.organizationId) {
      throw new ForbiddenError("Session is missing organization context");
    }

    const membership = await authRepository.findMembership(session.userId, session.organizationId);
    if (!membership) throw new ForbiddenError("No active membership for this organization");

    const accessToken = await generateAccessTokenForMembership(membership);

    return { accessToken, refreshToken: newRefreshToken, expiresAt };
  },

  async verifyEmail(input: VerifyEmailInput): Promise<void> {
    const verification = await authRepository.findEmailVerificationByToken(input.token);
    if (!verification || verification.usedAt || verification.expiresAt < new Date()) {
      throw new NotFoundError("Invalid or expired verification token");
    }

    await authRepository.markEmailVerified(verification.userId, verification.id);

    const membership = await authRepository.findPrimaryMembership(verification.userId);
    if (membership) {
      // PENDING -> TRIALING per 07-Tenant-Management.md §2; also kicks off product provisioning.
      await tenantService.activateTrial(membership.organizationId, {
        actorType: "SYSTEM",
        actorId: verification.userId,
      });
    }
  },

  // Dev/test only — see the route guard in auth.router.ts. Lets .http request
  // collections and the E2E suite complete the verify-email flow without an
  // email provider or scraping server stdout for the console-logged token.
  async getTestVerificationToken(email: string): Promise<string> {
    const verification = await authRepository.findLatestVerificationTokenForEmail(email);
    if (!verification) throw new NotFoundError("No pending verification token for this email");
    return verification.token;
  },

  // 08-Organization-Management.md §9 — Multi-Organization Support.
  async listMyOrganizations(userId: string) {
    const memberships = await authRepository.listMembershipsForUser(userId);
    return memberships.map((m) => ({
      organization: toAuthOrganization(m.organization),
      role: m.role.name,
      isPrimary: m.isPrimary,
    }));
  },

  async switchOrganization(userId: string, organizationId: string, context: RequestContext) {
    const membership = await authRepository.findMembership(userId, organizationId);
    if (!membership || membership.status !== "ACTIVE") {
      throw new ForbiddenError("You are not an active member of this organization");
    }

    const tokens = await issueTokenPair(userId, organizationId, context);
    return {
      response: {
        organization: toAuthOrganization(membership.organization),
        expiresAt: tokens.expiresAt.toISOString(),
      },
      tokens,
    };
  },

  async setPrimaryOrganization(userId: string, organizationId: string): Promise<void> {
    const membership = await authRepository.findMembership(userId, organizationId);
    if (!membership) throw new ForbiddenError("You are not a member of this organization");
    await authRepository.setPrimaryMembership(userId, organizationId);
  },

  async logout(refreshToken: string): Promise<void> {
    const session = await authRepository.findActiveSessionByHash(hashToken(refreshToken));
    if (session) {
      await authRepository.revokeSession(session.id);
    }
  },

  async listSessions(userId: string) {
    return authRepository.listActiveSessions(userId);
  },
};
