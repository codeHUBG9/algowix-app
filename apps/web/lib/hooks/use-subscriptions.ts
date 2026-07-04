"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CheckoutSession, FeatureAccessResult, Subscription, SubscriptionHistoryEntry } from "@algowix/shared-types";
import { apiClient } from "../api-client";

export function useSubscriptions() {
  return useQuery({
    queryKey: ["subscriptions"],
    queryFn: () => apiClient.get<Subscription[]>("/api/v1/subscriptions"),
  });
}

export function useSubscription(id: string | undefined) {
  return useQuery({
    queryKey: ["subscriptions", id],
    queryFn: () => apiClient.get<Subscription>(`/api/v1/subscriptions/${id}`),
    enabled: !!id,
  });
}

export function useSubscriptionHistory(id: string | undefined) {
  return useQuery({
    queryKey: ["subscriptions", id, "history"],
    queryFn: () => apiClient.get<SubscriptionHistoryEntry[]>(`/api/v1/subscriptions/${id}/history`),
    enabled: !!id,
  });
}

export function useFeatureAccess(productSlug: string | undefined, feature: string | undefined) {
  return useQuery({
    queryKey: ["subscriptions", "feature-access", productSlug, feature],
    queryFn: () => apiClient.get<FeatureAccessResult>(`/api/v1/subscriptions/feature-access?product=${productSlug}&feature=${feature}`),
    enabled: !!productSlug && !!feature,
  });
}

function useInvalidateSubscriptions() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    queryClient.invalidateQueries({ queryKey: ["billing"] });
  };
}

export function useUpgradeSubscription() {
  const invalidate = useInvalidateSubscriptions();
  return useMutation({
    mutationFn: ({ id, newPlanSlug }: { id: string; newPlanSlug: string }) =>
      apiClient.post<CheckoutSession>(`/api/v1/subscriptions/${id}/upgrade`, { newPlanSlug }),
    onSuccess: invalidate,
  });
}

export function useDowngradeSubscription() {
  const invalidate = useInvalidateSubscriptions();
  return useMutation({
    mutationFn: ({ id, newPlanSlug }: { id: string; newPlanSlug: string }) =>
      apiClient.post<CheckoutSession>(`/api/v1/subscriptions/${id}/downgrade`, { newPlanSlug }),
    onSuccess: invalidate,
  });
}

export function useCancelSubscription() {
  const invalidate = useInvalidateSubscriptions();
  return useMutation({
    mutationFn: ({ id, immediately }: { id: string; immediately?: boolean }) =>
      apiClient.post<Subscription>(`/api/v1/subscriptions/${id}/cancel`, { immediately }),
    onSuccess: invalidate,
  });
}

export function useReactivateSubscription() {
  const invalidate = useInvalidateSubscriptions();
  return useMutation({
    mutationFn: (id: string) => apiClient.post<CheckoutSession>(`/api/v1/subscriptions/${id}/reactivate`),
    onSuccess: invalidate,
  });
}

export function useUpdateSeats() {
  const invalidate = useInvalidateSubscriptions();
  return useMutation({
    mutationFn: ({ id, seatCount }: { id: string; seatCount: number }) =>
      apiClient.post<Subscription>(`/api/v1/subscriptions/${id}/seats`, { seatCount }),
    onSuccess: invalidate,
  });
}
