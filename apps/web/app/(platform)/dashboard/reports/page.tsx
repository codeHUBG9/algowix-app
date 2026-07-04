"use client";

import { useState } from "react";
import { Download, Users, Package, CreditCard, HardDrive, Activity, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { PageHeader, Card, Badge, Button, EmptyState } from "../../_components/ui";
import {
  useDashboardReport,
  useUsersReport,
  useBillingReport,
  useProductsReport,
  reportExportUrl,
} from "../../../../lib/hooks/use-reports";

const TABS = ["Overview", "Users", "Billing", "Products"] as const;
type Tab = (typeof TABS)[number];

const CHART_COLORS = ["#5b5eea", "#7c86f6", "#a3adfd", "#c7cdff", "#3a34b0"];

function formatBytes(bytes: number): string {
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon size={15} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </Card>
  );
}

function OverviewTab() {
  const { data, isLoading } = useDashboardReport();
  if (isLoading || !data) return <p className="py-8 text-center text-sm text-slate-400">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={Users} label="Active users" value={data.activeUsers} />
        <StatCard icon={Package} label="Products" value={data.productsSubscribed} />
        <StatCard icon={CreditCard} label="Spend this month" value={`₹${data.currentMonthSpend.toLocaleString()}`} />
        <StatCard icon={HardDrive} label="Storage used" value={formatBytes(data.storageUsedBytes)} />
        <StatCard icon={Activity} label="API calls" value={data.apiCallsThisMonth} />
        <StatCard
          icon={TrendingUp}
          label="Next renewal"
          value={data.upcomingRenewal ? new Date(data.upcomingRenewal).toLocaleDateString() : "—"}
        />
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-slate-700">Member growth (12 months)</h3>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.userGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#5b5eea" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function UsersTab() {
  const { data, isLoading } = useUsersReport();
  if (isLoading || !data) return <p className="py-8 text-center text-sm text-slate-400">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-700">Logins (last 30 days)</h3>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.loginsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" hide />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#5b5eea" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-700">Device breakdown</h3>
          <div className="mt-4 h-56">
            {data.deviceBreakdown.length === 0 ? (
              <EmptyState title="No session data yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.deviceBreakdown} dataKey="count" nameKey="device" innerRadius={50} outerRadius={80}>
                    {data.deviceBreakdown.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="px-5 pt-5 text-sm font-semibold text-slate-700">Most active users</h3>
          <ul className="mt-3 divide-y divide-slate-50">
            {data.mostActiveUsers.map((u) => (
              <li key={u.userId} className="flex items-center justify-between px-5 py-2.5 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{u.name}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </div>
                <Badge tone="brand">{u.sessionCount} sessions</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h3 className="px-5 pt-5 text-sm font-semibold text-slate-700">Inactive users (30+ days)</h3>
          {data.inactiveUsers.length === 0 ? (
            <EmptyState title="Everyone's active" />
          ) : (
            <ul className="mt-3 divide-y divide-slate-50">
              {data.inactiveUsers.map((u) => (
                <li key={u.userId} className="flex items-center justify-between px-5 py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{u.name}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never logged in"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function BillingTab() {
  const { data, isLoading } = useBillingReport();
  if (isLoading || !data) return <p className="py-8 text-center text-sm text-slate-400">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={TrendingUp} label="MRR" value={`₹${data.mrr.toLocaleString()}`} />
        <StatCard icon={CreditCard} label="Payment success rate" value={`${data.paymentSuccessRate}%`} />
        <StatCard icon={Package} label="Upcoming renewals (30d)" value={data.upcomingRenewals.length} />
        <StatCard icon={Activity} label="Invoices" value={data.invoiceHistory.length} />
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-slate-700">Spend (12 months)</h3>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.spendByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip />
              <Bar dataKey="total" fill="#5b5eea" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h3 className="px-5 pt-5 text-sm font-semibold text-slate-700">Invoice history</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-5 py-2 font-medium">Invoice</th>
                <th className="px-5 py-2 font-medium">Product</th>
                <th className="px-5 py-2 font-medium">Amount</th>
                <th className="px-5 py-2 font-medium">Status</th>
                <th className="px-5 py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.invoiceHistory.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-5 py-2.5 font-mono text-xs">{inv.invoiceNumber}</td>
                  <td className="px-5 py-2.5">{inv.productName}</td>
                  <td className="px-5 py-2.5">₹{inv.total.toLocaleString()}</td>
                  <td className="px-5 py-2.5">
                    <Badge tone={inv.status === "PAID" ? "green" : inv.status === "VOID" ? "slate" : "amber"}>{inv.status}</Badge>
                  </td>
                  <td className="px-5 py-2.5 text-slate-400">{new Date(inv.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ProductsTab() {
  const { data, isLoading } = useProductsReport();
  if (isLoading) return <p className="py-8 text-center text-sm text-slate-400">Loading...</p>;
  if (!data || data.length === 0) return <EmptyState title="No active subscriptions" />;

  return (
    <Card>
      <ul className="divide-y divide-slate-50">
        {data.map((p, i) => (
          <li key={i} className="flex items-center justify-between px-5 py-3.5 text-sm">
            <div>
              <p className="font-medium text-slate-800">{p.productName}</p>
              <p className="text-xs text-slate-400">
                {p.planName} plan · {p.seatCount} seats · renews {new Date(p.currentPeriodEnd).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={p.status === "ACTIVE" ? "green" : "amber"}>{p.status}</Badge>
              <Badge tone={p.healthStatus === "up" ? "green" : p.healthStatus === "down" ? "red" : "slate"}>
                {p.healthStatus ?? "unknown"}
              </Badge>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("Overview");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Unified analytics across your organization's usage, users, and billing."
        actions={
          tab !== "Overview" && (
            <a href={reportExportUrl(tab.toLowerCase() as "users" | "billing" | "products")}>
              <Button variant="secondary">
                <Download size={14} /> Export CSV
              </Button>
            </a>
          )
        }
      />

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && <OverviewTab />}
      {tab === "Users" && <UsersTab />}
      {tab === "Billing" && <BillingTab />}
      {tab === "Products" && <ProductsTab />}
    </div>
  );
}
