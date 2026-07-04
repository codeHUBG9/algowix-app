import type { Request, Response } from "express";
import { subscriptionService } from "./subscription.service.js";
import { featureGateService } from "./feature-gate.service.js";
import {
  createSubscriptionSchema,
  upgradeSubscriptionSchema,
  downgradeSubscriptionSchema,
  updateSeatsSchema,
  cancelSubscriptionSchema,
  featureAccessQuerySchema,
} from "./subscription.schema.js";
import { sendSuccess } from "../../utils/respond.js";
import { UnauthorizedError } from "../../utils/errors.js";

function actor(req: Request) {
  if (!req.auth) throw new UnauthorizedError();
  return { userId: req.auth.userId, email: req.auth.email };
}

export const subscriptionController = {
  async list(req: Request, res: Response) {
    if (!req.auth) throw new UnauthorizedError();
    sendSuccess(res, await subscriptionService.list(req.auth.organizationId));
  },

  async getById(req: Request, res: Response) {
    if (!req.auth) throw new UnauthorizedError();
    sendSuccess(res, await subscriptionService.getById(req.auth.organizationId, req.params.id!));
  },

  async create(req: Request, res: Response) {
    if (!req.tenant) throw new UnauthorizedError();
    const input = createSubscriptionSchema.parse(req.body);
    sendSuccess(res, await subscriptionService.create(req.tenant, actor(req), input), 201);
  },

  async upgrade(req: Request, res: Response) {
    if (!req.tenant) throw new UnauthorizedError();
    const input = upgradeSubscriptionSchema.parse(req.body);
    sendSuccess(res, await subscriptionService.upgrade(req.tenant, actor(req), req.params.id!, input));
  },

  async downgrade(req: Request, res: Response) {
    if (!req.tenant) throw new UnauthorizedError();
    const input = downgradeSubscriptionSchema.parse(req.body);
    sendSuccess(res, await subscriptionService.downgrade(req.tenant, actor(req), req.params.id!, input));
  },

  async cancel(req: Request, res: Response) {
    if (!req.tenant) throw new UnauthorizedError();
    const input = cancelSubscriptionSchema.parse(req.body ?? {});
    sendSuccess(res, await subscriptionService.cancel(req.tenant, actor(req), req.params.id!, input));
  },

  async reactivate(req: Request, res: Response) {
    if (!req.tenant) throw new UnauthorizedError();
    sendSuccess(res, await subscriptionService.reactivate(req.tenant, actor(req), req.params.id!));
  },

  async usage(req: Request, res: Response) {
    if (!req.auth) throw new UnauthorizedError();
    sendSuccess(res, await subscriptionService.usage(req.auth.organizationId, req.params.id!));
  },

  async history(req: Request, res: Response) {
    if (!req.auth) throw new UnauthorizedError();
    sendSuccess(res, await subscriptionService.history(req.auth.organizationId, req.params.id!));
  },

  async updateSeats(req: Request, res: Response) {
    if (!req.tenant) throw new UnauthorizedError();
    const input = updateSeatsSchema.parse(req.body);
    sendSuccess(res, await subscriptionService.updateSeats(req.tenant, actor(req), req.params.id!, input));
  },

  async featureAccess(req: Request, res: Response) {
    if (!req.auth) throw new UnauthorizedError();
    const query = featureAccessQuerySchema.parse(req.query);
    sendSuccess(res, await featureGateService.canAccess(req.auth.organizationId, query.product, query.feature));
  },
};
