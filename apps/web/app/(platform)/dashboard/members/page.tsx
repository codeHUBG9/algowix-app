"use client";

import { useState } from "react";
import {
  useMembers,
  useInvites,
  useUpdateMemberStatus,
  useRemoveMember,
  useCancelInvite,
  type MemberFilters,
} from "../../../../lib/hooks/use-org-members";
import { useCurrentSession } from "../../../../lib/hooks/use-current-session";
import { ApiClientError } from "../../../../lib/api-client";
import { InviteForm } from "./_components/invite-form";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  INVITED: "bg-amber-100 text-amber-800",
  SUSPENDED: "bg-red-100 text-red-800",
};

export default function MembersPage() {
  const { data: session } = useCurrentSession();
  const [filters, setFilters] = useState<MemberFilters>({});
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: members, isLoading } = useMembers(filters);
  const { data: invites } = useInvites();
  const updateStatus = useUpdateMemberStatus();
  const removeMember = useRemoveMember();
  const cancelInvite = useCancelInvite();

  const canManage = session?.auth.permissions.includes("users.update") ?? false;
  const canInvite = session?.auth.permissions.includes("users.invite") ?? false;

  async function onSuspend(userId: string, currentStatus: string) {
    setError(null);
    const nextStatus = currentStatus === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    try {
      await updateStatus.mutateAsync({ userId, input: { status: nextStatus } });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  async function onRemove(userId: string) {
    setError(null);
    try {
      await removeMember.mutateAsync(userId);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  async function onCancelInvite(inviteId: string) {
    setError(null);
    try {
      await cancelInvite.mutateAsync(inviteId);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Members</h1>
        {canInvite && (
          <button
            onClick={() => setShowInviteForm((v) => !v)}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
          >
            {showInviteForm ? "Close" : "Invite member"}
          </button>
        )}
      </div>

      {showInviteForm && <InviteForm onClose={() => setShowInviteForm(false)} />}

      <div className="flex gap-3">
        <input
          placeholder="Search by name or email"
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined, page: 1 }))}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          onChange={(e) =>
            setFilters((f) => ({ ...f, status: (e.target.value || undefined) as MemberFilters["status"], page: 1 }))
          }
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="rounded-lg border border-slate-200 bg-white">
        {isLoading ? (
          <p className="p-4 text-sm text-slate-500">Loading...</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {members?.map((m) => (
              <li key={m.id} className="flex items-center justify-between p-4 text-sm">
                <div>
                  <p className="font-medium">
                    {m.firstName} {m.lastName}
                    {m.userId === session?.auth.userId ? " (you)" : ""}
                  </p>
                  <p className="text-slate-500">
                    {m.email} · {m.role.name}
                    {m.productAccess.length > 0 && ` · ${m.productAccess.join(", ")}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[m.status] ?? ""}`}>
                    {m.status}
                  </span>
                  {canManage && m.userId !== session?.auth.userId && (
                    <>
                      <button onClick={() => onSuspend(m.userId, m.status)} className="text-slate-600 underline">
                        {m.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
                      </button>
                      <button onClick={() => onRemove(m.userId)} className="text-red-600 underline">
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
            {members?.length === 0 && <li className="p-4 text-sm text-slate-500">No members match this filter.</li>}
          </ul>
        )}
      </div>

      {invites && invites.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <h2 className="border-b border-slate-100 p-4 text-sm font-medium text-slate-700">Pending invites</h2>
          <ul className="divide-y divide-slate-100">
            {invites.map((invite) => (
              <li key={invite.id} className="flex items-center justify-between p-4 text-sm">
                <span>
                  {invite.email} · {invite.role.name}
                </span>
                {canInvite && (
                  <button onClick={() => onCancelInvite(invite.id)} className="text-red-600 underline">
                    Cancel invite
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
