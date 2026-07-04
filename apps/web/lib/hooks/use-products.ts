"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "../api-client";

export interface ProductPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  monthlyPrice: string;
  annualPrice: string | null;
  currency: string;
  trialDays: number;
  maxSeats: number | null;
  features: string[];
  limits: Record<string, number>;
}

export interface ProductSubscription {
  status: string;
  planId: string;
  seatCount: number;
  trialEndsAt: string | null;
  currentPeriodEnd: string;
  provisioningStatus: string;
  tenantUrl: string | null;
  adminLoginUrl: string | null;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  shortDescription: string | null;
  logoUrl: string | null;
  category: string;
  isBeta: boolean;
  plans: ProductPlan[];
  subscription: ProductSubscription | null;
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: () => apiClient.get<Product[]>("/api/v1/products"),
  });
}

export function useProductPlans(slug: string) {
  return useQuery({
    queryKey: ["products", slug, "plans"],
    queryFn: () => apiClient.get<ProductPlan[]>(`/api/v1/products/${slug}/plans`),
    enabled: !!slug,
  });
}

// 04-System-Design.md §4.2 / 13-RBAC.md §5 — mints an SSO launch token and
// hands back the product's URL carrying it; the caller opens it in a new tab.
export function useLaunchProduct() {
  return useMutation({
    mutationFn: (slug: string) => apiClient.get<{ url: string }>(`/api/v1/products/${slug}/launch`),
  });
}
