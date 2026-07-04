import { tenantScopedClient } from "../../database/tenant-scope.js";
import type { AuditQueryInput, AuditExportQueryInput } from "./audit.schema.js";

function buildWhere(organizationId: string, filters: Omit<AuditQueryInput, "page" | "limit"> | AuditExportQueryInput) {
  return {
    ...(filters.actorId ? { actorId: filters.actorId } : {}),
    ...(filters.action ? { action: { contains: filters.action } } : {}),
    ...(filters.resource ? { resource: filters.resource } : {}),
    ...(filters.severity ? { severity: filters.severity } : {}),
    ...(filters.ipAddress ? { ipAddress: filters.ipAddress } : {}),
    ...(filters.from || filters.to
      ? {
          createdAt: {
            ...(filters.from ? { gte: new Date(filters.from) } : {}),
            ...(filters.to ? { lte: new Date(filters.to) } : {}),
          },
        }
      : {}),
  };
}

export const auditRepository = {
  list(organizationId: string, query: AuditQueryInput) {
    const where = buildWhere(organizationId, query);
    return Promise.all([
      tenantScopedClient(organizationId).auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      tenantScopedClient(organizationId).auditLog.count({ where }),
    ]);
  },

  findById(organizationId: string, id: string) {
    return tenantScopedClient(organizationId).auditLog.findFirst({ where: { id } });
  },

  // 15-Audit-Logs.md §5 — export up to 100K records for compliance.
  exportRows(organizationId: string, query: AuditExportQueryInput) {
    const where = buildWhere(organizationId, query);
    return tenantScopedClient(organizationId).auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100_000,
    });
  },

  async stats(organizationId: string, from: Date, to: Date) {
    const rows = await tenantScopedClient(organizationId).auditLog.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { createdAt: true, actorEmail: true, actorId: true, severity: true },
    });

    const eventsPerDay = new Map<string, number>();
    const eventsByActor = new Map<string, { actorEmail: string | null; count: number }>();
    const eventsBySeverity = { INFO: 0, WARNING: 0, CRITICAL: 0 };

    for (const row of rows) {
      const day = row.createdAt.toISOString().slice(0, 10);
      eventsPerDay.set(day, (eventsPerDay.get(day) ?? 0) + 1);

      const actorKey = row.actorId ?? "system";
      const existing = eventsByActor.get(actorKey);
      eventsByActor.set(actorKey, { actorEmail: row.actorEmail, count: (existing?.count ?? 0) + 1 });

      eventsBySeverity[row.severity as keyof typeof eventsBySeverity] =
        (eventsBySeverity[row.severity as keyof typeof eventsBySeverity] ?? 0) + 1;
    }

    return {
      totalEvents: rows.length,
      eventsPerDay: [...eventsPerDay.entries()].map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
      topActors: [...eventsByActor.entries()]
        .map(([actorId, v]) => ({ actorId, actorEmail: v.actorEmail, count: v.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      eventsBySeverity,
    };
  },
};
