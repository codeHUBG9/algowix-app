"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api-client";

export type InventoryStatus = "ACTIVE" | "INACTIVE" | "DISCONTINUED";
export type MovementType = "IN" | "OUT" | "ADJUSTMENT";

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  quantity: number;
  reorderPoint: number;
  unitCost: string;
  unitPrice: string;
  location: string | null;
  status: InventoryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryMovement {
  id: string;
  itemId: string;
  type: MovementType;
  quantity: number;
  reason: string | null;
  performedBy: string;
  createdAt: string;
}

export interface InventoryItemDetail extends InventoryItem {
  movements: InventoryMovement[];
}

export interface InventoryItemInput {
  sku: string;
  name: string;
  description?: string;
  category?: string;
  quantity: number;
  reorderPoint: number;
  unitCost: number;
  unitPrice: number;
  location?: string;
  status: InventoryStatus;
}

export function useInventoryItems(filters?: { lowStockOnly?: boolean }) {
  const lowStockParam = filters?.lowStockOnly ? "&lowStockOnly=true" : "";
  return useQuery({
    queryKey: ["inventory", "items", filters],
    queryFn: () => apiClient.get<InventoryItem[]>(`/api/v1/inventory?limit=100${lowStockParam}`),
  });
}

export function useInventoryItem(id: string | undefined) {
  return useQuery({
    queryKey: ["inventory", "items", id],
    queryFn: () => apiClient.get<InventoryItemDetail>(`/api/v1/inventory/${id}`),
    enabled: !!id,
  });
}

export function useLowStockItems() {
  return useQuery({
    queryKey: ["inventory", "low-stock"],
    queryFn: () => apiClient.get<InventoryItem[]>("/api/v1/inventory/low-stock"),
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InventoryItemInput) => apiClient.post<InventoryItem>("/api/v1/inventory", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useUpdateInventoryItem(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<InventoryItemInput>) => apiClient.patch<InventoryItem>(`/api/v1/inventory/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<{ deleted: true }>(`/api/v1/inventory/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useRecordMovement(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { type: MovementType; quantity: number; reason?: string }) =>
      apiClient.post<{ movement: InventoryMovement; item: InventoryItem }>(`/api/v1/inventory/${id}/movement`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}
