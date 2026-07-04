import type { Coupon, Organization, Product, ProductPlan, Subscription } from "@prisma/client";
import { prisma } from "../../database/prisma.js";
import { billingRepository } from "./billing.repository.js";
import { productRepository } from "../product/product.repository.js";
import { calculateGST } from "./tax.service.js";
import { nextInvoiceNumber } from "./invoice-number.service.js";
import { generateInvoicePdf } from "./invoice-pdf.service.js";
import { selectGateway } from "./gateway/index.js";
import type { GatewayWebhookEvent } from "./gateway/payment-gateway.types.js";
import { assertSubscriptionTransitionAllowed, canSubscriptionTransition } from "../subscription/subscription.lifecycle.js";
import { provisioningService } from "../provisioning/provisioning.service.js";
import { ConflictError, NotFoundError, ValidationError } from "../../utils/errors.js";
import { NOTIFICATION_TYPES } from "../notification/notification.types.js";
import { webhookService } from "../webhook/webhook.service.js";
import type { CheckoutInput, InvoiceQueryInput, RefundInvoiceInput } from "./billing.schema.js";

type SubscriptionWithRelations = Subscription & { plan: ProductPlan; product: Product };

interface Actor {
  userId: string;
  email: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function computeDiscount(coupon: Coupon, baseAmount: number): number {
  if (coupon.type === "PERCENTAGE") return round2(baseAmount * (Number(coupon.value) / 100));
  return Math.min(Number(coupon.value), baseAmount);
}

async function assertCouponUsable(coupon: Coupon | null, productSlug: string, organizationId: string, baseAmount: number): Promise<void> {
  if (!coupon) throw new ValidationError("Invalid or expired coupon code");
  const now = new Date();
  if (!coupon.isActive || now < coupon.validFrom || now > coupon.validUntil) {
    throw new ValidationError("This coupon is no longer valid");
  }
  if (coupon.maxUses !== null && coupon.currentUses >= coupon.maxUses) {
    throw new ValidationError("This coupon has reached its usage limit");
  }
  if (coupon.minOrderAmount !== null && baseAmount < Number(coupon.minOrderAmount)) {
    throw new ValidationError(`This coupon requires a minimum order of ${coupon.minOrderAmount}`);
  }
  if (coupon.appliesTo === "PRODUCTS") {
    const slugs = coupon.appliesToProducts ? (JSON.parse(coupon.appliesToProducts) as string[]) : [];
    if (!slugs.includes(productSlug)) throw new ValidationError("This coupon doesn't apply to this product");
  }
  if (await billingRepository.hasOrgRedeemedCoupon(coupon.id, organizationId)) {
    throw new ValidationError("This coupon has already been used by your organization");
  }
}

// Spends available credit (oldest-expiring first) up to `amount`. Deducted at
// invoice-creation time (checkout/upgrade/downgrade), not at payment-success —
// a subsequent payment retry on the same OPEN invoice reuses the same
// creditApplied figure rather than re-spending credit on every retry.
async function consumeCredits(credits: { id: string; remainingAmount: unknown }[], amount: number): Promise<void> {
  let remaining = amount;
  for (const credit of credits) {
    if (remaining <= 0) break;
    const available = Number(credit.remainingAmount);
    const used = Math.min(available, remaining);
    await billingRepository.reduceCreditRemaining(credit.id, round2(available - used));
    remaining = round2(remaining - used);
  }
}

interface ChargeParams {
  organization: Organization;
  subscription: SubscriptionWithRelations;
  amount: number; // pre-tax, already >= 0
  billingCycle: string;
  periodStart: Date;
  periodEnd: Date;
  description: string;
  actor: Actor;
  couponCode?: string;
}

interface ChargeResult {
  invoiceId: string;
  orderId: string;
  amount: number;
  currency: string;
  gatewayProvider: string;
  checkoutKey: string | null;
  prefill: { email: string; name: string };
}

// The shared core behind checkout, upgrade, downgrade, and reactivate — all of
// them boil down to "charge this org this amount for this subscription
// period," differing only in how the pre-tax amount is computed.
async function chargeSubscription(params: ChargeParams): Promise<ChargeResult> {
  const { organization, subscription, billingCycle, periodStart, periodEnd, description, actor } = params;

  let discountAmount = 0;
  let coupon: Coupon | null = null;
  if (params.couponCode) {
    coupon = await billingRepository.findActiveCouponByCode(params.couponCode);
    await assertCouponUsable(coupon, subscription.product.slug, organization.id, params.amount);
    discountAmount = computeDiscount(coupon!, params.amount);
  }

  const subtotal = round2(Math.max(params.amount - discountAmount, 0));
  const tax = calculateGST(subtotal, organization.state);

  const credits = await billingRepository.findAvailableCredits(organization.id);
  const availableCreditTotal = round2(credits.reduce((sum, c) => sum + Number(c.remainingAmount), 0));
  const creditApplied = Math.min(availableCreditTotal, tax.total);
  const amountDue = round2(tax.total - creditApplied);

  const now = new Date();
  const invoiceNumber = await nextInvoiceNumber(now);
  const gateway = selectGateway(organization);

  const lineItems = [{ description, quantity: 1, unitPrice: params.amount, amount: params.amount }];
  if (discountAmount > 0) {
    lineItems.push({ description: `Coupon ${params.couponCode!.toUpperCase()}`, quantity: 1, unitPrice: -discountAmount, amount: -discountAmount });
  }

  const invoice = await billingRepository.createInvoice(organization.id, {
    subscriptionId: subscription.id,
    invoiceNumber,
    currency: organization.currency,
    billingCycle,
    subtotal,
    discountAmount,
    creditApplied,
    isIGST: tax.isIGST,
    cgstAmount: tax.cgst,
    sgstAmount: tax.sgst,
    igstAmount: tax.igst,
    taxAmount: tax.totalTax,
    total: tax.total,
    amountDue,
    gatewayProvider: gateway.provider,
    gatewayOrderId: null,
    periodStart,
    periodEnd,
    dueDate: addDays(now, 7),
    status: amountDue <= 0 ? "PAID" : "OPEN",
    lineItems,
  });

  await consumeCredits(credits, creditApplied);
  if (coupon) await billingRepository.recordCouponRedemption(coupon.id, organization.id, invoice.id);

  await billingRepository.writeAuditLog({
    organizationId: organization.id,
    actorId: actor.userId,
    actorEmail: actor.email,
    action: "invoice.created",
    resource: "invoice",
    resourceId: invoice.id,
  });
  if (coupon) {
    await billingRepository.writeAuditLog({
      organizationId: organization.id,
      actorId: actor.userId,
      actorEmail: actor.email,
      action: "coupon.applied",
      resource: "coupon",
      resourceId: coupon.id,
    });
  }

  if (amountDue <= 0) {
    await activateAfterPayment(subscription, invoice.id, periodStart, periodEnd);
    return {
      invoiceId: invoice.id,
      orderId: "no-payment-required",
      amount: 0,
      currency: organization.currency,
      gatewayProvider: gateway.provider,
      checkoutKey: null,
      prefill: { email: organization.billingEmail, name: organization.name },
    };
  }

  const order = await gateway.createOrder({
    amountMinorUnits: Math.round(amountDue * 100),
    currency: organization.currency,
    receipt: invoiceNumber,
    notes: { organizationId: organization.id, invoiceId: invoice.id },
  });
  await prisma.invoice.update({ where: { id: invoice.id }, data: { gatewayOrderId: order.orderId } });

  return {
    invoiceId: invoice.id,
    orderId: order.orderId,
    amount: order.amountMinorUnits,
    currency: order.currency,
    gatewayProvider: gateway.provider,
    checkoutKey: order.checkoutKey,
    prefill: { email: organization.billingEmail, name: organization.name },
  };
}

async function activateAfterPayment(subscription: Subscription, invoiceId: string, periodStart: Date, periodEnd: Date): Promise<void> {
  const status = subscription.status as Parameters<typeof canSubscriptionTransition>[0];
  if (canSubscriptionTransition(status, "ACTIVE")) {
    assertSubscriptionTransitionAllowed(status, "ACTIVE");
  }
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: "ACTIVE",
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      paymentFailedAt: null,
      dunningStage: 0,
      lastDunningActionAt: null,
    },
  });

  if (subscription.provisioningStatus === "PENDING") {
    void provisioningService.provisionSubscription(subscription.id);
  }

  void generateInvoicePdf(await pdfInput(invoiceId))
    .then((filename) => billingRepository.setInvoicePdfUrl(invoiceId, filename))
    .catch((err) => console.error(`[billing] invoice PDF generation failed for ${invoiceId}:`, err));
}

