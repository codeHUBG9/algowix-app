import { prisma } from "../../database/prisma.js";
import { PLAN_LIMITS } from "../../middleware/rateLimiter.js";
import { NotFoundError } from "../../utils/errors.js";

export const developerService = {
  // 20-Developer-Portal.md §7 — no Redis-backed live counter in this
  // environment (see rateLimiter.ts's in-memory store comment), so this
  // reports the org's plan-based ceiling and how many requests it has
  // actually logged in the current minute, rather than the limiter's live
  // internal counter (which isn't exposed outside the middleware).
  async rateLimitStatus(organizationId: string, plan: string) {
    const windowStart = new Date(Date.now() - 60_000);
    const usedThisMinute = await prisma.apiRequestLog.count({
      where: { organizationId, createdAt: { gte: windowStart } },
    });
    return { limit: PLAN_LIMITS[plan] ?? 60, usedThisMinute, windowSeconds: 60 };
  },

  async usage(organizationId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const rows = await prisma.apiRequestLog.findMany({
      where: { organizationId, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true, statusCode: true },
    });

    const byDay = new Map<string, { total: number; errors: number }>();
    for (const row of rows) {
      const day = row.createdAt.toISOString().slice(0, 10);
      const entry = byDay.get(day) ?? { total: 0, errors: 0 };
      entry.total++;
      if (row.statusCode >= 400) entry.errors++;
      byDay.set(day, entry);
    }

    return {
      totalCalls: rows.length,
      byDay: [...byDay.entries()].map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date)),
    };
  },

  logs(organizationId: string, page: number, limit: number) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const where = { organizationId, createdAt: { gte: sevenDaysAgo } };
    return Promise.all([
      prisma.apiRequestLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.apiRequestLog.count({ where }),
    ]);
  },

  async apiKeyUsage(organizationId: string, apiKeyId: string) {
    const key = await prisma.apiKey.findFirst({ where: { id: apiKeyId, organizationId } });
    if (!key) throw new NotFoundError("API key not found");

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [totalCalls, last24h] = await Promise.all([
      prisma.apiRequestLog.count({ where: { apiKeyId, createdAt: { gte: thirtyDaysAgo } } }),
      prisma.apiRequestLog.count({ where: { apiKeyId, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    ]);
    return { totalCalls, last24h, lastUsedAt: key.lastUsedAt };
  },
};
