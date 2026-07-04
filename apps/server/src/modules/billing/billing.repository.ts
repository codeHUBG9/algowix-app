import { prisma } from "../../database/prisma.js";
import { tenantScopedClient } from "../../database/tenant-scope.js";

export const billingRepository = {
  findActiveOrTrialingSubscription(organizationId: string, productId: string) {
    return prisma.subscription.findFirst({
      where: { organizationId, productId, status: { in: ["TRIALING", "ACTIVE", "PAST_DUE", "SUSPENDED", "INCOMPLETE"] } },
      include: { plan: true, product: true },
    });
  },

  findSubscriptionById(organizationId: string, id: string) {
    return tenantScopedClient(organizationId)
      .subscription.findFirst({ where: { id }, include: { plan: true, product: true } })
      .then((sub) => sub);
  },

  // Webhook handlers only know the gateway order id, not the org — plain
  // (non-tenant-scoped) lookup is intentional here.
  findInvoiceByGatewayOrderId(gatewayOrderId: string) {
    return prisma.invoice.findFirst({
      where: { gatewayOrderId },
      include: { lineItems: true, subscription: { include: { organization: true, product: true, plan: true } } },
    });
  },

  createInvoice(
    organizationId: string,
    data: {
      subscriptionId: string;
      invoiceNumber: string;
      currency: string;
      billingCycle: string;
      subtotal: number;
      discountAmount: number;
      creditApplied: number;
      isIGST: boolean;
      cgstAmount: number;
      sgstAmount: number;
      igstAmount: number;
      taxAmount: number;
      total: number;
      amountDue: number;
      gatewayProvider: string;
      gatewayOrderId: string | null;
      periodStart: Date;
      periodEnd: Date;
      dueDate: Date;
      status: "OPEN" | "PAID";
      lineItems: { description: string; quantity: number; unitPrice: number; amount: number }[];
    }
  ) {
    return tenantScopedClient(organizationId).invoice.create({
      data: {
        organizationId,
        subscriptionId: data.subscriptionId,
        invoiceNumber: data.invoiceNumber,
        status: data.status,
        currency: data.currency,
        billingCycle: data.billingCycle,
        subtotal: data.subtotal,
        discountAmount: data.discountAmount,
        creditApplied: data.creditApplied,
        isIGST: data.isIGST,
        cgstAmount: data.cgstAmount,
        sgstAmount: data.sgstAmount,
        igstAmount: data.igstAmount,
        taxAmount: data.taxAmount,
        total: data.total,
        amountDue: data.amountDue,
        gatewayProvider: data.gatewayProvider,
        gatewayOrderId: data.gatewayOrderId,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        dueDate: data.dueDate,
        paidAt: data.status === "PAID" ? new Date() : null,
        lineItems: { create: data.lineItems },
      },
      include: { lineItems: true },
    });
  },

  findInvoices(organizationId: string, query: { status?: string; page: number; limit: number }) {
    return tenantScopedClient(organizationId).invoice.findMany({
      where: query.status ? { status: query.status } : {},
      include: { lineItems: true },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
  },

  countInvoices(organizationId: string, query: { status?: string }) {
    return tenantScopedClient(organizationId).invoice.count({ where: query.status ? { status: query.status } : {} });
  },

  findInvoiceById(organizationId: string, id: string) {
    return tenantScopedClient(organizationId).invoice.findFirst({
      where: { id },
      include: { lineItems: true, payments: true, subscription: { include: { organization: true } } },
    });
  },

  markInvoicePaid(id: string, pdfUrl?: string) {
    return prisma.invoice.update({
      where: { id },
      data: { status: "PAID", paidAt: new Date(), amountDue: 0, ...(pdfUrl ? { pdfUrl } : {}) },
    });
  },

  setInvoicePdfUrl(id: string, pdfUrl: string) {
    return prisma.invoice.update({ where: { id }, data: { pdfUrl } });
  },

  voidInvoice(organizationId: string, id: string) {
    return tenantScopedClient(organizationId).invoice.update({ where: { id }, data: { status: "VOID", voidedAt: new Date() } });
  },

  createPayment(data: {
    organizationId: string;
    invoiceId: string;
    gatewayProvider: string;
    gatewayPaymentId?: string | null;
    gatewayOrderId?: string | null;
    amount: number;
    currency: string;
    status: string;
    method?: string | null;
    failureReason?: string | null;
  }) {
    return tenantScopedClient(data.organizationId).payment.create({
      data: {
        organizationId: data.organizationId,
        invoiceId: data.invoiceId,
        gatewayProvider: data.gatewayProvider,
        gatewayPaymentId: data.gatewayPaymentId ?? null,
        gatewayOrderId: data.gatewayOrderId ?? null,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        method: data.method ?? null,
        failureReason: data.failureReason ?? null,
        paidAt: data.status === "SUCCEEDED" ? new Date() : null,
      },
    });
  },

  updatePaymentRefund(organizationId: string, paymentId: string, refundedAmount: number, status: string) {
    return tenantScopedClient(organizationId).payment.update({
      where: { id: paymentId },
      data: { refundedAmount, status },
    });
  },

  findPaymentMethods(organizationId: string) {
    return tenantScopedClient(organizationId).paymentMethod.findMany({ orderBy: { createdAt: "desc" } });
  },

  findPaymentMethodById(organizationId: string, id: string) {
    return tenantScopedClient(organizationId).paymentMethod.findFirst({ where: { id } });
  },

  async createPaymentMethod(
    organizationId: string,
    data: {
      gatewayProvider: string;
      gatewayMethodId: string;
      type: string;
      brand?: string | null;
      last4?: string | null;
      expiryMonth?: number | null;
      expiryYear?: number | null;
      isDefault?: boolean;
    }
  ) {
    const client = tenantScopedClient(organizationId);
    if (data.isDefault) {
      await client.paymentMethod.updateMany({ data: { isDefault: false } });
    }
    const existingCount = await client.paymentMethod.count();
    return client.paymentMethod.create({
      data: {
        organizationId,
        gatewayProvider: data.gatewayProvider,
        gatewayMethodId: data.gatewayMethodId,
        type: data.type,
        brand: data.brand ?? null,
        last4: data.last4 ?? null,
        expiryMonth: data.expiryMonth ?? null,
        expiryYear: data.expiryYear ?? null,
        isDefault: data.isDefault ?? existingCount === 0,
      },
    });
  },

  removePaymentMethod(organizationId: string, id: string) {
    return tenantScopedClient(organizationId).paymentMethod.delete({ where: { id } });
  },

  async setDefaultPaymentMethod(organizationId: string, id: string) {
    const client = tenantScopedClient(organizationId);
    await client.paymentMethod.updateMany({ data: { isDefault: false } });
    return client.paymentMethod.update({ where: { id }, data: { isDefault: true } });
  },

  findAvailableCredits(organizationId: string) {
    return tenantScopedClient(organizationId).credit.findMany({
      where: { remainingAmount: { gt: 0 }, expiresAt: { gt: new Date() } },
      orderBy: { expiresAt: "asc" },
    });
  },

  reduceCreditRemaining(id: string, remainingAmount: number) {
    return prisma.credit.update({ where: { id }, data: { remainingAmount } });
  },

  issueCredit(organizationId: string, amount: number, reason: string, expiresAt: Date) {
    return tenantScopedClient(organizationId).credit.create({
      data: { organizationId, amount, remainingAmount: amount, reason, expiresAt },
    });
  },

  findActiveCouponByCode(code: string) {
    return prisma.coupon.findFirst({ where: { code: code.toUpperCase(), isActive: true } });
  },

  async hasOrgRedeemedCoupon(couponId: string, organizationId: string): Promise<boolean> {
    const redemption = await prisma.couponRedemption.findFirst({ where: { couponId, organizationId } });
    return redemption !== null;
  },

  async recordCouponRedemption(couponId: string, organizationId: string, invoiceId: string) {
    await prisma.$transaction([
      prisma.couponRedemption.create({ data: { couponId, organizationId, invoiceId } }),
      prisma.coupon.update({ where: { id: couponId }, data: { currentUses: { increment: 1 } } }),
    ]);
  },

  writeAuditLog(entry: {
    organizationId: string;
    actorId?: string;
    actorEmail?: string;
    actorType?: string;
    action: string;
    resource: string;
    resourceId?: string;
  }) {
    return prisma.auditLog.create({
      data: {
        organizationId: entry.organizationId,
        actorId: entry.actorId,
        actorType: entry.actorType ?? "USER",
        actorEmail: entry.actorEmail,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        // 11-Billing.md §9 — every billing/payment/subscription event is CRITICAL.
        severity: "CRITICAL",
      },
    });
  },

  async findPrimaryOwner(organizationId: string) {
    const membership = await prisma.orgMembership.findFirst({
      where: { organizationId, isPrimary: true },
      include: { user: true },
    });
    return membership?.user ?? null;
  },

  notify(data: { organizationId: string; userId: string; type: string; title: string; body: string; actionUrl?: string }) {
    return prisma.notification.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        actionUrl: data.actionUrl ?? null,
        channel: "IN_APP",
      },
    });
  },

  hasNotificationOfType(organizationId: string, userId: string, type: string) {
    return prisma.notification
      .findFirst({ where: { organizationId, userId, type } })
      .then((n) => n !== null);
  },
};
