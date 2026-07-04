"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen, ExternalLink } from "lucide-react";
import { NAV_GROUPS } from "../../../lib/nav-config";
import { useLaunchNav } from "../../../lib/hooks/use-launch-nav";
import { useProducts } from "../../../lib/hooks/use-products";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../components/ui/tooltip";
import { cn } from "../../../lib/utils";

const STORAGE_KEY = "algowix:sidebar-collapsed";
const ACTIVE_STATUSES = ["TRIALING", "ACTIVE"];

export function Sidebar() {
  const pathname = usePathname();
  const { launchProduct, isLaunching } = useLaunchNav();
  const { data: products } = useProducts();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    setHydrated(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <TooltipProvider delayDuration={200}>
      <motion.aside
        layout
        animate={{ width: hydrated && collapsed ? 64 : 240 }}
        transition={{ type: "tween", duration: 0.18, ease: "easeOut" }}
        aria-expanded={!collapsed}
        className="hidden shrink-0 flex-col border-r border-border bg-surface lg:flex"
      >
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">
            A
          </div>
          {!collapsed && <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">AlgoWix</span>}
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label || "bottom"}>
              {group.label && !collapsed && (
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group.label}</p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = item.type === "link" && (pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href)));
                  const Icon = item.icon;

                  const linkClasses = cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active ? "border-l-2 border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300" : "border-l-2 border-transparent text-slate-600 hover:bg-surface-subtle hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100",
                    collapsed && "justify-center px-0"
                  );

                  const iconEl = <Icon size={16} strokeWidth={2} className={active ? "text-brand-600" : "text-slate-400"} />;

                  if (item.type === "link") {
                    const content = (
                      <Link href={item.href} className={linkClasses}>
                        {iconEl}
                        {!collapsed && item.label}
                      </Link>
                    );
                    return collapsed ? (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>{content}</TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    ) : (
                      <div key={item.href}>{content}</div>
                    );
                  }

                  const product = products?.find((p) => p.slug === item.slug);
                  const hasSubscription = !!product?.subscription && ACTIVE_STATUSES.includes(product.subscription.status);
                  const tooltipLabel = collapsed
                    ? item.label
                    : hasSubscription
                      ? undefined
                      : `No active subscription for ${item.label} — subscribe from Products`;

                  const content = (
                    <button
                      type="button"
                      disabled={isLaunching || !hasSubscription}
                      onClick={() => launchProduct(item.slug, item.label)}
                      className={cn(linkClasses, "w-full disabled:cursor-not-allowed disabled:opacity-40")}
                    >
                      {iconEl}
                      {!collapsed && (
                        <span className="flex flex-1 items-center justify-between">
                          {item.label}
                          <ExternalLink size={12} className="text-slate-300" />
                        </span>
                      )}
                    </button>
                  );

                  return tooltipLabel ? (
                    <Tooltip key={item.slug}>
                      <TooltipTrigger asChild>{content}</TooltipTrigger>
                      <TooltipContent side="right">{tooltipLabel}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <div key={item.slug}>{content}</div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <button
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-surface-subtle"
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}
