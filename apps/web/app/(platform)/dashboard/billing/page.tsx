"use client";

import { useState } from "react";
import { OverviewTab } from "./_components/overview-tab";
import { InvoicesTab } from "./_components/invoices-tab";
import { PaymentMethodsTab } from "./_components/payment-methods-tab";

const TABS = ["Overview", "Invoices", "Payment Methods"] as const;
type Tab = (typeof TABS)[number];

export default function BillingPage() {
  const [tab, setTab] = useState<Tab>("Overview");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Billing</h1>
        <p className="text-sm text-slate-500">Manage subscriptions, invoices, and payment methods.</p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && <OverviewTab />}
      {tab === "Invoices" && <InvoicesTab />}
      {tab === "Payment Methods" && <PaymentMethodsTab />}
    </div>
  );
}
