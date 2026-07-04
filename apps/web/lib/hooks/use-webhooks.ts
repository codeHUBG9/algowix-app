"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateWebhookFormInput, UpdateWebhookFormInput } from "@algowix/shared-types";
import { apiClient } from "../api-client";

export interface WebhookDto {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastTriggeredAt: string | null;
  failureCount: number;
  createdAt: string;
}

export interface WebhookDeliveryDto {
  id: string;
  eventType: string;
  statusCode: number | null;
  success: boolean;
  createdAt: string;
}

export function useWebhookEvents() {
  return useQuery({ queryKey: ["webhooks", "events"], queryFn: () => apiClient.get<string[]>("/api/v1/webhooks/events") });
}

export function useWebhooks() {
  return useQuery({ queryKey: ["webhooks", "list"], queryFn: () => apiClient.get<WebhookDto[]>("/api/v1/webhooks") });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWebhookFormInput) => apiClient.post<WebhookDto & { secret: string }>("/api/v1/webhooks", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks", "list"] }),
  });
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateWebhookFormInput }) =>
      apiClient.put<WebhookDto>(`/api/v1/webhooks/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks", "list"] }),
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/webhooks/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks", "list"] }),
  });
}

export function useTestWebhook() {
  return useMutation({
    mutationFn: (id: string) => apiClient.post<{ success: boolean; statusCode: number | null }>(`/api/v1/webhooks/${id}/test`),
  });
}

export function useWebhookDeliveries(id: string | null) {
  return useQuery({
    queryKey: ["webhooks", "deliveries", id],
    queryFn: () => apiClient.get<WebhookDeliveryDto[]>(`/api/v1/webhooks/${id}/deliveries`),
    enabled: !!id,
  });
}
