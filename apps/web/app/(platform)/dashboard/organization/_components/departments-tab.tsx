"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createDepartmentSchema, type CreateDepartmentFormInput } from "@algowix/shared-types";
import {
  useDepartments,
  useCreateDepartment,
  useDeleteDepartment,
} from "../../../../../lib/hooks/use-org-structure";
import { ApiClientError } from "../../../../../lib/api-client";

export function DepartmentsTab() {
  const { data: departments, isLoading } = useDepartments();
  const createDepartment = useCreateDepartment();
  const deleteDepartment = useDeleteDepartment();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateDepartmentFormInput>({ resolver: zodResolver(createDepartmentSchema) });

  async function onSubmit(data: CreateDepartmentFormInput) {
    setError(null);
    try {
      const payload = { ...data, parentId: data.parentId || undefined };
      await createDepartment.mutateAsync(payload);
      reset();
      setShowForm(false);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  async function onDelete(id: string) {
    setError(null);
    try {
      await deleteDepartment.mutateAsync(id);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  if (isLoading) return <p className="text-sm text-slate-500">Loading...</p>;

  const nameById = new Map((departments ?? []).map((d) => [d.id, d.name]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-700">Departments</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
        >
          {showForm ? "Cancel" : "Add department"}
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
          <div>
            <label className="block text-sm font-medium">Parent department</label>
            <select {...register("parentId")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">None (top level)</option>
              {departments?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create department"}
          </button>
        </form>
      )}

      {error && !showForm && <p className="text-sm text-red-600">{error}</p>}

      <div className="rounded-lg border border-slate-200 bg-white">
        <ul className="divide-y divide-slate-100">
          {departments?.map((d) => (
            <li key={d.id} className="flex items-center justify-between p-4 text-sm">
              <div>
                <p className="font-medium">
                  {d.name} {d.code && <span className="text-slate-400">({d.code})</span>}
                </p>
                <p className="text-slate-500">
                  {d.parentId ? `Under ${nameById.get(d.parentId) ?? "—"}` : "Top level"}
                  {d.headUser && ` · Head: ${d.headUser.firstName} ${d.headUser.lastName}`}
                </p>
              </div>
              <button onClick={() => onDelete(d.id)} className="text-red-600 underline">
                Delete
              </button>
            </li>
          ))}
          {departments?.length === 0 && <li className="p-4 text-sm text-slate-500">No departments yet.</li>}
        </ul>
      </div>
    </div>
  );
}
