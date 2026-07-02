export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <span className="text-sm font-semibold tracking-tight">AlgoWix Platform</span>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
