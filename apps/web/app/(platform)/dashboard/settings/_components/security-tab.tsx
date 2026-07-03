"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { securitySettingsSchema, type SecuritySettingsFormInput } from "@algowix/shared-types";
import { useSecuritySettings } from "../../../../../lib/hooks/use-org-settings";
import { ApiClientError } from "../../../../../lib/api-client";

export function SecurityTab() {
  const { query, mutation } = useSecuritySettings();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<SecuritySettingsFormInput>({ resolver: zodResolver(securitySettingsSchema) });

  useEffect(() => {
    if (query.data) reset(query.data);
  }, [query.data, reset]);

  async function onSubmit(data: SecuritySettingsFormInput) {
    setError(null);
    try {
      await mutation.mutateAsync(data);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  if (query.isLoading) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">Minimum password length</label>
          <input
            type="number"
            {...register("passwordMinLength")}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Session timeout (minutes)</label>
          <input
            type="number"
            {...register("sessionTimeoutMinutes")}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium">Allowed IPs (comma-separated)</label>
        <input {...register("allowedIps")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register("twoFactorRequired")} />
        Require two-factor authentication for all members
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting || !isDirty}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isSubmitting ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
