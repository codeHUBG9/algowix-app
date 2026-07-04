"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface FileRecordDto {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: "PENDING" | "READY";
  folder: string | null;
  isPublic: boolean;
  createdAt: string;
}

export function useFiles(folder?: string) {
  const qs = folder ? `?folder=${encodeURIComponent(folder)}` : "";
  return useQuery({
    queryKey: ["files", "list", folder ?? ""],
    queryFn: () => apiClient.get<FileRecordDto[]>(`/api/v1/files${qs}`),
  });
}

export function useStorageUsage() {
  return useQuery({
    queryKey: ["files", "storage-usage"],
    queryFn: () => apiClient.get<{ usedBytes: number; quotaBytes: number | null; plan: string }>("/api/v1/files/storage-usage"),
  });
}

// 16-Files.md §3 — drives all three steps of the upload flow from the
// client: request a presigned URL, PUT the raw bytes, then confirm.
export function useUploadFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, folder }: { file: File; folder?: string }) => {
      const { fileId, uploadUrl } = await apiClient.post<{ fileId: string; uploadUrl: string }>(
        "/api/v1/files/presigned-url",
        { filename: file.name, mimeType: file.type || "application/octet-stream", sizeBytes: file.size, folder }
      );

      const putResponse = await fetch(`${API_URL}${uploadUrl}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!putResponse.ok) throw new Error("Upload failed");

      return apiClient.post<FileRecordDto>(`/api/v1/files/${fileId}/confirm`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/files/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["files"] }),
  });
}

export function fileDownloadUrl(id: string): string {
  return `${API_URL}/api/v1/files/${id}/download`;
}

export function useMyAvatar() {
  return useQuery({
    queryKey: ["files", "avatar"],
    queryFn: () => apiClient.get<{ avatarUrl: string | null }>("/api/v1/files/avatar"),
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.upload<{ avatarUrl: string }>("/api/v1/files/avatar", formData);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["files", "avatar"] }),
  });
}

export function useUploadOrgLogo(organizationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.upload<{ logoUrl: string }>(`/api/v1/organizations/${organizationId}/logo`, formData);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenant"] }),
  });
}