async function pdfInput(invoiceId: string) {
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { lineItems: true, subscription: { include: { organization: true } } },
  });
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    currency: invoice.currency,
    subtotal: invoice.subtotal.toString(),
    taxAmount: invoice.taxAmount.toString(),
    total: invoice.total.toString(),
    isIGST: invoice.isIGST,
    cgstAmount: invoice.cgstAmount.toString(),
    sgstAmount: invoice.sgstAmount.toString(),
    igstAmount: invoice.igstAmount.toString(),
    periodStart: invoice.periodStart,
    periodEnd: invoice.periodEnd,
    dueDate: invoice.dueDate,
    lineItems: invoice.lineItems.map((li) => ({ description: li.description, quantity: li.quantity, amount: li.amount.toString() })),
    organization: {
      name: invoice.subscription.organization.name,
      billingEmail: invoice.subscription.organization.billingEmail,
      taxId: invoice.subscription.organization.taxId,
    },
  };
}

export const billingService = {
  chargeSubscription,

  async checkout(organization: Organization, actor: Actor, input: CheckoutInput): Promise<ChargeResult> {
    const product = await productRepository.findBySlug(input.productSlug);
    if (!product || !product.isActive) throw new NotFoundError("Product not found");
    const plan = product.plans.find((p) => p.slug === input.planSlug);
    if (!plan) throw new NotFoundError("Plan not found");

    let subscription = await prisma.subscription.findUnique({
      where: { organizationId_productId: { organizationId: organization.id, productId: product.id } },
      include: { plan: true, product: true },
    });

    if (subscription?.status === "CANCELLED") {
      throw new ConflictError("This subscription was cancelled and can't be resumed. Contact support to start a new one.");
    }
    if (subscription?.status === "ACTIVE") {
      throw new ConflictError("Already subscribed — use the upgrade/downgrade endpoint to change plans.");
    }

    if (!subscription) {
      const now = new Date();
      const trialEnd = addDays(now, plan.trialDays);
      subscription = await prisma.subscription.create({
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
    } else if (subscription.planId !== plan.id) {
      subscription = await prisma.subscription.update({
        where: { id: subscription.id },
        data: { planId: plan.id },
        include: { plan: true, product: true },
      });
    }

    const baseAmount = input.billingCycle === "ANNUAL" ? Number(plan.annualPrice ?? Number(plan.monthlyPrice) * 12) : Number(plan.monthlyPrice);
    const now = new Date();
    const periodEnd = input.billingCycle === "ANNUAL" ? addMonths(now, 12) : addMonths(now, 1);

    return chargeSubscription({
      organization,
      subscription,
      amount: baseAmount,
      billingCycle: input.billingCycle,
      periodStart: now,
      periodEnd,
      description: `${product.name} — ${plan.name} plan (${input.billingCycle})`,
      actor,
      couponCode: input.couponCode || undefined,
    });
  },

  async listInvoices(organizationId: string, query: InvoiceQueryInput) {
    const [invoices, total] = await Promise.all([
      billingRepository.findInvoices(organizationId, query),
      billingRepository.countInvoices(organizationId, query),
    ]);
    return { invoices, total };
  },

  async getInvoice(organizationId: string, invoiceId: string) {
    const invoice = await billingRepository.findInvoiceById(organizationId, invoiceId);
    if (!invoice) throw new NotFoundError("Invoice not found");
    return invoice;
  },

  async getInvoicePdfPath(organizationId: string, invoiceId: string): Promise<{ filename: string; invoiceNumber: string }> {
    const invoice = await billingRepository.findInvoiceById(organizationId, invoiceId);
    if (!invoice) throw new NotFoundError("Invoice not found");
    let filename = invoice.pdfUrl;
    if (!filename) {
      filename = await generateInvoicePdf(await pdfInput(invoiceId));
      await billingRepository.setInvoicePdfUrl(invoiceId, filename);
    }
    return { filename, invoiceNumber: invoice.invoiceNumber };
  },

  listPaymentMethods(organizationId: string) {
    return billingRepository.findPaymentMethods(organizationId);
  },

  addPaymentMethod(organizationId: string, actor: Actor, input: Parameters<typeof billingRepository.createPaymentMethod>[1]) {
    return billingRepository.createPaymentMethod(organizationId, input).then(async (method) => {
      await billingRepository.writeAuditLog({
        organizationId,
        actorId: actor.userId,
        actorEmail: actor.email,
        action: "payment_method.added",
        resource: "payment_method",
        resourceId: method.id,
      });
      return method;
    });
  },

  async removePaymentMethod(organizationId: string, actor: Actor, id: string) {
    const method = await billingRepository.findPaymentMethodById(organizationId, id);
    if (!method) throw new NotFoundError("Payment method not found");
    await billingRepository.removePaymentMethod(organizationId, id);
    await billingRepository.writeAuditLog({
      organizationId,
      actorId: actor.userId,
      actorEmail: actor.email,
      action: "payment_method.removed",
      resource: "payment_method",
      resourceId: id,
    });
  },

  async setDefaultPaymentMethod(organizationId: string, id: string) {
    const method = await billingRepository.findPaymentMethodById(organizationId, id);
    if (!method) throw new NotFoundError("Payment method not found");
    return billingRepository.setDefaultPaymentMethod(organizationId, id);
  },

  async usageSummary(organizationId: string, productSlug: string) {
    const product = await productRepository.findBySlug(productSlug);
    if (!product) throw new NotFoundError("Product not found");
    const subscription = await productRepository.findSubscription(organizationId, product.id);
    if (!subscription) throw new NotFoundError("No subscription for this product");
    const seatsUsed = await prisma.orgMembership.count({ where: { organizationId, status: { in: ["ACTIVE", "INVITED"] } } });
    return { seatsUsed, seatLimit: subscription.plan.maxSeats };
  },

  async upcomingInvoicePreview(organizationId: string, productSlug: string) {
    const product = await productRepository.findBySlug(productSlug);
    if (!product) throw new NotFoundError("Product not found");
    const subscription = await productRepository.findSubscription(organizationId, product.id);
    if (!subscription) throw new NotFoundError("No subscription for this product");
    const organization = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });

    const amount = subscription.billingCycle === "ANNUAL" ? Number(subscription.plan.annualPrice ?? Number(subscription.plan.monthlyPrice) * 12) : Number(subscription.plan.monthlyPrice);
    const tax = calculateGST(amount, organization.state);
    return {
      subtotal: amount.toFixed(2),
      taxAmount: tax.totalTax.toFixed(2),
      total: tax.total.toFixed(2),
      periodStart: subscription.currentPeriodEnd.toISOString(),
      periodEnd: (subscription.billingCycle === "ANNUAL" ? addMonths(subscription.currentPeriodEnd, 12) : addMonths(subscription.currentPeriodEnd, 1)).toISOString(),
    };
  },

  async validateCoupon(organizationId: string, code: string, productSlug?: string) {
    const coupon = await billingRepository.findActiveCouponByCode(code);
    try {
      await assertCouponUsable(coupon, productSlug ?? "", organizationId, 0);
      return { valid: true, code: coupon!.code, type: coupon!.type as "PERCENTAGE" | "FIXED_AMOUNT", value: Number(coupon!.value) };
    } catch (err) {
      return { valid: false, reason: err instanceof Error ? err.message : "Invalid coupon" };
    }
  },

  // 11-Billing.md §7 — full refund within 7 days if unused, prorated partial
  // after that, none past the plan's window. "Usage" isn't tracked yet in
  // this schema, so the simpler day-based rule is what's enforced here.
  async refundInvoice(organizationId: string, actor: Actor, invoiceId: string, input: RefundInvoiceInput) {
    const invoice = await billingRepository.findInvoiceById(organizationId, invoiceId);
    if (!invoice) throw new NotFoundError("Invoice not found");
    if (invoice.status !== "PAID") throw new ConflictError("Only paid invoices can be refunded");

    const payment = invoice.payments.find((p) => p.status === "SUCCEEDED");
    if (!payment) throw new ConflictError("No successful payment found for this invoice");

    const daysSincePaid = invoice.paidAt ? (Date.now() - invoice.paidAt.getTime()) / 86_400_000 : Infinity;
    const total = Number(invoice.total);
    let refundAmount: number;
    if (input.amount) {
      refundAmount = Math.min(input.amount, total);
    } else if (daysSincePaid <= 7) {
      refundAmount = total;
    } else if (daysSincePaid <= 30) {
      const periodDays = Math.max(1, (invoice.periodEnd.getTime() - invoice.periodStart.getTime()) / 86_400_000);
      const daysLeft = Math.max(0, periodDays - daysSincePaid);
      refundAmount = round2(total * (daysLeft / periodDays));
    } else {
      throw new ConflictError("This invoice is outside the refund window");
    }

    await billingRepository.updatePaymentRefund(
      organizationId,
      payment.id,
      round2(Number(payment.refundedAmount) + refundAmount),
      refundAmount >= total ? "REFUNDED" : "PARTIALLY_REFUNDED"
    );
    await billingRepository.writeAuditLog({
      organizationId,
      actorId: actor.userId,
      actorEmail: actor.email,
      action: "payment.refunded",
      resource: "payment",
      resourceId: payment.id,
    });
    return { refundedAmount: refundAmount };
  },

  // Webhook entry points — called by webhooks/*.webhook.ts once the gateway
  // signature has verified. Idempotent: replays of an already-handled event
  // (gateway retries are expected) are a no-op.
  async handlePaymentSuccess(event: GatewayWebhookEvent): Promise<void> {
    const invoice = await billingRepository.findInvoiceByGatewayOrderId(event.gatewayOrderId);
    if (!invoice || invoice.status === "PAID") return;

    await billingRepository.createPayment({
      organizationId: invoice.subscription.organizationId,
      invoiceId: invoice.id,
      gatewayProvider: invoice.gatewayProvider,
      gatewayPaymentId: event.gatewayPaymentId,
      gatewayOrderId: event.gatewayOrderId,
      amount: Number(invoice.amountDue),
      currency: invoice.currency,
      status: "SUCCEEDED",
      method: event.method,
    });
    await billingRepository.markInvoicePaid(invoice.id);
    await activateAfterPayment(invoice.subscription, invoice.id, invoice.periodStart, invoice.periodEnd);

    await billingRepository.writeAuditLog({
      organizationId: invoice.subscription.organizationId,
      action: "payment.succeeded",
      resource: "payment",
      resourceId: invoice.id,
    });
    await billingRepository.writeAuditLog({
      organizationId: invoice.subscription.organizationId,
      action: "invoice.paid",
      resource: "invoice",
      resourceId: invoice.id,
    });

    const owner = await billingRepository.findPrimaryOwner(invoice.subscription.organizationId);
    if (owner) {
      console.log(`[dev] Receipt email to ${owner.email}: invoice ${invoice.invoiceNumber} paid`);
      await billingRepository.notify({
        organizationId: invoice.subscription.organizationId,
        userId: owner.id,
        type: NOTIFICATION_TYPES.INVOICE_PAID,
        title: "Payment received",
        body: `Invoice ${invoice.invoiceNumber} has been paid.`,
        actionUrl: "/dashboard/billing",
      });
      if (invoice.subscription.status === "TRIALING") {
        await billingRepository.notify({
          organizationId: invoice.subscription.organizationId,
          userId: owner.id,
          type: NOTIFICATION_TYPES.SUBSCRIPTION_ACTIVATED,
          title: "Subscription activated",
          body: "Your subscription is now active.",
          actionUrl: "/dashboard/billing",
        });
        void webhookService.dispatch(invoice.subscription.organizationId, "subscription.activated", {
          subscriptionId: invoice.subscriptionId,
        });
      }
    }

    void webhookService.dispatch(invoice.subscription.organizationId, "invoice.paid", { invoiceId: invoice.id });
    void webhookService.dispatch(invoice.subscription.organizationId, "payment.succeeded", { invoiceId: invoice.id });
  },

  async handlePaymentFailure(event: GatewayWebhookEvent): Promise<void> {
    const invoice = await billingRepository.findInvoiceByGatewayOrderId(event.gatewayOrderId);
    if (!invoice || invoice.status === "PAID") return;

    await billingRepository.createPayment({
      organizationId: invoice.subscription.organizationId,
      invoiceId: invoice.id,
      gatewayProvider: invoice.gatewayProvider,
      gatewayOrderId: event.gatewayOrderId,
      amount: Number(invoice.amountDue),
      currency: invoice.currency,
      status: "FAILED",
      failureReason: event.failureReason,
    });

    const subscription = invoice.subscription;
    const currentStatus = subscription.status as Parameters<typeof canSubscriptionTransition>[0];
    const nextStatus = currentStatus === "TRIALING" ? "INCOMPLETE" : currentStatus === "ACTIVE" ? "PAST_DUE" : currentStatus;
    if (nextStatus !== currentStatus && canSubscriptionTransition(currentStatus, nextStatus)) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: nextStatus, paymentFailedAt: subscription.paymentFailedAt ?? new Date() },
      });
    }

    await billingRepository.writeAuditLog({
      organizationId: subscription.organizationId,
      action: "payment.failed",
      resource: "payment",
      resourceId: invoice.id,
    });

    const owner = await billingRepository.findPrimaryOwner(subscription.organizationId);
    if (owner) {
      console.log(`[dev] Payment failed email to ${owner.email}: invoice ${invoice.invoiceNumber}`);
      await billingRepository.notify({
        organizationId: subscription.organizationId,
        userId: owner.id,
        type: NOTIFICATION_TYPES.PAYMENT_FAILED,
        title: "Payment failed",
        body: `Payment for invoice ${invoice.invoiceNumber} failed. Please update your payment method.`,
        actionUrl: "/dashboard/billing",
      });
    }

    void webhookService.dispatch(subscription.organizationId, "payment.failed", { invoiceId: invoice.id });
    if (nextStatus === "PAST_DUE") {
      void webhookService.dispatch(subscription.organizationId, "subscription.past_due", { subscriptionId: subscription.id });
    }
  },
};
