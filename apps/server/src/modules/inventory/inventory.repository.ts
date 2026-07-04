import { prisma } from "../../database/prisma.js";
import { tenantScopedClient } from "../../database/tenant-scope.js";
import type { CreateInventoryItemInput, InventoryQueryInput, UpdateInventoryItemInput } from "./inventory.schema.js";

export const inventoryRepository = {
  async list(organizationId: string, query: InventoryQueryInput) {
    const client = tenantScopedClient(organizationId);
    const where = {
      ...(query.category ? { category: query.category } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { sku: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      client.inventoryItem.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      client.inventoryItem.count({ where }),
    ]);

    const filtered = query.lowStockOnly ? items.filter((i) => i.quantity <= i.reorderPoint) : items;
    return { items: filtered, total };
  },

  findById(organizationId: string, id: string) {
    return tenantScopedClient(organizationId).inventoryItem.findFirst({
      where: { id },
      include: { movements: { orderBy: { createdAt: "desc" }, take: 50 } },
    });
  },

  findBySku(organizationId: string, sku: string) {
    return tenantScopedClient(organizationId).inventoryItem.findFirst({ where: { sku } });
  },

  lowStock(organizationId: string) {
    return prisma.inventoryItem.findMany({
      where: { organizationId, status: "ACTIVE" },
    }).then((items) => items.filter((i) => i.quantity <= i.reorderPoint));
  },

  create(organizationId: string, data: CreateInventoryItemInput) {
    return tenantScopedClient(organizationId).inventoryItem.create({
      data: {
        organizationId,
        sku: data.sku,
        name: data.name,
        description: data.description || null,
        category: data.category || null,
        quantity: data.quantity,
        reorderPoint: data.reorderPoint,
        unitCost: data.unitCost,
        unitPrice: data.unitPrice,
        location: data.location || null,
        status: data.status,
      },
    });
  },

  update(organizationId: string, id: string, data: UpdateInventoryItemInput) {
    return tenantScopedClient(organizationId).inventoryItem.update({
      where: { id },
      data: {
        ...(data.sku !== undefined ? { sku: data.sku } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.category !== undefined ? { category: data.category || null } : {}),
        ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
        ...(data.reorderPoint !== undefined ? { reorderPoint: data.reorderPoint } : {}),
        ...(data.unitCost !== undefined ? { unitCost: data.unitCost } : {}),
        ...(data.unitPrice !== undefined ? { unitPrice: data.unitPrice } : {}),
        ...(data.location !== undefined ? { location: data.location || null } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });
  },

  delete(organizationId: string, id: string) {
    return tenantScopedClient(organizationId).inventoryItem.delete({ where: { id } });
  },

  adjustQuantity(id: string, delta: number) {
    return prisma.inventoryItem.update({
      where: { id },
      data: { quantity: { increment: delta } },
    });
  },

  createMovement(itemId: string, data: { type: string; quantity: number; reason: string | null; performedBy: string }) {
    return prisma.inventoryMovement.create({ data: { itemId, ...data } });
  },
};
