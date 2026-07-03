"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { brandingSettingsSchema, type BrandingSettingsFormInput } from "@algowix/shared-types";
import { useBrandingSettings } from "../../../../../lib/hooks/use-org-settings";
import { ApiClientError } from "../../../../../lib/api-client";

export function BrandingTab() {
  const { query, mutation } = useBrandingSettings();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<BrandingSettingsFormInput>({ resolver: zodResolver(brandingSettingsSchema) });

  useEffect(() => {
    if (query.data) reset(query.data);
  }, [query.data, reset]);

  async function onSubmit(data: BrandingSettingsFormInput) {
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
      <div>
        <label className="block text-sm font-medium">Logo URL</label>
        <input {...register("logoUrl")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium">Primary color</label>
        <input {...register("primaryColor")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium">Favicon URL</label>
        <input {...register("faviconUrl")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium">Email header URL</label>
        <input
          {...register("emailHeaderUrl")}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
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
