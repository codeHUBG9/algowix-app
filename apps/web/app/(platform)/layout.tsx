import { TenantStatusGate } from "./_components/tenant-status-gate";
import { OrgSwitcher } from "./_components/org-switcher";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold tracking-tight">AlgoWix Platform</span>
          <nav className="flex gap-4 text-sm text-slate-600">
            <a href="/dashboard" className="hover:text-slate-900">
              Dashboard
            </a>
            <a href="/dashboard/organization" className="hover:text-slate-900">
              Organization
            </a>
            <a href="/dashboard/members" className="hover:text-slate-900">
              Members
            </a>
            <a href="/dashboard/products" className="hover:text-slate-900">
              Products
            </a>
            <a href="/dashboard/billing" className="hover:text-slate-900">
              Billing
            </a>
            <a href="/dashboard/settings" className="hover:text-slate-900">
              Settings
            </a>
          </nav>
        </div>
        <OrgSwitcher />
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <TenantStatusGate>{children}</TenantStatusGate>
      </main>
    </div>
  );
}
