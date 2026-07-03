"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { inviteMemberSchema, type InviteMemberFormInput } from "@algowix/shared-types";
import { useCreateInvite, useOrgRoles, useBulkInvite } from "../../../../../lib/hooks/use-org-members";
import { ApiClientError } from "../../../../../lib/api-client";

export function InviteForm({ onClose }: { onClose: () => void }) {
  const { data: roles } = useOrgRoles();
  const createInvite = useCreateInvite();
  const bulkInvite = useBulkInvite();
  const [error, setError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InviteMemberFormInput>({ resolver: zodResolver(inviteMemberSchema) });

  async function onSubmit(data: InviteMemberFormInput) {
    setError(null);
    try {
      await createInvite.mutateAsync(data);
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  async function onBulkFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setBulkResult(null);
    try {
      const result = await bulkInvite.mutateAsync(file);
      const invited = result.results.filter((r) => r.status === "invited").length;
      const skipped = result.results.filter((r) => r.status === "skipped").length;
      setBulkResult(`${invited} invited, ${skipped} skipped.`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input {...register("email")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium">Role</label>
            <select {...register("roleId")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select a role...</option>
              {roles?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            {errors.roleId && <p className="mt-1 text-xs text-red-600">{errors.roleId.message}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium">Message (optional)</label>
          <textarea
            {...register("message")}
            rows={2}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {isSubmitting ? "Sending..." : "Send invite"}
          </button>
          <button type="button" onClick={onClose} className="text-sm text-slate-600">
            Cancel
          </button>
        </div>
      </form>

      <div className="border-t border-slate-100 pt-3">
        <label className="block text-sm font-medium">Bulk invite via CSV</label>
        <p className="text-xs text-slate-500">Columns: email, firstName, lastName, role</p>
        <input type="file" accept=".csv,text/csv" onChange={onBulkFile} className="mt-2 text-sm" />
        {bulkResult && <p className="mt-1 text-xs text-emerald-700">{bulkResult}</p>}
      </div>
    </div>
  );
}
