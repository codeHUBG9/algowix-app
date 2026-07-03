import { prisma } from "../../database/prisma.js";
import { env } from "../../config/env.js";
import type { ProvisionRequest, ProvisionResponse } from "./provisioning.types.js";

// 07-Tenant-Management.md §4.2 — 3 retries, exponential backoff (1m, 5m, 15m).
// Overridable via PROVISION_RETRY_DELAYS_MS for local dev/tests so a failed
// call (expected in dev — no product servers actually run) doesn't block
// the process for ~21 minutes.
const RETRY_DELAYS_MS = env.PROVISION_RETRY_DELAYS_MS.split(",").map(Number);
const REQUEST_TIMEOUT_MS = 10_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callProductEndpoint<T>(baseUrl: string, path: string, body: unknown): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`${path} responded with HTTP ${res.status}`);
  }

  return (await res.json()) as T;
}

export const provisioningService = {
  // Idempotent by design (§4.2) — safe to call again for a subscription
  // that already failed or is mid-retry.
  async provisionSubscription(subscriptionId: string): Promise<void> {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { organization: true, product: true, plan: true },
    });
    if (!subscription || subscription.provisioningStatus === "PROVISIONED") return;

    const owner = await prisma.orgMembership.findFirst({
      where: { organizationId: subscription.organizationId, isPrimary: true },
      include: { user: true },
    });

    const payload: ProvisionRequest = {
      tenantId: subscription.organizationId,
      organizationName: subscription.organization.name,
      organizationSlug: subscription.organization.slug,
      billingEmail: subscription.organization.billingEmail,
      plan: subscription.plan.slug,
      planFeatures: JSON.parse(subscription.plan.features),
      planLimits: JSON.parse(subscription.plan.limits),
      adminUser: owner
        ? {
            userId: owner.userId,
            email: owner.user.email,
            firstName: owner.user.firstName,
            lastName: owner.user.lastName,
          }
        : undefined,
      timezone: subscription.organization.timezone,
      currency: subscription.organization.currency,
      country: subscription.organization.country,
      provisionedAt: new Date().toISOString(),
    };

    const totalAttempts = RETRY_DELAYS_MS.length + 1;
    for (let attempt = subscription.provisionAttempts; attempt < totalAttempts; attempt++) {
      try {
        const result = await callProductEndpoint<ProvisionResponse>(
          subscription.product.baseUrl,
          `${subscription.product.contractApiPath}/provision`,
          payload
        );

        await prisma.subscription.update({
          where: { id: subscriptionId },
          data: {
            provisioningStatus: "PROVISIONED",
            providerTenantId: result.tenantId ?? subscription.organizationId,
            tenantUrl: result.tenantUrl ?? null,
            adminLoginUrl: result.adminLoginUrl ?? null,
            provisionedAt: new Date(),
            provisionAttempts: attempt + 1,
            lastProvisionError: null,
          },
        });
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const isLastAttempt = attempt === totalAttempts - 1;

        await prisma.subscription.update({
          where: { id: subscriptionId },
          data: {
            provisionAttempts: attempt + 1,
            lastProvisionError: message,
            provisioningStatus: isLastAttempt ? "FAILED" : "PENDING",
          },
        });

        if (isLastAttempt) {
          console.error(
            `[provisioning] ${subscription.product.slug} provisioning failed for org ${subscription.organizationId} after ${attempt + 1} attempts: ${message}`
          );
          return;
        }

        // isLastAttempt is false here, so attempt is always < RETRY_DELAYS_MS.length.
        const delayMs = RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1] ?? 60_000;
        console.warn(
          `[provisioning] attempt ${attempt + 1} failed for ${subscription.product.slug}/${subscription.organizationId}: ${message}. Retrying in ${delayMs / 1000}s`
        );
        await sleep(delayMs);
      }
    }
  },

  // Best-effort, single attempt — §6.1 doesn't specify a retry protocol for
  // suspend the way §4.2 does for provisioning.
  async suspendOrganizationProducts(organizationId: string): Promise<void> {
    const subscriptions = await prisma.subscription.findMany({
      where: { organizationId, provisioningStatus: "PROVISIONED" },
      include: { product: true },
    });

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await callProductEndpoint(sub.product.baseUrl, `${sub.product.contractApiPath}/suspend`, {
            tenantId: organizationId,
          });
        } catch (err) {
          console.error(
            `[provisioning] suspend call failed for ${sub.product.slug}/${organizationId}:`,
            err instanceof Error ? err.message : err
          );
        }
      })
    );
  },

  // §6.2 — deletes tenant data in every subscribed product.
  async deprovisionOrganizationProducts(organizationId: string): Promise<void> {
    const subscriptions = await prisma.subscription.findMany({
      where: { organizationId },
      include: { product: true },
    });

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await callProductEndpoint(sub.product.baseUrl, `${sub.product.contractApiPath}/deprovision`, {
            tenantId: organizationId,
          });
        } catch (err) {
          console.error(
            `[provisioning] deprovision call failed for ${sub.product.slug}/${organizationId}:`,
            err instanceof Error ? err.message : err
          );
        }
      })
    );
  },
};
