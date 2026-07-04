"use client";

import { useEffect, useState } from "react";
import type { NotificationPreferencesFormInput } from "@algowix/shared-types";
import { Card, Button } from "../../../_components/ui";
import { useNotificationPreferences, useUpdateNotificationPreferences } from "../../../../../lib/hooks/use-notifications";

const EMAIL_CATEGORIES: { key: keyof NotificationPreferencesFormInput["email"] & string; label: string }[] = [
  { key: "billing", label: "Billing & payments" },
  { key: "team", label: "Team activity" },
  { key: "product", label: "Product health & usage" },
  { key: "digest", label: "Daily digest email" },
];

export function NotificationPreferencesPanel() {
  const { data: prefs, isLoading } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();
  const [local, setLocal] = useState<NotificationPreferencesFormInput | null>(null);

  useEffect(() => {
    if (prefs) setLocal(prefs);
  }, [prefs]);

  if (isLoading || !local) {
    return (
      <Card className="p-5">
        <p className="text-sm text-slate-400">Loading preferences...</p>
      </Card>
    );
  }

  function toggleEmail(key: keyof NotificationPreferencesFormInput["email"]) {
    setLocal((prev) => (prev ? { ...prev, email: { ...prev.email, [key]: !prev.email[key] } } : prev));
  }

  function togglePush() {
    setLocal((prev) => (prev ? { ...prev, push: { ...prev.push, enabled: !prev.push.enabled } } : prev));
  }

  async function onSave() {
    if (local) await update.mutateAsync(local);
  }

  return (
    <Card className="h-fit p-5">
      <h2 className="text-sm font-semibold text-slate-800">Notification preferences</h2>
      <p className="mt-1 text-xs text-slate-500">Security alerts are always sent and can't be disabled.</p>

      <div className="mt-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email me about</p>
        {EMAIL_CATEGORIES.map((c) => (
          <label key={c.key} className="flex items-center justify-between text-sm text-slate-700">
            {c.label}
            <input
              type="checkbox"
              checked={Boolean(local.email[c.key])}
              onChange={() => toggleEmail(c.key)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
          </label>
        ))}

        <div className="pt-2">
          <label className="flex items-center justify-between text-sm text-slate-700">
            Push notifications
            <input
              type="checkbox"
              checked={local.push.enabled}
              onChange={togglePush}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
          </label>
        </div>
      </div>

      <Button onClick={onSave} disabled={update.isPending} className="mt-5 w-full justify-center">
        {update.isPending ? "Saving..." : "Save preferences"}
      </Button>
      {update.isSuccess && <p className="mt-2 text-center text-xs text-emerald-600">Saved.</p>}
    </Card>
  );
}
