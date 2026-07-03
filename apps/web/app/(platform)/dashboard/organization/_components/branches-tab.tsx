"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createBranchSchema, type CreateBranchFormInput } from "@algowix/shared-types";
import { useBranches, useCreateBranch, useDeleteBranch, useUpdateBranch } from "../../../../../lib/hooks/use-org-structure";
import { ApiClientError } from "../../../../../lib/api-client";

export function BranchesTab() {
  const { data: branches, isLoading } = useBranches();
  const createBranch = useCreateBranch();
  const deleteBranch = useDeleteBranch();
  const updateBranch = useUpdateBranch();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateBranchFormInput>({ resolver: zodResolver(createBranchSchema) });

  async function onSubmit(data: CreateBranchFormInput) {
    setError(null);
    try {
      await createBranch.mutateAsync(data);
      reset();
      setShowForm(false);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  async function toggleHeadOffice(id: string, current: boolean) {
    setError(null);
    try {
      await updateBranch.mutateAsync({ id, input: { isHeadOffice: !current } });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  async function onDelete(id: string) {
    setError(null);
    try {
      await deleteBranch.mutateAsync(id);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  if (isLoading) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-700">Branches</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
        >
          {showForm ? "Cancel" : "Add branch"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input {...register("name")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium">Code</label>
              <input {...register("code")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium">City</label>
              <input {...register("city")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium">State</label>
              <input {...register("state")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium">Country</label>
              <input {...register("country")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("isHeadOffice")} />
            Head office
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create branch"}
          </button>
        </form>
      )}

      {error && !showForm && <p className="text-sm text-red-600">{error}</p>}

      <div className="rounded-lg border border-slate-200 bg-white">
        <ul className="divide-y divide-slate-100">
          {branches?.map((b) => (
            <li key={b.id} className="flex items-center justify-between p-4 text-sm">
              <div>
                <p className="font-medium">
                  {b.name} {b.code && <span className="text-slate-400">({b.code})</span>}
                  {b.isHeadOffice && (
                    <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                      Head Office
                    </span>
                  )}
                </p>
                <p className="text-slate-500">{[b.city, b.state, b.country].filter(Boolean).join(", ") || "—"}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => toggleHeadOffice(b.id, b.isHeadOffice)} className="text-slate-600 underline">
                  {b.isHeadOffice ? "Unset head office" : "Make head office"}
                </button>
                <button onClick={() => onDelete(b.id)} className="text-red-600 underline">
                  Delete
                </button>
              </div>
            </li>
          ))}
          {branches?.length === 0 && <li className="p-4 text-sm text-slate-500">No branches yet.</li>}
        </ul>
      </div>
    </div>
  );
}
