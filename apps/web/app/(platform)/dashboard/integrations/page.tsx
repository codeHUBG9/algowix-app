"use client";

import { useState } from "react";
import { PageHeader } from "../../_components/ui";
import { IntegrationsTab } from "./_components/integrations-tab";
import { WebhooksTab } from "./_components/webhooks-tab";
import { MarketplaceTab } from "./_components/marketplace-tab";

const TABS = ["Native Integrations", "Webhooks", "Marketplace"] as const;
type Tab = (typeof TABS)[number];

export default function IntegrationsPage() {
  const [tab, setTab] = useState<Tab>("Native Integrations");

  return (
    <div className="space-y-6">
      <PageHeader title="Integrations" description="Connect third-party tools, manage webhooks, and browse the marketplace." />

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

      {tab === "Native Integrations" && <IntegrationsTab />}
      {tab === "Webhooks" && <WebhooksTab />}
      {tab === "Marketplace" && <MarketplaceTab />}
    </div>
  );
}
