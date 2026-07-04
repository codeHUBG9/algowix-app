import type { Request, Response } from "express";
import { prisma } from "../../database/prisma.js";
import { billingRepository } from "../billing/billing.repository.js";
import { subscriptionRepository } from "./subscription.repository.js";
import { canSubscriptionTransition } from "./subscription.lifecycle.js";
import { sendSuccess } from "../../utils/respond.js";

interface TrialConfig {
  trialEndActions?: {
    gracePeriodDays?: number;
    sendWarningDays?: number[];
    defaultOnExpiry?: "SUSPEND" | "DOWNGRADE_TO_FREE";
  };
}

// 12-Subscriptions.md §2 — no BullMQ/Redis in this environment, so both jobs
// are admin-triggered instead of a real daily cron, same convention as
// billing's runDunningJob and 09's product health-check.
export const subscriptionAdminController = {
  async runTrialExpiry(_req: Request, res: Response) {
    const trialing = await prisma.subscription.findMany({
      where: { status: "TRIALING", trialEndsAt: { not: null } },
      include: { plan: true, product: true },
    });

    let processed = 0;
    for (const sub of trialing) {
      const config: TrialConfig = sub.plan.trialConfig ? JSON.parse(sub.plan.trialConfig) : {};
      const gracePeriodDays = config.trialEndActions?.gracePeriodDays ?? 0;
      const hardLockAt = new Date(sub.trialEndsAt!.getTime() + gracePeriodDays * 86_400_000);
      if (Date.now() < hardLockAt.getTime()) continue;

      const defaultOnExpiry = config.trialEndActions?.defaultOnExpiry ?? "SUSPEND";

      if (defaultOnExpiry === "DOWNGRADE_TO_FREE") {
        const freePlan = await subscriptionRepository.findFreePlanForProduct(sub.productId);
        if (freePlan && freePlan.id !== sub.planId) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { planId: freePlan.id, status: "ACTIVE", trialEndsAt: null, currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 36_500 * 86_400_000) },
          });
          await subscriptionRepository.writeAuditLog({ organizationId: sub.organizationId, action: "subscription.downgraded", resourceId: sub.id });
          processed++;
          continue;
        }
      }

      // SUSPEND per the doc's TrialConfig, mapped to CANCELLED — this schema's
      // lifecycle only allows SUSPENDED as an exit from PAST_DUE, not TRIALING
      // (see subscription.lifecycle.ts / the schema.prisma enum-comment note).
      if (canSubscriptionTransition(sub.status as never, "CANCELLED")) {
        await prisma.subscription.update({ where: { id: sub.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
        await subscriptionRepository.writeAuditLog({ organizationId: sub.organizationId, action: "subscription.cancelled", resourceId: sub.id });
        processed++;
      }
    }

    sendSuccess(res, { processed });
  },

  async sendTrialWarnings(_req: Request, res: Response) {
    const trialing = await prisma.subscription.findMany({
      where: { status: "TRIALING", trialEndsAt: { not: null } },
      include: { plan: true, product: true },
    });

    let sent = 0;
    for (const sub of trialing) {
      const config: TrialConfig = sub.plan.trialConfig ? JSON.parse(sub.plan.trialConfig) : {};
      const warningDays = config.trialEndActions?.sendWarningDays ?? [7, 3, 1];
      const daysLeft = Math.ceil((sub.trialEndsAt!.getTime() - Date.now()) / 86_400_000);
      const matchedDay = [...warningDays, 0].find((d) => d === daysLeft);
      if (matchedDay === undefined) continue;

      const owner = await billingRepository.findPrimaryOwner(sub.organizationId);
      if (!owner) continue;

      const type = `trial_warning_${matchedDay}`;
      if (await billingRepository.hasNotificationOfType(sub.organizationId, owner.id, type)) continue;

      const title = matchedDay === 0 ? "Trial ended" : `Your trial ends in ${matchedDay} day${matchedDay === 1 ? "" : "s"}`;
      console.log(`[dev] Trial warning email to ${owner.email}: ${title} (${sub.product.name})`);
      await billingRepository.notify({
        organizationId: sub.organizationId,
        userId: owner.id,
        type,
        title,
        body: `${title} for your ${sub.product.name} subscription. Upgrade to keep access.`,
        actionUrl: "/dashboard/billing",
      });
      sent++;
    }

    sendSuccess(res, { sent });
  },
};
