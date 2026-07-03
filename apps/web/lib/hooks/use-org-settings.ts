"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BrandingSettingsFormInput,
  SecuritySettingsFormInput,
  NotificationSettingsFormInput,
} from "@algowix/shared-types";
import { apiClient } from "../api-client";
import { useCurrentSession } from "./use-current-session";

function useOrgId(): string | undefined {
  const { data } = useCurrentSession();
  return data?.auth.organizationId;
}

function useSettingsCategory<T extends Record<string, unknown>>(category: string) {
  const orgId = useOrgId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["org", orgId, "settings", category],
    queryFn: () => apiClient.get<T>(`/api/v1/organizations/${orgId}/settings/${category}`),
    enabled: !!orgId,
  });

  const mutation = useMutation({
    mutationFn: (input: Partial<T>) => apiClient.put<T>(`/api/v1/organizations/${orgId}/settings/${category}`, input),
    onSuccess: (data) => queryClient.setQueryData(["org", orgId, "settings", category], data),
  });

  return { query, mutation };
}

export function useBrandingSettings() {
  return useSettingsCategory<BrandingSettingsFormInput>("branding");
}

export function useSecuritySettings() {
  return useSettingsCategory<SecuritySettingsFormInput>("security");
}

export function useNotificationSettings() {
  return useSettingsCategory<NotificationSettingsFormInput>("notifications");
}
