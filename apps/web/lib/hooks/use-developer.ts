"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api-client";

export interface RateLimitStatus {
  limit: number;
  usedThisMinute: number;
  windowSeconds: number;
}

export function useRateLimitStatus() {
  return useQuery({ queryKey: ["developer", "rate-limits"], queryFn: () => apiClient.get<RateLimitStatus>("/api/v1/developer/rate-limits") });
}

export interface UsageReport {
  totalCalls: number;
  byDay: { date: string; total: number; errors: number }[];
}

export function useDeveloperUsage() {
  return useQuery({ queryKey: ["developer", "usage"], queryFn: () => apiClient.get<UsageReport>("/api/v1/developer/usage") });
}

export interface RequestLogEntry {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  latencyMs: number;
  createdAt: string;
}

export function useDeveloperLogs() {
  return useQuery({ queryKey: ["developer", "logs"], queryFn: () => apiClient.get<RequestLogEntry[]>("/api/v1/developer/logs") });
}
