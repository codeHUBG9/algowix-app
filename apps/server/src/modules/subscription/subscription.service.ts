import type { Organization, ProductPlan, Subscription } from "@prisma/client";
import { prisma } from "../../database/prisma.js";
import { subscriptionRepository } from "./subscription.repository.js";
import { productRepository } from "../product/product.repository.js";
import { billingRepository } from "../billing/billing.repository.js";
import { billingService } from "../billing/billing.service.js";
import { assertSubscriptionTransitionAllowed, canSubscriptionTransition, type SubscriptionStatus } from "./subscription.lifecycle.js";
import { ConflictError, NotFoundError, ValidationError } from "../../utils/errors.js";
import type { CreateSubscriptionInput, UpgradeSubscriptionInput, DowngradeSubscriptionInput, UpdateSeatsInput, CancelSubscriptionInput } from "./subscription.schema.js";

interface Actor {
  userId: string;
  email: string;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function toPublic(sub: Subscription & { plan: ProductPlan; product: { slug: string; name: string } }) {
  return {
    id: sub.id,
    productSlug: sub.product.slug,
    productName: sub.product.name,
    planId: sub.planId,
    planSlug: sub.plan.slug,
    planName: sub.plan.name,
    status: sub.status,
    seatCount: sub.seatCount,
    maxSeats: sub.plan.maxSeats,
    billingCycle: sub.billingCycle,
    trialEndsAt: sub.trialEndsAt,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    createdAt: sub.createdAt,
  };
}

// Doc's proration formula (11-Billing.md §3): credit = currentPlanDailyRate x
// daysLeft, newCharge = newPlanPrice - credit. A 30-day month is used for the
// daily rate — good enough for this scope, not calendar-exact.
function prorate(currentPlan: ProductPlan, newPlan: ProductPlan, billingCycle: string, currentPeriodEnd: Date): number {
  const currentPrice = billingCycle === "ANNUAL" ? Number(currentPlan.annualPrice ?? Number(currentPlan.monthlyPrice) * 12) : Number(currentPlan.monthlyPrice);
  const newPrice = billingCycle === "ANNUAL" ? Number(newPlan.annualPrice ?? Number(newPlan.monthlyPrice) * 12) : Number(newPlan.monthlyPrice);
  const periodDays = billingCycle === "ANNUAL" ? 365 : 30;
  const daysLeft = Math.max(0, Math.min(periodDays, (currentPeriodEnd.getTime() - Date.now()) / 86_400_000));
  const dailyRate = currentPrice / periodDays;
  const credit = round2(dailyRate * daysLeft);
  return round2(newPrice - credit);
}

async function resolvePlanChange(organizationId: string, subscriptionId: string, newPlanSlug: string) {
  const subscription = await subscriptionRepository.findById(organizationId, subscriptionId);
  if (!subscription) throw new NotFoundError("Subscription not found");
  if (subscription.status === "CANCELLED") throw new ConflictError("This subscription is cancelled");

  const product = await productRepository.findBySlug(subscription.product.slug);
  const newPlan = product?.plans.find((p) => p.slug === newPlanSlug);
  if (!newPlan) throw new NotFoundError("Plan not found");
  if (newPlan.id === subscription.planId) throw new ConflictError("Already on this plan");

  return { subscription, newPlan };
}

async function applyPlanChange(
  organization: Organization,
  subscription: Subscription & { plan: ProductPlan; product: { slug: string; name: string } },
  newPlan: ProductPlan,
  actor: Actor,
  auditAction: "subscription.upgraded" | "subscription.downgraded"
) {
  // Still on a trial / never actually paid yet — just swap the plan, no charge.
  if (subscription.status === "TRIALING" || subscription.status === "INCOMPLETE") {
    await subscriptionRepository.updatePlanAndPeriod(subscription.id, { planId: newPlan.id });
    await subscriptionRepository.writeAuditLog({
      organizationId: organization.id,
      actorId: actor.userId,
      actorEmail: actor.email,
      action: auditAction,
      resourceId: subscription.id,
    });
    return {
      invoiceId: null,
      orderId: "no-payment-required",
      amount: 0,
      currency: organization.currency,
      gatewayProvider: "MOCK",
      checkoutKey: null,
      prefill: { email: organization.billingEmail, name: organization.name },
    };
  }

  const proratedAmount = prorate(subscription.plan, newPlan, subscription.billingCycle, subscription.currentPeriodEnd);
  const chargeAmount = Math.max(0, proratedAmount);
  const creditOwed = proratedAmount < 0 ? round2(-proratedAmount) : 0;

  // Immediate effect per 11-Billing.md §3 — plan changes before the payment resolves.
  await subscriptionRepository.updatePlanAndPeriod(subscription.id, { planId: newPlan.id });

  const chargeResult = await billingService.chargeSubscription({
    organization,
    subscription: { ...subscription, plan: newPlan } as never,
    amount: chargeAmount,
    billingCycle: subscription.billingCycle,
    periodStart: new Date(),
    periodEnd: subscription.currentPeriodEnd,
    description: `Plan change to ${newPlan.name} (prorated)`,
    actor,
  });

  if (creditOwed > 0) {
    await billingRepository.issueCredit(organization.id, creditOwed, `Proration credit from downgrade to ${newPlan.name}`, addDays(new Date(), 365));
  }

  await subscriptionRepository.writeAuditLog({
    organizationId: organization.id,
    actorId: actor.userId,
    actorEmail: actor.email,
    action: auditAction,
    resourceId: subscription.id,
  });

  return { ...chargeResult, invoiceId: chargeResult.invoiceId as string | null };
}

export const subscriptionService = {
  async list(organizationId: string) {
    const subs = await subscriptionRepository.findAll(organizationId);
    return subs.map(toPublic);
  },

  async getById(organizationId: string, id: string) {
    const sub = await subscriptionRepository.findById(organizationId, id);
    if (!sub) throw new NotFoundError("Subscription not found");
    return toPublic(sub);
  },

  async create(organization: Organization, actor: Actor, input: CreateSubscriptionInput) {
    const product = await productRepository.findBySlug(input.productSlug);
    if (!product || !product.isActive) throw new NotFoundError("Product not found");
    const plan = product.plans.find((p) => p.slug === input.planSlug);
    if (!plan) throw new NotFoundError("Plan not found");

    const existing = await subscriptionRepository.findByOrgAndProduct(organization.id, product.id);
    if (existing) throw new ConflictError("A subscription already exists for this product");

    const now = new Date();
    const trialEnd = addDays(now, plan.trialDays);
    const subscription = await prisma.subscription.create({
      data: {
        organizationId: organization.id,
        productId: product.id,
        planId: plan.id,
        status: "TRIALING",
        trialStartsAt: now,
        trialEndsAt: trialEnd,
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
      },
      include: { plan: true, product: true },
    });

    await subscriptionRepository.writeAuditLog({
      organizationId: organization.id,
      actorId: actor.userId,
      actorEmail: actor.email,
      action: "subscription.created",
      resourceId: subscription.id,
    });

    return toPublic(subscription);
  },

  async upgrade(organization: Organization, actor: Actor, id: string, input: UpgradeSubscriptionInput) {
    const { subscription, newPlan } = await resolvePlanChange(organization.id, id, input.newPlanSlug);
    if (Number(newPlan.monthlyPrice) <= Number(subscription.plan.monthlyPrice)) {
      throw new ValidationError("Use the downgrade endpoint to move to a lower-priced plan");
    }
    return applyPlanChange(organization, subscription, newPlan, actor, "subscription.upgraded");
  },

  async downgrade(organization: Organization, actor: Actor, id: string, input: DowngradeSubscriptionInput) {
    const { subscription, newPlan } = await resolvePlanChange(organization.id, id, input.newPlanSlug);
    if (Number(newPlan.monthlyPrice) > Number(subscription.plan.monthlyPrice)) {
      throw new ValidationError("Use the upgrade endpoint to move to a higher-priced plan");
    }
    return applyPlanChange(organization, subscription, newPlan, actor, "subscription.downgraded");
  },

  async cancel(organization: Organization, actor: Actor, id: string, input: CancelSubscriptionInput) {
    const subscription = await subscriptionRepository.findById(organization.id, id);
    if (!subscription) throw new NotFoundError("Subscription not found");

    const immediately = input.immediately !== false;
    if (!immediately) {
      await prisma.subscription.update({ where: { id }, data: { cancelAtPeriodEnd: true } });
    } else {
      assertSubscriptionTransitionAllowed(subscription.status as SubscriptionStatus, "CANCELLED");
      await subscriptionRepository.updateStatus(id, "CANCELLED", { cancelledAt: new Date(), cancelAtPeriodEnd: true });
    }

    await subscriptionRepository.writeAuditLog({
      organizationId: organization.id,
      actorId: actor.userId,
      actorEmail: actor.email,
      action: "subscription.cancelled",
      resourceId: id,
    });

    return subscriptionService.getById(organization.id, id);
  },

  async reactivate(organization: Organization, actor: Actor, id: string) {
    const subscription = await subscriptionRepository.findById(organization.id, id);
    if (!subscription) throw new NotFoundError("Subscription not found");
    if (!canSubscriptionTransition(subscription.status as SubscriptionStatus, "ACTIVE")) {
      throw new ConflictError(`Cannot reactivate a subscription from ${subscription.status}`);
    }

    const now = new Date();
    const periodEnd = subscription.billingCycle === "ANNUAL" ? addDays(now, 365) : addDays(now, 30);
    const amount = subscription.billingCycle === "ANNUAL" ? Number(subscription.plan.annualPrice ?? Number(subscription.plan.monthlyPrice) * 12) : Number(subscription.plan.monthlyPrice);

    const result = await billingService.chargeSubscription({
      organization,
      subscription,
      amount,
      billingCycle: subscription.billingCycle,
      periodStart: now,
      periodEnd,
      description: `Reactivation — ${subscription.plan.name} plan`,
      actor,
    });

    await subscriptionRepository.writeAuditLog({
      organizationId: organization.id,
      actorId: actor.userId,
      actorEmail: actor.email,
      action: "subscription.reactivated",
      resourceId: id,
    });

    return result;
  },

  async usage(organizationId: string, id: string) {
    const subscription = await subscriptionRepository.findById(organizationId, id);
    if (!subscription) throw new NotFoundError("Subscription not found");
    const seatsUsed = await subscriptionRepository.countActiveSeats(organizationId);
    return { seatsUsed, seatLimit: subscription.plan.maxSeats, seatCount: subscription.seatCount };
  },

  async history(organizationId: string, id: string) {
    const subscription = await subscriptionRepository.findById(organizationId, id);
    if (!subscription) throw new NotFoundError("Subscription not found");
    const entries = await subscriptionRepository.history(organizationId, id);
    return entries.map((e) => ({ id: e.id, action: e.action, createdAt: e.createdAt }));
  },

  async updateSeats(organization: Organization, actor: Actor, id: string, input: UpdateSeatsInput) {
    const subscription = await subscriptionRepository.findById(organization.id, id);
    if (!subscription) throw new NotFoundError("Subscription not found");
    if (subscription.plan.maxSeats !== null && input.seatCount > subscription.plan.maxSeats) {
      throw new ValidationError(`This plan allows a maximum of ${subscription.plan.maxSeats} seats`);
    }

    await subscriptionRepository.updateSeatCount(id, input.seatCount);
    await subscriptionRepository.writeAuditLog({
      organizationId: organization.id,
      actorId: actor.userId,
      actorEmail: actor.email,
      action: "subscription.seats_updated",
      resourceId: id,
    });

    return subscriptionService.getById(organization.id, id);
  },
};
