"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpdateOrganizationFormInput } from "@algowix/shared-types";
import { apiClient } from "../api-client";

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  industry: string | null;
  size: string | null;
  country: string;
  currency: string;
  timezone: string;
  billingEmail: string;
  status: string;
  plan: string;
  tenancyType: string;
  trialEndsAt: string | null;
  suspendedAt: string | null;
  suspendReason: string | null;
  cancelledAt: string | null;
  purgeScheduledAt: string | null;
  settings: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantMember {
  id: string;
  status: string;
  isPrimary: boolean;
  joinedAt: string;
  user: { id: string; email: string; firstName: string; lastName: string; avatarUrl: string | null };
  role: { id: string; name: string };
}

const TENANT_KEY = ["tenant", "me"];
const MEMBERS_KEY = ["tenant", "members"];

export function useTenant() {
  return useQuery({
    queryKey: TENANT_KEY,
    queryFn: () => apiClient.get<Tenant>("/api/v1/tenants/me"),
    retry: false,
  });
}

export function useTenantMembers() {
  return useQuery({
    queryKey: MEMBERS_KEY,
    queryFn: () => apiClient.get<TenantMember[]>("/api/v1/tenants/me/members"),
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<UpdateOrganizationFormInput>) =>
      apiClient.patch<Tenant>("/api/v1/tenants/me", input),
    onSuccess: (tenant) => {
      queryClient.setQueryData(TENANT_KEY, tenant);
    },
  });
}

export function useCancelTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<Tenant>("/api/v1/tenants/me/cancel"),
    onSuccess: (tenant) => {
      queryClient.setQueryData(TENANT_KEY, tenant);
    },
  });
}
