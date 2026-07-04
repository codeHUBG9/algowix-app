"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api-client";

export interface MarketplaceListingDto {
  id: string;
  slug: string;
  name: string;
  description: string;
  developerName: string;
  type: string;
  price: number | null;
  logoUrl: string | null;
  category: string;
  rating: number;
  reviewCount: number;
  installCount: number;
  tags: string[];
  installed: boolean;
}

export function useMarketplace() {
  return useQuery({ queryKey: ["marketplace", "list"], queryFn: () => apiClient.get<MarketplaceListingDto[]>("/api/v1/marketplace") });
}

export function useInstallApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => apiClient.post(`/api/v1/marketplace/${slug}/install`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["marketplace"] }),
  });
}

export function useUninstallApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => apiClient.delete(`/api/v1/marketplace/${slug}/uninstall`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["marketplace"] }),
  });
}
