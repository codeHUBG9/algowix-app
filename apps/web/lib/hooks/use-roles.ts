"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateRoleFormInput, UpdateRoleFormInput } from "@algowix/shared-types";
import { apiClient } from "../api-client";

// 13-RBAC.md §7 — flat /api/v1/roles + /api/v1/permissions, same self-service
// convention as billing/subscriptions (operates on the caller's own org via
// the JWT, no :orgId in the path). Distinct from useOrgRoles (organization's
// nested minimal picker list) — this is the full RBAC management surface.
export interface RbacPermission {
  id: string;
  resource: string;
  action: string;
  scope: string;
  key: string;
  label: string;
  description: string | null;
}

export interface PermissionCategory {
  category: string;
  permissions: RbacPermission[];
}

export interface RbacRole {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isDefault: boolean;
  permissions: { id: string; key: string; resource: string; action: string; scope: string }[];
  productAccess: { productId: string; slug: string; name: string }[];
  memberCount?: number;
}

export function useRbacRoles() {
  return useQuery({
    queryKey: ["rbac", "roles"],
    queryFn: () => apiClient.get<RbacRole[]>("/api/v1/roles"),
  });
}

export function usePermissionCatalog() {
  return useQuery({
    queryKey: ["rbac", "permissions", "catalog"],
    queryFn: () => apiClient.get<PermissionCategory[]>("/api/v1/permissions/catalog"),
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRoleFormInput) => apiClient.post<RbacRole>("/api/v1/roles", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rbac", "roles"] }),
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRoleFormInput }) =>
      apiClient.put<RbacRole>(`/api/v1/roles/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rbac", "roles"] }),
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/roles/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rbac", "roles"] }),
  });
}
