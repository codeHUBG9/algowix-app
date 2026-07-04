import type { Request, Response } from "express";
import { developerService } from "./developer.service.js";
import { sendSuccess, sendPaginated } from "../../utils/respond.js";
import { ValidationError } from "../../utils/errors.js";

export const developerController = {
  async rateLimits(req: Request, res: Response) {
    sendSuccess(res, await developerService.rateLimitStatus(req.auth!.organizationId, req.auth!.plan));
  },

  async usage(req: Request, res: Response) {
    sendSuccess(res, await developerService.usage(req.auth!.organizationId));
  },

  async logs(req: Request, res: Response) {
    const page = Number(req.query.page ?? 1);
    const limit = Math.min(Number(req.query.limit ?? 25), 100);
    const [data, total] = await developerService.logs(req.auth!.organizationId, page, limit);
    sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  },

  async apiKeyUsage(req: Request, res: Response) {
    const keyId = req.params.keyId;
    if (!keyId) throw new ValidationError("keyId is required");
    sendSuccess(res, await developerService.apiKeyUsage(req.auth!.organizationId, keyId));
  },
};
