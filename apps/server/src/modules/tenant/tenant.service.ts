import type { Organization, Prisma } from "@prisma/client";
import { tenantRepository } from "./tenant.repository.js";
import { assertTransitionAllowed, type TenantStatus } from "./tenant.lifecycle.js";
import { invalidateTenantCache } from "../../middleware/tenantContext.js";
import { provisioningService } from "../provisioning/provisioning.service.js";
import { ConflictError, NotFoundError } from "../../utils/errors.js";
import type { UpdateTenantInput } from "./tenant.schema.js";

const PURGE_RETENTION_DAYS = 60;

export interface LifecycleActor {
  actorId?: string;
  actorType: "USER" | "SYSTEM" | "PLATFORM_ADMIN";
  actorEmail?: string;
  reason?: string;
  ipAddress?: string;
}

async function writeTransitionAudit(
  organizationId: string,
  fromStatus: string,
  toStatus: string,
  actor: LifecycleActor
): Promise<void> {
  await tenantRepository.writeAuditLog({
    organizationId,
    actorId: actor.actorId,
    actorType: actor.actorType,
    actorEmail: actor.actorEmail,
    action: "tenant.status_changed",
    resource: "organization",
    resourceId: organizationId,
    ipAddress: actor.ipAddress,
    before: JSON.stringify({ status: fromStatus }),
    after: JSON.stringify({ status: toStatus, reason: actor.reason }),
    severity: toStatus === "SUSPENDED" || toStatus === "PURGED" ? "WARNING" : "INFO",
  });
}

async function transition(organizationId: string, to: TenantStatus, actor: LifecycleActor): Promise<Organization> {
  const org = await tenantRepository.findById(organizationId);
  if (!org) throw new NotFoundError("Organization not found");

  assertTransitionAllowed(org.status as TenantStatus, to);

  const now = new Date();
  const data: Prisma.OrganizationUpdateInput = { status: to };

  if (to === "SUSPENDED") {
    data.suspendedAt = now;
    data.suspendReason = actor.reason ?? null;
  }
  if (to === "ACTIVE" && org.status === "SUSPENDED") {
    data.suspendedAt = null;
    data.suspendReason = null;
  }
  if (to === "CANCELLED") {
    data.cancelledAt = now;
    data.purgeScheduledAt = new Date(now.getTime() + PURGE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  }
  if (to === "PURGED") {
    data.purgedAt = now;
    data.deletedAt = now;
  }

  const updated = await tenantRepository.update(organizationId, data);
  invalidateTenantCache(organizationId);
  await writeTransitionAudit(organizationId, org.status, to, actor);

  return updated;
}

export const tenantService = {
  toPublicTenant(org: Organization) {
    return {
      id: org.id,
      slug: org.slug,
      name: org.name,
      logoUrl: org.logoUrl,
      industry: org.industry,
      size: org.size,
      country: org.country,
      currency: org.currency,
      timezone: org.timezone,
      billingEmail: org.billingEmail,
      status: org.status,
      plan: org.plan,
      tenancyType: org.tenancyType,
      trialEndsAt: org.trialEndsAt,
      suspendedAt: org.suspendedAt,
      suspendReason: org.suspendReason,
      cancelledAt: org.cancelledAt,
      purgeScheduledAt: org.purgeScheduledAt,
      settings: org.settings ? JSON.parse(org.settings) : null,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  },

  async getTenantById(organizationId: string): Promise<Organization> {
    const org = await tenantRepository.findById(organizationId);
    if (!org) throw new NotFoundError("Organization not found");
    return org;
  },

  async updateTenant(organizationId: string, input: UpdateTenantInput, actor: LifecycleActor): Promise<Organization> {
    const before = await tenantService.getTenantById(organizationId);

    const data: Prisma.OrganizationUpdateInput = { ...input };
    if (input.settings !== undefined) data.settings = JSON.stringify(input.settings);

    const updated = await tenantRepository.update(organizationId, data);
    invalidateTenantCache(organizationId);

    await tenantRepository.writeAuditLog({
      organizationId,
      actorId: actor.actorId,
      actorType: actor.actorType,
      actorEmail: actor.actorEmail,
      action: "tenant.updated",
      resource: "organization",
      resourceId: organizationId,
      ipAddress: actor.ipAddress,
      before: JSON.stringify({ name: before.name, industry: before.industry, size: before.size }),
      after: JSON.stringify(input),
      severity: "INFO",
    });

    return updated;
  },

  listMembers(organizationId: string) {
    return tenantRepository.listMembers(organizationId);
  },

  // PENDING -> TRIALING. Triggered by email verification (see auth.service.verifyEmail).
  async activateTrial(organizationId: string, actor: LifecycleActor): Promise<Organization> {
    let updated = await transition(organizationId, "TRIALING", actor);

    const subscriptions = await tenantRepository.listSubscriptions(organizationId);

    // Organization.trialEndsAt drives trial UI/reminders; each Subscription
    // tracks its own trial window, so surface the one ending soonest.
    const trialEndDates = subscriptions.map((s) => s.trialEndsAt).filter((d): d is Date => d !== null);
    if (trialEndDates.length > 0) {
      const earliestTrialEnd = new Date(Math.min(...trialEndDates.map((d) => d.getTime())));
      updated = await tenantRepository.update(organizationId, { trialEndsAt: earliestTrialEnd });
      invalidateTenantCache(organizationId);
    }

    for (const sub of subscriptions) {
      if (sub.provisioningStatus === "PENDING") {
        void provisioningService.provisionSubscription(sub.id);
      }
    }

    return updated;
  },

  async cancelTenant(organizationId: string, actor: LifecycleActor): Promise<Organization> {
    const updated = await transition(organizationId, "CANCELLED", actor);
    await tenantRepository.cancelSubscriptions(organizationId);
    void provisioningService.suspendOrganizationProducts(organizationId);
    return updated;
  },

  async suspendTenant(organizationId: string, actor: LifecycleActor): Promise<Organization> {
    const updated = await transition(organizationId, "SUSPENDED", actor);
    void provisioningService.suspendOrganizationProducts(organizationId);
    return updated;
  },

  async reactivateTenant(organizationId: string, actor: LifecycleActor): Promise<Organization> {
    return transition(organizationId, "ACTIVE", actor);
  },

  async purgeTenant(organizationId: string, actor: LifecycleActor): Promise<Organization> {
    const org = await tenantService.getTenantById(organizationId);
    if (org.purgeScheduledAt && org.purgeScheduledAt > new Date()) {
      throw new ConflictError(
        `Retention period has not elapsed yet; purge eligible from ${org.purgeScheduledAt.toISOString()}`
      );
    }

    const updated = await transition(organizationId, "PURGED", actor);
    void provisioningService.deprovisionOrganizationProducts(organizationId);
    return updated;
  },
};
