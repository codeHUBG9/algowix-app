"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTeamSchema, type CreateTeamFormInput } from "@algowix/shared-types";
import { useCreateTeam, useDeleteTeam, useRemoveTeamMember, useTeams } from "../../../../../lib/hooks/use-org-structure";
import { ApiClientError } from "../../../../../lib/api-client";

export function TeamsTab() {
  const { data: teams, isLoading } = useTeams();
  const createTeam = useCreateTeam();
  const deleteTeam = useDeleteTeam();
  const removeMember = useRemoveTeamMember();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTeamFormInput>({ resolver: zodResolver(createTeamSchema) });

  async function onSubmit(data: CreateTeamFormInput) {
    setError(null);
    try {
      await createTeam.mutateAsync(data);
      reset();
      setShowForm(false);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  async function onDelete(id: string) {
    setError(null);
    try {
      await deleteTeam.mutateAsync(id);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  async function onRemoveMember(teamId: string, userId: string) {
    setError(null);
    try {
      await removeMember.mutateAsync({ teamId, userId });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  if (isLoading) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-700">Teams</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
        >
          {showForm ? "Cancel" : "Add team"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input {...register("name")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium">Description</label>
            <textarea
              {...register("description")}
              rows={2}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create team"}
          </button>
        </form>
      )}

      {error && !showForm && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-3">
        {teams?.map((t) => (
          <div key={t.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t.name}</p>
                {t.description && <p className="text-sm text-slate-500">{t.description}</p>}
              </div>
              <button onClick={() => onDelete(t.id)} className="text-sm text-red-600 underline">
                Delete
              </button>
            </div>
            {t.members.length > 0 && (
              <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100 pt-2">
                {t.members.map((m) => (
                  <li key={m.id} className="flex items-center justify-between py-1.5 text-sm">
                    <span>
                      {m.user.firstName} {m.user.lastName} <span className="text-slate-400">· {m.role}</span>
                    </span>
                    <button onClick={() => onRemoveMember(t.id, m.user.id)} className="text-xs text-red-600 underline">
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {teams?.length === 0 && <p className="text-sm text-slate-500">No teams yet.</p>}
      </div>
    </div>
  );
}
