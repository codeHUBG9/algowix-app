"use client";

import { useTenant } from "../../../lib/hooks/use-tenant";
import { ApiClientError } from "../../../lib/api-client";

const BLOCKED_COPY: Record<string, { title: string; body: string }> = {
  SUSPENDED: {
    title: "Your account is suspended",
    body: "Access is paused, usually due to a billing issue. Contact support to restore access.",
  },
  CANCELLED: {
    title: "Your account is cancelled",
    body: "This organization's subscription has been cancelled. Your data is retained for a limited period before deletion.",
  },
  PURGED: {
    title: "This account no longer exists",
    body: "All data for this organization has been permanently deleted.",
  },
};

const ERROR_CODE_TO_STATUS: Record<string, keyof typeof BLOCKED_COPY> = {
  TENANT_SUSPENDED: "SUSPENDED",
  TENANT_CANCELLED: "CANCELLED",
  TENANT_PURGED: "PURGED",
};

export function TenantStatusGate({ children }: { children: React.ReactNode }) {
  const { data: tenant, isLoading, error } = useTenant();

  if (isLoading) return <p className="text-sm text-slate-500">Loading...</p>;

  // The blocked status can come from a live 403 (resolveTenantContext
  // rejecting the request) OR from cached tenant data written directly by a
  // mutation (e.g. useCancelTenant's onSuccess) without a round-trip through
  // the guarded endpoint — check both, not just the error path.
  const blockedStatus =
    (tenant && tenant.status in BLOCKED_COPY ? (tenant.status as keyof typeof BLOCKED_COPY) : undefined) ??
    (error instanceof ApiClientError ? ERROR_CODE_TO_STATUS[error.code] : undefined);

  if (blockedStatus) {
    const { title, body } = BLOCKED_COPY[blockedStatus];
    return (
      <div className="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <h2 className="text-sm font-semibold text-red-800">{title}</h2>
        <p className="mt-2 text-sm text-red-700">{body}</p>
      </div>
    );
  }

  return (
    <div>
      {tenant?.status === "TRIALING" && tenant.trialEndsAt && <TrialBanner trialEndsAt={tenant.trialEndsAt} />}
      {children}
    </div>
  );
}

function TrialBanner({ trialEndsAt }: { trialEndsAt: string }) {
  const daysLeft = Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

  return (
    <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
      {daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your trial.` : "Your trial has ended."}
    </div>
  );
}
