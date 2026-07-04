"use client";

import { useInvoices } from "../../../../../lib/hooks/use-billing";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  OPEN: "bg-amber-100 text-amber-800",
  PAID: "bg-emerald-100 text-emerald-800",
  VOID: "bg-slate-200 text-slate-500",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function InvoicesTab() {
  const { data: invoices, isLoading } = useInvoices();

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-medium text-slate-700">Invoices</h2>
      {isLoading ? (
        <p className="mt-3 text-sm text-slate-500">Loading...</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {invoices?.map((invoice) => (
            <li key={invoice.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <span className="font-medium">{invoice.invoiceNumber}</span>{" "}
                <span className="text-slate-400">
                  · {invoice.currency} {invoice.total} · {new Date(invoice.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[invoice.status] ?? "bg-slate-100 text-slate-700"}`}>
                  {invoice.status}
                </span>
                <a
                  href={`${API_URL}/api/v1/billing/invoices/${invoice.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-slate-900 underline"
                >
                  Download
                </a>
              </div>
            </li>
          ))}
          {invoices?.length === 0 && <p className="py-2 text-sm text-slate-500">No invoices yet.</p>}
        </ul>
      )}
    </div>
  );
}
