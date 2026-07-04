import { z } from "zod";

export const INVENTORY_STATUSES = ["ACTIVE", "INACTIVE", "DISCONTINUED"] as const;
export const MOVEMENT_TYPES = ["IN", "OUT", "ADJUSTMENT"] as const;

export const createInventoryItemSchema = z.object({
  sku: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  category: z.string().trim().max(100).optional().or(z.literal("")),
  quantity: z.coerce.number().int().min(0).default(0),
  reorderPoint: z.coerce.number().int().min(0).default(10),
  unitCost: z.coerce.number().min(0),
  unitPrice: z.coerce.number().min(0),
  location: z.string().trim().max(255).optional().or(z.literal("")),
  status: z.enum(INVENTORY_STATUSES).default("ACTIVE"),
});
export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;

export const updateInventoryItemSchema = createInventoryItemSchema.partial();
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;

export const inventoryQuerySchema = z.object({
  category: z.string().trim().optional(),
  status: z.enum(INVENTORY_STATUSES).optional(),
  lowStockOnly: z.coerce.boolean().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type InventoryQueryInput = z.infer<typeof inventoryQuerySchema>;

export const createMovementSchema = z.object({
  type: z.enum(MOVEMENT_TYPES),
  quantity: z.coerce.number().int().positive(),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});
export type CreateMovementInput = z.infer<typeof createMovementSchema>;
