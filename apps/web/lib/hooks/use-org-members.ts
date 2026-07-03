"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  OrgMember,
  OrgInvite,
  OrgRole,
  InviteMemberFormInput,
  UpdateMemberStatusFormInput,
} from "@algowix/shared-types";
import { apiClient } from "../api-client";
import { useCurrentSession } from "./use-current-session";

function useOrgId(): string | undefined {
  const { data } = useCurrentSession();
  return data?.auth.organizationId;
}

export interface MemberFilters {
  status?: "ACTIVE" | "INVITED" | "SUSPENDED";
  search?: string;
  page?: number;
  limit?: number;
}

function toQueryString(filters: MemberFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  params.set("page", String(filters.page ?? 1));
  params.set("limit", String(filters.limit ?? 20));
  return params.toString();
}

export function useMembers(filters: MemberFilters = {}) {
  const orgId = useOrgId();
  const qs = toQueryString(filters);
  return useQuery({
    queryKey: ["org", orgId, "members", qs],
    queryFn: () => apiClient.get<OrgMember[]>(`/api/v1/organizations/${orgId}/members?${qs}`),
    enabled: !!orgId,
  });
}

export function useUpdateMemberStatus() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: UpdateMemberStatusFormInput }) =>
      apiClient.patch<OrgMember>(`/api/v1/organizations/${orgId}/members/${userId}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["org", orgId, "members"] }),
  });
}

export function useRemoveMember() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => apiClient.delete(`/api/v1/organizations/${orgId}/members/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["org", orgId, "members"] }),
  });
}

export function useOrgRoles() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["org", orgId, "roles"],
    queryFn: () => apiClient.get<OrgRole[]>(`/api/v1/organizations/${orgId}/roles`),
    enabled: !!orgId,
  });
}

export function useInvites() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["org", orgId, "invites"],
    queryFn: () => apiClient.get<OrgInvite[]>(`/api/v1/organizations/${orgId}/invites`),
    enabled: !!orgId,
  });
}

export function useCreateInvite() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteMemberFormInput) =>
      apiClient.post<{ inviteId: string; email: string; expiresAt: string }>(
        `/api/v1/organizations/${orgId}/invite`,
        input
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["org", orgId, "invites"] }),
  });
}

export function useCancelInvite() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => apiClient.delete(`/api/v1/organizations/${orgId}/invites/${inviteId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["org", orgId, "invites"] }),
  });
}

export interface BulkInviteResult {
  results: { email: string; status: "invited" | "skipped"; reason?: string }[];
}

export function useBulkInvite() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.upload<BulkInviteResult>(`/api/v1/organizations/${orgId}/invite/bulk`, formData);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["org", orgId, "invites"] }),
  });
}
