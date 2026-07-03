"use client";

import { useState } from "react";
import { useMyOrganizations, useSwitchOrganization } from "../../../lib/hooks/use-my-organizations";
import { ApiClientError } from "../../../lib/api-client";
import { useCurrentSession } from "../../../lib/hooks/use-current-session";

export function OrgSwitcher() {
  const { data: session } = useCurrentSession();
  const { data: orgs } = useMyOrganizations();
  const switchOrg = useSwitchOrganization();
  const [error, setError] = useState<string | null>(null);

  if (!orgs || orgs.length <= 1) return null;

  async function onSwitch(e: React.ChangeEvent<HTMLSelectElement>) {
    const organizationId = e.target.value;
    if (organizationId === session?.auth.organizationId) return;
    setError(null);
    try {
      await switchOrg.mutateAsync(organizationId);
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={session?.auth.organizationId ?? ""}
        onChange={onSwitch}
        disabled={switchOrg.isPending}
        className="rounded-md border border-slate-300 px-2 py-1 text-sm"
      >
        {orgs.map((o) => (
          <option key={o.organization.id} value={o.organization.id}>
            {o.organization.name}
            {o.isPrimary ? " (primary)" : ""}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
