"use client";

import { useState } from "react";
import { Trash2, CheckCheck, Bell } from "lucide-react";
import { PageHeader, Card, Button, EmptyState } from "../../_components/ui";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from "../../../../lib/hooks/use-notifications";
import { NotificationPreferencesPanel } from "./_components/preferences-panel";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationsPage() {
  const [tab, setTab] = useState<"all" | "unread">("all");
  const { data: notifications, isLoading } = useNotifications(tab === "unread");
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const remove = useDeleteNotification();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Everything that's happened across your organization."
        actions={
          <Button variant="secondary" onClick={() => markAllRead.mutate()}>
            <CheckCheck size={14} /> Mark all read
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex gap-1 border-b border-slate-100 px-4 pt-3">
            {(["all", "unread"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-t-md border-b-2 px-3 py-2 text-sm font-medium capitalize ${
                  tab === t ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="divide-y divide-slate-100">
            {isLoading && <p className="px-4 py-8 text-center text-sm text-slate-400">Loading...</p>}
            {!isLoading && notifications?.length === 0 && (
              <EmptyState
                title="No notifications"
                description={tab === "unread" ? "You're all caught up." : "Notifications about your org will show up here."}
              />
            )}
            {notifications?.map((n) => (
              <div key={n.id} className={`flex items-start gap-3 px-4 py-3.5 ${!n.isRead ? "bg-brand-50/30" : ""}`}>
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <Bell size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{n.title}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{n.body}</p>
                  <p className="mt-1 text-xs text-slate-400">{timeAgo(n.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {!n.isRead && (
                    <button
                      onClick={() => markRead.mutate(n.id)}
                      title="Mark as read"
                      className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                    >
                      <CheckCheck size={15} />
                    </button>
                  )}
                  <button
                    onClick={() => remove.mutate(n.id)}
                    title="Delete"
                    className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <NotificationPreferencesPanel />
      </div>
    </div>
  );
}
