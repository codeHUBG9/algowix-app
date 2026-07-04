"use client";

import Link from "next/link";
import { Gauge, Activity, Key, BookOpen, FlaskConical, ExternalLink } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { PageHeader, Card, Badge, EmptyState } from "../../_components/ui";
import { useRateLimitStatus, useDeveloperUsage, useDeveloperLogs } from "../../../../lib/hooks/use-developer";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function DeveloperPortalPage() {
  const { data: rateLimit } = useRateLimitStatus();
  const { data: usage } = useDeveloperUsage();
  const { data: logs } = useDeveloperLogs();

  const rateLimitPct = rateLimit ? Math.min(100, (rateLimit.usedThisMinute / rateLimit.limit) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Developer Portal" description="API reference, usage analytics, and sandbox tools for building on AlgoWix." />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Gauge size={15} />
            <span className="text-xs font-medium">Rate limit (per minute)</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {rateLimit?.usedThisMinute ?? 0}
            <span className="text-sm font-normal text-slate-400"> / {rateLimit?.limit ?? "—"}</span>
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${rateLimitPct > 90 ? "bg-red-500" : "bg-brand-600"}`} style={{ width: `${rateLimitPct}%` }} />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Activity size={15} />
            <span className="text-xs font-medium">API calls (30 days)</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{usage?.totalCalls ?? 0}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Key size={15} />
            <span className="text-xs font-medium">Manage keys</span>
          </div>
          <Link href="/dashboard/settings" className="mt-2 flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
            API Keys settings <ExternalLink size={12} />
          </Link>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-slate-700">API usage (30 days)</h3>
        {usage && usage.byDay.length > 0 ? (
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usage.byDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" hide />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="total" fill="#5b5eea" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState title="No API activity yet" description="Calls made with an API key will show up here." />
        )}
      </Card>

      <Card>
        <h3 className="px-5 pt-5 text-sm font-semibold text-slate-700">Recent requests (7 days)</h3>
        {!logs || logs.length === 0 ? (
          <EmptyState title="No requests logged yet" />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-5 py-2 font-medium">Method</th>
                  <th className="px-5 py-2 font-medium">Path</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 font-medium">Latency</th>
                  <th className="px-5 py-2 font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-5 py-2 font-mono text-xs">{log.method}</td>
                    <td className="px-5 py-2 font-mono text-xs text-slate-500">{log.path}</td>
                    <td className="px-5 py-2">
                      <Badge tone={log.statusCode < 400 ? "green" : "red"}>{log.statusCode}</Badge>
                    </td>
                    <td className="px-5 py-2 text-slate-400">{log.latencyMs}ms</td>
                    <td className="px-5 py-2 text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-slate-700">
            <BookOpen size={16} />
            <h3 className="text-sm font-semibold">Documentation</h3>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href={`${API_URL}/api/docs`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand-600 hover:text-brand-700">
                API Reference (OpenAPI) <ExternalLink size={12} />
              </a>
            </li>
            <li className="text-slate-500">Authentication: use a Bearer token or <code className="rounded bg-slate-100 px-1">ApiKey awx_live_...</code></li>
            <li className="text-slate-500">Webhooks: sign every payload with HMAC-SHA256 using your webhook secret</li>
            <li className="text-slate-500">Rate limits: scale with your plan tier (Starter 60/min → Enterprise 10,000/min)</li>
          </ul>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-slate-700">
            <FlaskConical size={16} />
            <h3 className="text-sm font-semibold">Sandbox environment</h3>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Create a <strong>Test</strong> API key in Settings → API Keys to build against AlgoWix without touching live
            data. Test keys are prefixed <code className="rounded bg-slate-100 px-1">awx_test_</code> and payments run
            through the mock payment gateway automatically.
          </p>
        </Card>
      </div>
    </div>
  );
}
