import type { Request, Response } from "express";
import { webhookService } from "./webhook.service.js";
import { createWebhookSchema, updateWebhookSchema } from "./webhook.schema.js";
import { WEBHOOK_EVENTS } from "./webhook.constants.js";
import { sendSuccess } from "../../utils/respond.js";

export const webhookController = {
  async listEvents(_req: Request, res: Response) {
    sendSuccess(res, WEBHOOK_EVENTS);
  },

  async list(req: Request, res: Response) {
    sendSuccess(res, await webhookService.list(req.auth!.organizationId));
  },

  async getById(req: Request, res: Response) {
    sendSuccess(res, await webhookService.getById(req.auth!.organizationId, req.params.id!));
  },

  async create(req: Request, res: Response) {
    const input = createWebhookSchema.parse(req.body);
    sendSuccess(res, await webhookService.create(req.auth!.organizationId, input), 201);
  },

  async update(req: Request, res: Response) {
    const input = updateWebhookSchema.parse(req.body);
    sendSuccess(res, await webhookService.update(req.auth!.organizationId, req.params.id!, input));
  },

  async remove(req: Request, res: Response) {
    await webhookService.delete(req.auth!.organizationId, req.params.id!);
    sendSuccess(res, { success: true });
  },

  async test(req: Request, res: Response) {
    sendSuccess(res, await webhookService.test(req.auth!.organizationId, req.params.id!));
  },

  async deliveries(req: Request, res: Response) {
    sendSuccess(res, await webhookService.deliveries(req.auth!.organizationId, req.params.id!));
  },

  async retryFailed(req: Request, res: Response) {
    sendSuccess(res, await webhookService.retryFailedDeliveries(req.auth!.organizationId));
  },
};
