import { prisma } from "../../database/prisma.js";
import { tenantScopedClient } from "../../database/tenant-scope.js";

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function last12Months(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    months.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  return months;
}

export const reportsRepository = {
  async dashboardSummary(organizationId: string) {
    const [activeUsers, subscriptions, storageAgg, apiCallsThisMonth] = await Promise.all([
      tenantScopedClient(organizationId).orgMembership.count({ where: { status: "ACTIVE" } }),
      tenantScopedClient(organizationId).subscription.findMany({
        where: { status: { in: ["ACTIVE", "TRIALING"] } },
        include: { product: { select: { name: true } } },
        orderBy: { currentPeriodEnd: "asc" },
      }),
      tenantScopedClient(organizationId).fileRecord.aggregate({ where: { deletedAt: null }, _sum: { sizeBytes: true } }),
      prisma.apiRequestLog.count({
        where: { organizationId, createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      }),
    ]);

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthSpend = await tenantScopedClient(organizationId).invoice.aggregate({
      where: { status: "PAID", paidAt: { gte: monthStart } },
      _sum: { total: true },
    });

    return {
      activeUsers,
      productsSubscribed: subscriptions.length,
      currentMonthSpend: Number(monthSpend._sum.total ?? 0),
      upcomingRenewal: subscriptions[0]?.currentPeriodEnd ?? null,
      storageUsedBytes: Number(storageAgg._sum.sizeBytes ?? 0n),
      apiCallsThisMonth,
    };
  },

  async userGrowth(organizationId: string) {
    const memberships = await tenantScopedClient(organizationId).orgMembership.findMany({
      where: { status: { in: ["ACTIVE", "SUSPENDED"] } },
      select: { joinedAt: true },
    });
    const months = last12Months();
    const counts = new Map(months.map((m) => [m, 0]));
    for (const m of memberships) {
      const key = monthKey(m.joinedAt);
      if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    // Cumulative — "growth" means running total, not just that month's joins.
    let running = 0;
    const cumulative = months.map((month) => {
      running += counts.get(month) ?? 0;
      return { month, count: running };
    });
    return cumulative;
  },

  async userActivity(organizationId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [members, sessions] = await Promise.all([
      tenantScopedClient(organizationId).orgMembership.findMany({
        where: { status: "ACTIVE" },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true, lastLoginAt: true } } },
      }),
      prisma.session.findMany({
        where: { organizationId, createdAt: { gte: thirtyDaysAgo } },
        select: { userId: true, createdAt: true, deviceType: true },
      }),
    ]);

    const sessionCountByUser = new Map<string, number>();
    const deviceBreakdown = new Map<string, number>();
    const loginsByDay = new Map<string, number>();
    for (const s of sessions) {
      sessionCountByUser.set(s.userId, (sessionCountByUser.get(s.userId) ?? 0) + 1);
      const device = s.deviceType ?? "unknown";
      deviceBreakdown.set(device, (deviceBreakdown.get(device) ?? 0) + 1);
      const day = s.createdAt.toISOString().slice(0, 10);
      loginsByDay.set(day, (loginsByDay.get(day) ?? 0) + 1);
    }

    const mostActive = members
      .map((m) => ({
        userId: m.user.id,
        name: `${m.user.firstName} ${m.user.lastName}`,
        email: m.user.email,
        sessionCount: sessionCountByUser.get(m.user.id) ?? 0,
      }))
      .sort((a, b) => b.sessionCount - a.sessionCount)
      .slice(0, 10);

    const inactiveUsers = members
      .filter((m) => !m.user.lastLoginAt || m.user.lastLoginAt < thirtyDaysAgo)
      .map((m) => ({ userId: m.user.id, name: `${m.user.firstName} ${m.user.lastName}`, email: m.user.email, lastLoginAt: m.user.lastLoginAt }));

    return {
      loginsByDay: [...loginsByDay.entries()].map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
      mostActiveUsers: mostActive,
      inactiveUsers,
      deviceBreakdown: [...deviceBreakdown.entries()].map(([device, count]) => ({ device, count })),
    };
  },

  async billingReport(organizationId: string) {
    const [invoices, subscriptions] = await Promise.all([
      tenantScopedClient(organizationId).invoice.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { subscription: { include: { product: { select: { name: true } } } } },
      }),
      tenantScopedClient(organizationId).subscription.findMany({
        where: { status: { in: ["ACTIVE", "TRIALING"] } },
        include: { plan: true, product: { select: { name: true } } },
      }),
    ]);

    const months = last12Months();
    const spendByMonth = new Map(months.map((m) => [m, 0]));
    for (const inv of invoices) {
      if (inv.status !== "PAID" || !inv.paidAt) continue;
      const key = monthKey(inv.paidAt);
      if (spendByMonth.has(key)) spendByMonth.set(key, (spendByMonth.get(key) ?? 0) + Number(inv.total));
    }

    const payments = await tenantScopedClient(organizationId).payment.findMany({
      where: { status: { in: ["SUCCEEDED", "FAILED"] } },
      select: { status: true },
    });
    const succeededCount = payments.filter((p) => p.status === "SUCCEEDED").length;
    const successRate = payments.length > 0 ? succeededCount / payments.length : 1;

    const mrr = subscriptions.reduce((sum, s) => {
      const price = s.billingCycle === "ANNUAL" ? Number(s.plan.annualPrice ?? 0) / 12 : Number(s.plan.monthlyPrice);
      return sum + price;
    }, 0);

    const productCostBreakdown = new Map<string, number>();
    for (const s of subscriptions) {
      const price = s.billingCycle === "ANNUAL" ? Number(s.plan.annualPrice ?? 0) / 12 : Number(s.plan.monthlyPrice);
      productCostBreakdown.set(s.product.name, (productCostBreakdown.get(s.product.name) ?? 0) + price);
    }

    const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const upcomingRenewals = subscriptions
      .filter((s) => s.currentPeriodEnd <= thirtyDaysOut)
      .map((s) => ({ productName: s.product.name, renewsAt: s.currentPeriodEnd }));

    return {
      mrr: Math.round(mrr * 100) / 100,
      spendByMonth: [...spendByMonth.entries()].map(([month, total]) => ({ month, total })),
      invoiceHistory: invoices.slice(0, 12).map((i) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        total: Number(i.total),
        status: i.status,
        createdAt: i.createdAt,
        productName: i.subscription.product.name,
      })),
      paymentSuccessRate: Math.round(successRate * 1000) / 10,
      upcomingRenewals,
      productCostBreakdown: [...productCostBreakdown.entries()].map(([productName, total]) => ({ productName, total })),
    };
  },

  async productUsage(organizationId: string) {
    const subscriptions = await tenantScopedClient(organizationId).subscription.findMany({
      where: { status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
      include: { product: true, plan: { select: { name: true } } },
    });
    return subscriptions.map((s) => ({
      productName: s.product.name,
      planName: s.plan.name,
      status: s.status,
      healthStatus: s.product.healthStatus,
      seatCount: s.seatCount,
      currentPeriodEnd: s.currentPeriodEnd,
    }));
  },
};
