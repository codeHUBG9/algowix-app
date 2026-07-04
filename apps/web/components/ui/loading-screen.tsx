export function LoadingScreen() {
  return (
    <div className="flex min-h-screen bg-surface-muted">
      <div className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="h-16 border-b border-border p-4">
          <div className="h-7 w-24 animate-pulse rounded bg-surface-subtle" />
        </div>
        <div className="space-y-2 p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded-lg bg-surface-subtle" />
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="h-16 border-b border-border bg-surface" />
        <div className="flex-1 space-y-4 p-8">
          <div className="h-8 w-48 animate-pulse rounded bg-surface-subtle" />
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-subtle" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-xl bg-surface-subtle" />
        </div>
      </div>
    </div>
  );
}
