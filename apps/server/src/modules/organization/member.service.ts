import { memberRepository } from "./member.repository.js";
import { ConflictError, NotFoundError, ValidationError } from "../../utils/errors.js";
import { invalidateTenantCache } from "../../middleware/tenantContext.js";
import type { MemberQueryInput, UpdateMemberStatusInput } from "./organization.schema.js";
import type { LifecycleActor } from "../tenant/tenant.service.js";

type MembershipRow = Awaited<ReturnType<typeof memberRepository.findById>>;

function toPublicMember(m: NonNullable<MembershipRow>, productAccess: string[]) {
  return {
    id: m.id,
    userId: m.user.id,
    firstName: m.user.firstName,
    lastName: m.user.lastName,
    email: m.user.email,
    avatarUrl: m.user.avatarUrl,
    role: m.role,
    status: m.status,
    isPrimary: m.isPrimary,
    joinedAt: m.joinedAt,
    lastLoginAt: m.user.lastLoginAt,
    productAccess,
  };
}

export const memberService = {
  async list(organizationId: string, query: MemberQueryInput) {
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.roleId) where.roleId = query.roleId;
    if (query.search) {
      where.user = {
        OR: [
          { email: { contains: query.search } },
          { firstName: { contains: query.search } },
          { lastName: { contains: query.search } },
        ],
      };
    }

    const [{ items, total }, productAccess] = await Promise.all([
      memberRepository.list(organizationId, where, query.page, query.limit),
      memberRepository.listActiveSubscriptionProductSlugs(organizationId),
    ]);

    return {
      items: items.map((m) => toPublicMember(m, productAccess)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  },

  async updateStatus(
    organizationId: string,
    userId: string,
    input: UpdateMemberStatusInput,
    actor: LifecycleActor
  ) {
    const membership = await memberRepository.findById(organizationId, userId);
    if (!membership) throw new NotFoundError("Member not found");

    if (input.status === "SUSPENDED" && membership.role.name === "Owner") {
      const ownerCount = await memberRepository.countActiveOwners(organizationId);
      if (ownerCount <= 1) throw new ConflictError("Cannot suspend the organization's only Owner");
    }

    await memberRepository.updateStatus(organizationId, userId, input.status);

    if (input.status === "SUSPENDED") {
      await memberRepository.revokeSessionsForUserInOrg(userId, organizationId);
    }

    await memberRepository.writeAuditLog({
      organizationId,
      actorId: actor.actorId,
      actorType: actor.actorType,
      actorEmail: actor.actorEmail,
      action: "member.status_changed",
      resource: "org_membership",
      resourceId: membership.id,
      ipAddress: actor.ipAddress,
      before: JSON.stringify({ status: membership.status }),
      after: JSON.stringify({ status: input.status, reason: input.reason }),
      severity: input.status === "SUSPENDED" ? "WARNING" : "INFO",
    });

    invalidateTenantCache(organizationId);

    const refreshed = await memberRepository.findById(organizationId, userId);
    const productAccess = await memberRepository.listActiveSubscriptionProductSlugs(organizationId);
    return toPublicMember(refreshed!, productAccess);
  },

  // 13-RBAC.md §7 — PATCH /organizations/:id/members/:userId/role, gated on
  // roles.assign at the router. Reuses the same "don't demote the only Owner"
  // guard updateStatus/remove already enforce, applied to a role *change* away
  // from Owner rather than a status/removal change.
  async updateRole(organizationId: string, userId: string, roleId: string, actor: LifecycleActor) {
    const membership = await memberRepository.findById(organizationId, userId);
    if (!membership) throw new NotFoundError("Member not found");

    const role = await memberRepository.findRoleForOrg(organizationId, roleId);
    if (!role) throw new NotFoundError("Role not found");

    if (membership.role.name === "Owner" && role.name !== "Owner") {
      const ownerCount = await memberRepository.countActiveOwners(organizationId);
      if (ownerCount <= 1) throw new ConflictError("Cannot change the organization's only Owner's role");
    }

    await memberRepository.updateRole(organizationId, userId, roleId);

    await memberRepository.writeAuditLog({
      organizationId,
      actorId: actor.actorId,
      actorType: actor.actorType,
      actorEmail: actor.actorEmail,
      action: "member.role_changed",
      resource: "org_membership",
      resourceId: membership.id,
      ipAddress: actor.ipAddress,
      before: JSON.stringify({ roleId: membership.roleId }),
      after: JSON.stringify({ roleId }),
      severity: "INFO",
    });

    invalidateTenantCache(organizationId);

    const refreshed = await memberRepository.findById(organizationId, userId);
    const productAccess = await memberRepository.listActiveSubscriptionProductSlugs(organizationId);
    return toPublicMember(refreshed!, productAccess);
  },

  async remove(organizationId: string, userId: string, actor: LifecycleActor) {
    const membership = await memberRepository.findById(organizationId, userId);
    if (!membership) throw new NotFoundError("Member not found");

    if (membership.role.name === "Owner") {
      const ownerCount = await memberRepository.countActiveOwners(organizationId);
      if (ownerCount <= 1) throw new ValidationError("Cannot remove the organization's only Owner");
    }

    await memberRepository.remove(organizationId, userId);
    await memberRepository.revokeSessionsForUserInOrg(userId, organizationId);

    await memberRepository.writeAuditLog({
      organizationId,
      actorId: actor.actorId,
      actorType: actor.actorType,
      actorEmail: actor.actorEmail,
      action: "member.removed",
      resource: "org_membership",
      resourceId: membership.id,
      ipAddress: actor.ipAddress,
      severity: "WARNING",
    });
  },
};
