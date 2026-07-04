import { inventoryRepository } from "./inventory.repository.js";
import { ConflictError, NotFoundError, ValidationError } from "../../utils/errors.js";
import type {
  CreateInventoryItemInput,
  CreateMovementInput,
  InventoryQueryInput,
  UpdateInventoryItemInput,
} from "./inventory.schema.js";

export const inventoryService = {
  async list(organizationId: string, query: InventoryQueryInput) {
    return inventoryRepository.list(organizationId, query);
  },

  async getById(organizationId: string, id: string) {
    const item = await inventoryRepository.findById(organizationId, id);
    if (!item) throw new NotFoundError("Inventory item not found");
    return item;
  },

  async lowStock(organizationId: string) {
    return inventoryRepository.lowStock(organizationId);
  },

  async create(organizationId: string, data: CreateInventoryItemInput) {
    const existing = await inventoryRepository.findBySku(organizationId, data.sku);
    if (existing) throw new ConflictError(`SKU "${data.sku}" already exists`);
    return inventoryRepository.create(organizationId, data);
  },

  async update(organizationId: string, id: string, data: UpdateInventoryItemInput) {
    await this.getById(organizationId, id);
    if (data.sku) {
      const existing = await inventoryRepository.findBySku(organizationId, data.sku);
      if (existing && existing.id !== id) throw new ConflictError(`SKU "${data.sku}" already exists`);
    }
    return inventoryRepository.update(organizationId, id, data);
  },

  async delete(organizationId: string, id: string) {
    await this.getById(organizationId, id);
    await inventoryRepository.delete(organizationId, id);
  },

  async recordMovement(organizationId: string, id: string, performedBy: string, input: CreateMovementInput) {
    const item = await this.getById(organizationId, id);
    const reason = input.reason || null;

    const delta = input.type === "OUT" ? -input.quantity : input.type === "IN" ? input.quantity : input.quantity;
    if (input.type === "OUT" && item.quantity < input.quantity) {
      throw new ValidationError(`Cannot remove ${input.quantity} units — only ${item.quantity} in stock`);
    }

    const [movement, updatedItem] = await Promise.all([
      inventoryRepository.createMovement(id, { type: input.type, quantity: input.quantity, reason, performedBy }),
      inventoryRepository.adjustQuantity(id, delta),
    ]);

    return { movement, item: updatedItem };
  },
};
