import { inviteRepository } from "./invite.repository.js";
import { hashPassword } from "../../services/password.service.js";
import { authService } from "../auth/auth.service.js";
import { notificationService } from "../notification/notification.service.js";
import { NOTIFICATION_TYPES } from "../notification/notification.types.js";
import { webhookService } from "../webhook/webhook.service.js";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../../utils/errors.js";
import type { RequestContext } from "../auth/auth.types.js";
import type { InviteMemberInput, AcceptInviteInput, BulkInviteRow } from "./organization.schema.js";

interface InviterContext {
  userId: string;
  email: string;
}

async function assertSeatAvailable(organizationId: string): Promise<void> {
  const [seatLimit, currentCount] = await Promise.all([
    inviteRepository.maxSeatLimit(organizationId),
    inviteRepository.countActiveOrInvitedMembers(organizationId),
  ]);
  if (seatLimit !== null && currentCount >= seatLimit) {
    throw new ConflictError(`Seat limit reached (${seatLimit}). Upgrade your plan to invite more members.`);
  }
}

async function assertEmailNotTaken(organizationId: string, email: string): Promise<void> {
  const existingInvite = await inviteRepository.findPendingInviteByEmail(organizationId, email);
  if (existingInvite) throw new ConflictError("An invite is already pending for this email");

  const existingUser = await inviteRepository.findUserByEmail(email);
  if (existingUser) {
    const membership = await inviteRepository.findMembership(existingUser.id, organizationId);
    if (membership) throw new ConflictError("This person is already a member of the organization");
  }
}

