"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuthOrganization } from "@algowix/shared-types";
import { apiClient } from "../api-client";

export interface MyOrganization {
  organization: AuthOrganization;
  role: string;
  isPrimary: boolean;
}

export function useMyOrganizations() {
  return useQuery({
    queryKey: ["auth", "my-organizations"],
    queryFn: () => apiClient.get<MyOrganization[]>("/api/v1/auth/my-organizations"),
  });
}

export function useSwitchOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (organizationId: string) =>
      apiClient.post<{ organization: AuthOrganization; expiresAt: string }>("/api/v1/auth/switch-organization", {
        organizationId,
      }),
    onSuccess: () => {
      // The switch rotates the session cookie's org context — everything
      // derived from it (JWT claims, tenant, members, invites) is stale.
      queryClient.clear();
    },
  });
}

export function useSetPrimaryOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (organizationId: string) =>
      apiClient.post<{ organizationId: string; isPrimary: boolean }>("/api/v1/auth/primary-organization", {
        organizationId,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["auth", "my-organizations"] }),
  });
}
