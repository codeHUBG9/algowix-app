import { TenantStatusGate } from "./_components/tenant-status-gate";
import { Sidebar } from "./_components/sidebar";
import { Topbar } from "./_components/topbar";
import { ShellOverlays } from "./_components/shell-overlays";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-surface-muted">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
          <TenantStatusGate>{children}</TenantStatusGate>
        </main>
      </div>
      <ShellOverlays />
    </div>
  );
}
