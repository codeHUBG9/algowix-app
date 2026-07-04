"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api-client";

export interface DashboardReport {
  activeUsers: number;
  productsSubscribed: number;
  currentMonthSpend: number;
  upcomingRenewal: string | null;
  storageUsedBytes: number;
  apiCallsThisMonth: number;
  userGrowth: { month: string; count: number }[];
}

export function useDashboardReport() {
  return useQuery({ queryKey: ["reports", "dashboard"], queryFn: () => apiClient.get<DashboardReport>("/api/v1/reports/dashboard") });
}

export interface UsersReport {
  loginsByDay: { date: string; count: number }[];
  mostActiveUsers: { userId: string; name: string; email: string; sessionCount: number }[];
  inactiveUsers: { userId: string; name: string; email: string; lastLoginAt: string | null }[];
  deviceBreakdown: { device: string; count: number }[];
}

export function useUsersReport() {
  return useQuery({ queryKey: ["reports", "users"], queryFn: () => apiClient.get<UsersReport>("/api/v1/reports/users") });
}

export interface BillingReport {
  mrr: number;
  spendByMonth: { month: string; total: number }[];
  invoiceHistory: { id: string; invoiceNumber: string; total: number; status: string; createdAt: string; productName: string }[];
  paymentSuccessRate: number;
  upcomingRenewals: { productName: string; renewsAt: string }[];
  productCostBreakdown: { productName: string; total: number }[];
}

export function useBillingReport() {
  return useQuery({ queryKey: ["reports", "billing"], queryFn: () => apiClient.get<BillingReport>("/api/v1/reports/billing") });
}

export interface ProductUsageReport {
  productName: string;
  planName: string;
  status: string;
  healthStatus: string | null;
  seatCount: number;
  currentPeriodEnd: string;
}

export function useProductsReport() {
  return useQuery({ queryKey: ["reports", "products"], queryFn: () => apiClient.get<ProductUsageReport[]>("/api/v1/reports/products") });
}

export function reportExportUrl(reportType: "users" | "billing" | "products"): string {
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  return `${API_URL}/api/v1/reports/export?reportType=${reportType}`;
}
