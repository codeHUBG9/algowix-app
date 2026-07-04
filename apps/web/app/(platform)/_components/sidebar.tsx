"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  Package,
  CreditCard,
  BarChart3,
  ScrollText,
  FolderOpen,
  Plug,
  Terminal,
  Settings,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Organization",
    items: [
      { href: "/dashboard/organization", label: "Organization", icon: Building2 },
      { href: "/dashboard/members", label: "Members", icon: Users },
    ],
  },
  {
    label: "Products & Billing",
    items: [
      { href: "/dashboard/products", label: "Products", icon: Package },
      { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
      { href: "/dashboard/audit-logs", label: "Audit Logs", icon: ScrollText },
    ],
  },
  {
    label: "Platform",
    items: [
      { href: "/dashboard/files", label: "Files", icon: FolderOpen },
      { href: "/dashboard/integrations", label: "Integrations", icon: Plug },
      { href: "/dashboard/developer", label: "Developer", icon: Terminal },
    ],
  },
  {
    label: "",
    items: [{ href: "/dashboard/settings", label: "Settings", icon: Settings }],
  },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-slate-100 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">
          A
        </div>
        <span className="text-sm font-semibold tracking-tight text-slate-900">AlgoWix</span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label || "bottom"}>
            {group.label && (
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon size={16} strokeWidth={2} className={active ? "text-brand-600" : "text-slate-400"} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
