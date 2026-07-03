"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { notificationSettingsSchema, type NotificationSettingsFormInput } from "@algowix/shared-types";
import { useNotificationSettings } from "../../../../../lib/hooks/use-org-settings";
import { ApiClientError } from "../../../../../lib/api-client";

const EVENTS: { key: keyof NotificationSettingsFormInput; label: string }[] = [
  { key: "memberInvited", label: "A member is invited" },
  { key: "memberSuspended", label: "A member is suspended" },
  { key: "billingAlerts", label: "Billing alerts" },
  { key: "securityAlerts", label: "Security alerts" },
];

export function NotificationsTab() {
  const { query, mutation } = useNotificationSettings();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<NotificationSettingsFormInput>({ resolver: zodResolver(notificationSettingsSchema) });

  useEffect(() => {
    if (query.data) reset(query.data);
  }, [query.data, reset]);

  async function onSubmit(data: NotificationSettingsFormInput) {
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
      <p className="text-sm font-medium text-slate-700">Email me when...</p>
      <div className="space-y-2">
        {EVENTS.map((e) => (
          <label key={e.key} className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register(e.key)} />
            {e.label}
          </label>
        ))}
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
