"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api-client";
import { useCurrentSession } from "./use-current-session";

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  environment: "live" | "test";
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateApiKeyInput {
  name: string;
  scopes: string[];
  environment?: "live" | "test";
  expiresAt?: string;
}

function useOrgId(): string | undefined {
  const { data } = useCurrentSession();
  return data?.auth.organizationId;
}

export function useApiKeys() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["org", orgId, "api-keys"],
    queryFn: () => apiClient.get<ApiKey[]>(`/api/v1/organizations/${orgId}/api-keys`),
    enabled: !!orgId,
  });
}

export function useCreateApiKey() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateApiKeyInput) =>
      apiClient.post<ApiKey & { rawKey: string }>(`/api/v1/organizations/${orgId}/api-keys`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["org", orgId, "api-keys"] }),
  });
}

export function useRevokeApiKey() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => apiClient.delete(`/api/v1/organizations/${orgId}/api-keys/${keyId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["org", orgId, "api-keys"] }),
  });
}
