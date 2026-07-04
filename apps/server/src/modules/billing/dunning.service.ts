import { prisma } from "../../database/prisma.js";
import { billingRepository } from "./billing.repository.js";
import { canSubscriptionTransition } from "../subscription/subscription.lifecycle.js";

// 11-Billing.md §6 — dunning schedule for PAST_DUE subscriptions. Real
// recurring-charge auto-retry (re-billing the stored payment method without
// customer action) needs each gateway's own subscriptions API (Razorpay
// Subscriptions / Stripe off-session PaymentIntents) — out of scope here, so
// "retry_payment"/"retry_and_limit" send a notification prompting the
// customer to pay rather than silently re-charging a card.
export const DUNNING_SCHEDULE = [
  { dayAfterFailure: 0, action: "notify_email" as const },
  { dayAfterFailure: 3, action: "retry_payment" as const },
  { dayAfterFailure: 7, action: "retry_payment" as const },
  { dayAfterFailure: 14, action: "retry_and_limit" as const },
  { dayAfterFailure: 21, action: "retry_payment" as const },
  { dayAfterFailure: 30, action: "suspend" as const },
];

type DunningStage = (typeof DUNNING_SCHEDULE)[number];

async function executeDunningAction(
  sub: { id: string; organizationId: string; status: string; product: { name: string; slug: string } },
  stage: DunningStage
): Promise<void> {
  if (stage.action === "suspend") {
    if (canSubscriptionTransition(sub.status as never, "SUSPENDED")) {
      await prisma.subscription.update({ where: { id: sub.id }, data: { status: "SUSPENDED" } });
      await billingRepository.writeAuditLog({
        organizationId: sub.organizationId,
        action: "subscription.suspended",
        resource: "subscription",
        resourceId: sub.id,
      });
    }
    return;
  }

  const owner = await billingRepository.findPrimaryOwner(sub.organizationId);
  if (!owner) return;
  console.log(`[dev] Dunning email to ${owner.email}: payment overdue for ${sub.product.slug} (day ${stage.dayAfterFailure})`);
  await billingRepository.notify({
    organizationId: sub.organizationId,
    userId: owner.id,
    type: `dunning.${stage.action}`,
    title: "Payment overdue",
    body: `Your payment for ${sub.product.name} is overdue. Please update your payment method.`,
    actionUrl: "/dashboard/billing",
  });
}

// Idempotent: dunningStage tracks the next schedule index to process, so
// calling this repeatedly (no real cron in this environment — see
// billing.admin.router.ts) never re-runs a stage twice for the same subscription.
export async function runDunningJob(): Promise<{ processed: number }> {
  const pastDue = await prisma.subscription.findMany({
    where: { status: "PAST_DUE", paymentFailedAt: { not: null } },
    include: { product: true },
  });

  let processed = 0;
  for (const sub of pastDue) {
    const daysSinceFailure = Math.floor((Date.now() - sub.paymentFailedAt!.getTime()) / 86_400_000);
    const stage = DUNNING_SCHEDULE[sub.dunningStage];
    if (!stage || daysSinceFailure < stage.dayAfterFailure) continue;

    await executeDunningAction(sub, stage);
    await prisma.subscription.update({ where: { id: sub.id }, data: { dunningStage: sub.dunningStage + 1, lastDunningActionAt: new Date() } });
    processed++;
  }
  return { processed };
}
