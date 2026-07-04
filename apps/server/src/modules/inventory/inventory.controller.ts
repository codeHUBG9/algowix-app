import type { Request, Response } from "express";
import { inventoryService } from "./inventory.service.js";
import {
  createInventoryItemSchema,
  createMovementSchema,
  inventoryQuerySchema,
  updateInventoryItemSchema,
} from "./inventory.schema.js";
import { sendPaginated, sendSuccess } from "../../utils/respond.js";
import { UnauthorizedError } from "../../utils/errors.js";

export const inventoryController = {
  async list(req: Request, res: Response) {
    if (!req.auth) throw new UnauthorizedError();
    const query = inventoryQuerySchema.parse(req.query);
    const { items, total } = await inventoryService.list(req.auth.organizationId, query);
    sendPaginated(res, items, { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) });
  },

  async lowStock(req: Request, res: Response) {
    if (!req.auth) throw new UnauthorizedError();
    const items = await inventoryService.lowStock(req.auth.organizationId);
    sendSuccess(res, items);
  },

  async getById(req: Request, res: Response) {
    if (!req.auth) throw new UnauthorizedError();
    const item = await inventoryService.getById(req.auth.organizationId, req.params.id!);
    sendSuccess(res, item);
  },

  async create(req: Request, res: Response) {
    if (!req.auth) throw new UnauthorizedError();
    const input = createInventoryItemSchema.parse(req.body);
    const item = await inventoryService.create(req.auth.organizationId, input);
    sendSuccess(res, item, 201);
  },

  async update(req: Request, res: Response) {
    if (!req.auth) throw new UnauthorizedError();
    const input = updateInventoryItemSchema.parse(req.body);
    const item = await inventoryService.update(req.auth.organizationId, req.params.id!, input);
    sendSuccess(res, item);
  },

  async remove(req: Request, res: Response) {
    if (!req.auth) throw new UnauthorizedError();
    await inventoryService.delete(req.auth.organizationId, req.params.id!);
    sendSuccess(res, { deleted: true });
  },

  async recordMovement(req: Request, res: Response) {
    if (!req.auth) throw new UnauthorizedError();
    const input = createMovementSchema.parse(req.body);
    const result = await inventoryService.recordMovement(req.auth.organizationId, req.params.id!, req.auth.userId, input);
    sendSuccess(res, result, 201);
  },
};
