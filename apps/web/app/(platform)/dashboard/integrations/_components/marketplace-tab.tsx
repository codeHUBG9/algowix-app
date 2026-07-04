"use client";

import { Store, Star, Check } from "lucide-react";
import { Card, Badge, Button } from "../../../_components/ui";
import { useMarketplace, useInstallApp, useUninstallApp } from "../../../../../lib/hooks/use-marketplace";

function priceLabel(type: string, price: number | null): string {
  if (type === "FREE") return "Free";
  if (type === "PAID_SUBSCRIPTION") return `₹${price}/mo`;
  return `₹${price} one-time`;
}

export function MarketplaceTab() {
  const { data, isLoading } = useMarketplace();
  const install = useInstallApp();
  const uninstall = useUninstallApp();

  if (isLoading) return <p className="py-8 text-center text-sm text-slate-400">Loading...</p>;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data?.map((app) => (
        <Card key={app.id} className="flex flex-col p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <Store size={18} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">{app.name}</p>
              <p className="text-xs text-slate-400">by {app.developerName}</p>
            </div>
          </div>
          <p className="mt-3 flex-1 text-xs text-slate-500">{app.description}</p>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            {app.rating.toFixed(1)} ({app.reviewCount})
            <span>·</span>
            <span>{app.installCount} installs</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <Badge tone="brand">{priceLabel(app.type, app.price)}</Badge>
            {app.installed ? (
              <Button variant="secondary" onClick={() => uninstall.mutate(app.slug)} disabled={uninstall.isPending}>
                <Check size={13} /> Installed
              </Button>
            ) : (
              <Button onClick={() => install.mutate(app.slug)} disabled={install.isPending}>
                Install
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
