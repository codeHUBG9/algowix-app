"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotificationPreferencesFormInput } from "@algowix/shared-types";
import { apiClient } from "../api-client";
import { useCurrentSession } from "./use-current-session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  actionUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => apiClient.get<{ count: number }>("/api/v1/notifications/unread-count"),
    refetchInterval: 60_000,
  });
}

export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: ["notifications", "list", unreadOnly],
    queryFn: () => apiClient.get<AppNotification[]>(`/api/v1/notifications?unreadOnly=${unreadOnly}&limit=50`),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch<AppNotification>(`/api/v1/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.patch("/api/v1/notifications/read-all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/notifications/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ["notifications", "preferences"],
    queryFn: () => apiClient.get<NotificationPreferencesFormInput>("/api/v1/notifications/preferences"),
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NotificationPreferencesFormInput) =>
      apiClient.put<NotificationPreferencesFormInput>("/api/v1/notifications/preferences", input),
    onSuccess: (data) => queryClient.setQueryData(["notifications", "preferences"], data),
  });
}

// 14-Notifications.md §4 — subscribes to the SSE stream while the dashboard
// is open and invalidates the unread-count/list queries on every event,
// rather than maintaining a separate client-side notification store.
export function useNotificationStream() {
  const { data: session } = useCurrentSession();
  const queryClient = useQueryClient();
  const userId = session?.auth.userId;

  useEffect(() => {
    if (!userId) return;
    const source = new EventSource(`${API_URL}/api/v1/notifications/stream`, { withCredentials: true });
    source.onmessage = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };
    return () => source.close();
  }, [userId, queryClient]);
}
