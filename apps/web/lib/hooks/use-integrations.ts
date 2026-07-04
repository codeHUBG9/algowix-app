"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api-client";

export interface IntegrationDto {
  provider: string;
  name: string;
  category: string;
  scopes: string[];
  status: "CONNECTED" | "DISCONNECTED";
  connectedAt: string | null;
}

export function useIntegrations() {
  return useQuery({ queryKey: ["integrations", "list"], queryFn: () => apiClient.get<IntegrationDto[]>("/api/v1/integrations") });
}

export function useConnectIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (provider: string) => apiClient.post(`/api/v1/integrations/${provider}/connect`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["integrations"] }),
  });
}

export function useDisconnectIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (provider: string) => apiClient.delete(`/api/v1/integrations/${provider}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["integrations"] }),
  });
}
