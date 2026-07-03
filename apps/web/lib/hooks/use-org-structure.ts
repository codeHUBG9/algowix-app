"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Branch,
  Department,
  Team,
  CreateBranchFormInput,
  UpdateBranchFormInput,
  CreateDepartmentFormInput,
  UpdateDepartmentFormInput,
  CreateTeamFormInput,
  UpdateTeamFormInput,
  AddTeamMemberFormInput,
} from "@algowix/shared-types";
import { apiClient } from "../api-client";
import { useCurrentSession } from "./use-current-session";

function useOrgId(): string | undefined {
  const { data } = useCurrentSession();
  return data?.auth.organizationId;
}

// ---------------- Branches ----------------

export function useBranches() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["org", orgId, "branches"],
    queryFn: () => apiClient.get<Branch[]>(`/api/v1/organizations/${orgId}/branches`),
    enabled: !!orgId,
  });
}

export function useCreateBranch() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBranchFormInput) =>
      apiClient.post<Branch>(`/api/v1/organizations/${orgId}/branches`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["org", orgId, "branches"] }),
  });
}

export function useUpdateBranch() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBranchFormInput }) =>
      apiClient.put<Branch>(`/api/v1/organizations/${orgId}/branches/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["org", orgId, "branches"] }),
  });
}

export function useDeleteBranch() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/organizations/${orgId}/branches/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["org", orgId, "branches"] }),
  });
}

// ---------------- Departments ----------------

export function useDepartments() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["org", orgId, "departments"],
    queryFn: () => apiClient.get<Department[]>(`/api/v1/organizations/${orgId}/departments`),
    enabled: !!orgId,
  });
}

export function useCreateDepartment() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDepartmentFormInput) =>
      apiClient.post<Department>(`/api/v1/organizations/${orgId}/departments`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["org", orgId, "departments"] }),
  });
}

export function useUpdateDepartment() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDepartmentFormInput }) =>
      apiClient.put<Department>(`/api/v1/organizations/${orgId}/departments/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["org", orgId, "departments"] }),
  });
}

export function useDeleteDepartment() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/organizations/${orgId}/departments/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["org", orgId, "departments"] }),
  });
}

// ---------------- Teams ----------------

export function useTeams() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["org", orgId, "teams"],
    queryFn: () => apiClient.get<Team[]>(`/api/v1/organizations/${orgId}/teams`),
    enabled: !!orgId,
  });
}

export function useCreateTeam() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTeamFormInput) => apiClient.post<Team>(`/api/v1/organizations/${orgId}/teams`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["org", orgId, "teams"] }),
  });
}

export function useUpdateTeam() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTeamFormInput }) =>
      apiClient.put<Team>(`/api/v1/organizations/${orgId}/teams/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["org", orgId, "teams"] }),
  });
}

export function useDeleteTeam() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/organizations/${orgId}/teams/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["org", orgId, "teams"] }),
  });
}

export function useAddTeamMember() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, input }: { teamId: string; input: AddTeamMemberFormInput }) =>
      apiClient.post<Team>(`/api/v1/organizations/${orgId}/teams/${teamId}/members`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["org", orgId, "teams"] }),
  });
}

export function useRemoveTeamMember() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      apiClient.delete(`/api/v1/organizations/${orgId}/teams/${teamId}/members/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["org", orgId, "teams"] }),
  });
}
