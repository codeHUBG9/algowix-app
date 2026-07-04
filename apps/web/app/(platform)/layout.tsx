import { TenantStatusGate } from "./_components/tenant-status-gate";
import { Sidebar } from "./_components/sidebar";
import { Topbar } from "./_components/topbar";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
          <TenantStatusGate>{children}</TenantStatusGate>
        </main>
      </div>
    </div>
  );
}
