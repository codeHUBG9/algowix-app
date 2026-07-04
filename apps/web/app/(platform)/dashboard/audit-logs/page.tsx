"use client";

import { useState } from "react";
import { Download, ShieldAlert } from "lucide-react";
import { PageHeader, Card, Badge, Button, EmptyState } from "../../_components/ui";
import { useAuditLogs, useAuditStats, auditExportUrl, type AuditFilters } from "../../../../lib/hooks/use-audit-logs";

const SEVERITY_TONE: Record<string, "slate" | "amber" | "red"> = {
  INFO: "slate",
  WARNING: "amber",
  CRITICAL: "red",
};

export default function AuditLogsPage() {
  const [filters, setFilters] = useState<AuditFilters>({ page: 1, limit: 25 });
  const { data: logs, isLoading } = useAuditLogs(filters);
  const { data: stats } = useAuditStats();

  function updateFilter(patch: Partial<AuditFilters>) {
    setFilters((f) => ({ ...f, ...patch, page: 1 }));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Immutable record of every significant action in your organization."
        actions={
          <div className="flex gap-2">
            <a href={auditExportUrl(filters, "csv")}>
              <Button variant="secondary">
                <Download size={14} /> Export CSV
              </Button>
            </a>
            <a href={auditExportUrl(filters, "json")}>
              <Button variant="secondary">
                <Download size={14} /> Export JSON
              </Button>
            </a>
          </div>
        }
      />

      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs text-slate-500">Events (30d)</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.totalEvents}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-slate-500">Critical</p>
            <p className="mt-1 text-2xl font-semibold text-red-600">{stats.eventsBySeverity.CRITICAL ?? 0}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-slate-500">Warnings</p>
            <p className="mt-1 text-2xl font-semibold text-amber-600">{stats.eventsBySeverity.WARNING ?? 0}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-slate-500">Top actor</p>
            <p className="mt-1 truncate text-sm font-medium text-slate-900">
              {stats.topActors[0]?.actorEmail ?? "—"}
            </p>
          </Card>
        </div>
      )}

      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <input
            type="date"
            onChange={(e) => updateFilter({ from: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <input
            type="date"
            onChange={(e) => updateFilter({ to: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <input
            placeholder="Action (e.g. invite.accepted)"
            onChange={(e) => updateFilter({ action: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <input
            placeholder="Resource"
            onChange={(e) => updateFilter({ resource: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <select
            onChange={(e) => updateFilter({ severity: e.target.value || undefined })}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="">All severities</option>
            <option value="INFO">Info</option>
            <option value="WARNING">Warning</option>
            <option value="CRITICAL">Critical</option>
          </select>
          <input
            placeholder="IP address"
            onChange={(e) => updateFilter({ ipAddress: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
      </Card>

      <Card>
        {isLoading && <p className="px-4 py-8 text-center text-sm text-slate-400">Loading...</p>}
        {!isLoading && logs?.length === 0 && (
          <EmptyState title="No matching events" description="Try widening your filters." />
        )}
        {logs && logs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Resource</th>
                  <th className="px-4 py-3 font-medium">IP</th>
                  <th className="px-4 py-3 font-medium">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {log.actorEmail ?? <span className="italic text-slate-400">{log.actorType.toLowerCase()}</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{log.action}</td>
                    <td className="px-4 py-3 text-slate-500">{log.resource}</td>
                    <td className="px-4 py-3 text-slate-400">{log.ipAddress ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge tone={SEVERITY_TONE[log.severity]}>
                        {log.severity === "CRITICAL" && <ShieldAlert size={11} className="mr-1 inline" />}
                        {log.severity}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
