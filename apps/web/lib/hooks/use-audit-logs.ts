"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api-client";

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorType: string;
  actorEmail: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  ipAddress: string | null;
  severity: "INFO" | "WARNING" | "CRITICAL";
  createdAt: string;
}

export interface AuditFilters {
  from?: string;
  to?: string;
  action?: string;
  resource?: string;
  severity?: string;
  ipAddress?: string;
  page?: number;
  limit?: number;
}

function toQueryString(filters: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return params.toString();
}

export function useAuditLogs(filters: AuditFilters) {
  const qs = toQueryString({ ...filters, page: filters.page ?? 1, limit: filters.limit ?? 25 });
  return useQuery({
    queryKey: ["audit", "list", qs],
    queryFn: () => apiClient.get<AuditLogEntry[]>(`/api/v1/audit?${qs}`),
  });
}

export interface AuditStats {
  totalEvents: number;
  eventsPerDay: { date: string; count: number }[];
  topActors: { actorId: string; actorEmail: string | null; count: number }[];
  eventsBySeverity: Record<string, number>;
}

export function useAuditStats() {
  return useQuery({
    queryKey: ["audit", "stats"],
    queryFn: () => apiClient.get<AuditStats>("/api/v1/audit/stats"),
  });
}

export function auditExportUrl(filters: AuditFilters, format: "csv" | "json") {
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const qs = toQueryString({ ...filters, format, page: undefined, limit: undefined });
  return `${API_URL}/api/v1/audit/export?${qs}`;
}