export const inviteService = {
  async list(organizationId: string) {
    const invites = await inviteRepository.list(organizationId);
    return invites.map((invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    }));
  },

  async create(organizationId: string, input: InviteMemberInput, inviter: InviterContext) {
    const role = await inviteRepository.findRole(organizationId, input.roleId);
    if (!role) throw new NotFoundError("Role not found");

    await assertSeatAvailable(organizationId);
    await assertEmailNotTaken(organizationId, input.email);

    const invite = await inviteRepository.create(organizationId, {
      email: input.email,
      roleId: input.roleId,
      invitedById: inviter.userId,
      message: input.message || null,
    });

    console.log(
      `[dev] Org invite for ${input.email} (POST /api/v1/invites/${invite.token}/accept): https://app.algowix.com/accept-invite?token=${invite.token}`
    );

    // 14-Notifications.md §2 team.user_invited — only fires for an existing
    // account (a brand-new invitee has no user row / notification inbox yet;
    // they learn about the invite via the accept-invite link above).
    const existingUser = await inviteRepository.findUserByEmail(input.email);
    if (existingUser) {
      await notificationService.notify({
        organizationId,
        userId: existingUser.id,
        type: NOTIFICATION_TYPES.USER_INVITED,
        title: "You've been invited to an organization",
        body: `You've been invited to join as ${role.name}.`,
        actionUrl: "/dashboard",
      });
    }

    await inviteRepository.writeAuditLog({
      organizationId,
      actorId: inviter.userId,
      actorEmail: inviter.email,
      action: "invite.created",
      resourceId: invite.id,
    });

    return { inviteId: invite.id, email: invite.email, expiresAt: invite.expiresAt };
  },

  async cancel(organizationId: string, inviteId: string, inviter: InviterContext) {
    const invite = await inviteRepository.findById(organizationId, inviteId);
    if (!invite) throw new NotFoundError("Invite not found");
    if (invite.status !== "PENDING") throw new ConflictError("Only pending invites can be cancelled");

    await inviteRepository.markCancelled(organizationId, inviteId);
    await inviteRepository.writeAuditLog({
      organizationId,
      actorId: inviter.userId,
      actorEmail: inviter.email,
      action: "invite.cancelled",
      resourceId: inviteId,
    });
  },

  async bulkCreate(organizationId: string, rows: BulkInviteRow[], inviter: InviterContext) {
    const results: { email: string; status: "invited" | "skipped"; reason?: string }[] = [];

    for (const row of rows) {
      try {
        const role = await inviteRepository.findRoleByName(organizationId, row.role);
        if (!role) {
          results.push({ email: row.email, status: "skipped", reason: `Unknown role "${row.role}"` });
          continue;
        }

        await assertSeatAvailable(organizationId);
        await assertEmailNotTaken(organizationId, row.email);

        const invite = await inviteRepository.create(organizationId, {
          email: row.email,
          roleId: role.id,
          invitedById: inviter.userId,
        });
        console.log(
          `[dev] Bulk org invite for ${row.email}: https://app.algowix.com/accept-invite?token=${invite.token}`
        );
        results.push({ email: row.email, status: "invited" });
      } catch (err) {
        results.push({ email: row.email, status: "skipped", reason: err instanceof Error ? err.message : "Failed" });
      }
    }

    return results;
  },

  // Dev/test only — see auth.service.getTestVerificationToken for the analogous pattern.
  async getTestInviteToken(email: string): Promise<string> {
    const invite = await inviteRepository.findLatestPendingInviteForEmail(email);
    if (!invite) throw new NotFoundError("No pending invite for this email");
    return invite.token;
  },

  async validateInvite(token: string) {
    const invite = await inviteRepository.findByToken(token);
    if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
      throw new NotFoundError("Invite not found, expired, or already used");
    }

    const role = await inviteRepository.findRole(invite.organizationId, invite.roleId);
    const existingUser = await inviteRepository.findUserByEmail(invite.email);

    return {
      email: invite.email,
      organizationName: invite.organization.name,
      organizationSlug: invite.organization.slug,
      roleName: role?.name ?? "Member",
      expiresAt: invite.expiresAt,
      userExists: existingUser !== null,
    };
  },

  async accept(
    token: string,
    input: AcceptInviteInput,
    authenticatedUser: { userId: string; email: string } | undefined,
    context: RequestContext
  ) {
    const invite = await inviteRepository.findByToken(token);
    if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
      throw new NotFoundError("Invite not found, expired, or already used");
    }

    let userId: string;

    if (authenticatedUser) {
      if (authenticatedUser.email.toLowerCase() !== invite.email.toLowerCase()) {
        throw new ForbiddenError("You are logged in as a different account than this invite was sent to");
      }
      userId = authenticatedUser.userId;
    } else {
      const existingUser = await inviteRepository.findUserByEmail(invite.email);
      if (existingUser) {
        throw new ConflictError("An account with this email already exists. Please log in first, then accept the invite.");
      }
      if (!input.password || !input.firstName || !input.lastName) {
        throw new ValidationError("firstName, lastName, and password are required to create your account");
      }
      const passwordHash = await hashPassword(input.password);
      const user = await inviteRepository.createUser({
        email: invite.email,
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash,
      });
      userId = user.id;
    }

    const existingMembership = await inviteRepository.findMembership(userId, invite.organizationId);
    if (existingMembership) {
      throw new ConflictError("You are already a member of this organization");
    }

    await inviteRepository.createMembership(userId, invite.organizationId, invite.roleId);
    await inviteRepository.markAccepted(invite.id);
    await inviteRepository.writeAuditLog({
      organizationId: invite.organizationId,
      actorId: userId,
      actorEmail: invite.email,
      action: "invite.accepted",
      resourceId: invite.id,
    });

    if (invite.invitedById) {
      await notificationService.notify({
        organizationId: invite.organizationId,
        userId: invite.invitedById,
        type: NOTIFICATION_TYPES.USER_JOINED,
        title: "Invite accepted",
        body: `${invite.email} has joined ${invite.organization.name}.`,
        actionUrl: "/dashboard/members",
      });
    }

    void webhookService.dispatch(invite.organizationId, "user.created", { userId, email: invite.email });

    const tokens = await authService.issueTokensForOrgMember(userId, invite.organizationId, context);
    return { tokens, organization: invite.organization };
  },
};
