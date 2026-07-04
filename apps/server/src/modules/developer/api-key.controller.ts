import type { Request, Response } from "express";
import { apiKeyService } from "./api-key.service.js";
import { createApiKeySchema } from "./api-key.schema.js";
import { sendSuccess } from "../../utils/respond.js";
import { UnauthorizedError, ValidationError } from "../../utils/errors.js";

function orgIdFromParams(req: Request): string {
  const id = req.params.id;
  if (!id) throw new ValidationError("Organization id is required");
  return id;
}

export const apiKeyController = {
  async list(req: Request, res: Response) {
    const keys = await apiKeyService.list(orgIdFromParams(req));
    sendSuccess(res, keys);
  },

  async create(req: Request, res: Response) {
    if (!req.auth) throw new UnauthorizedError();
    const input = createApiKeySchema.parse(req.body);
    const key = await apiKeyService.create(orgIdFromParams(req), req.auth.userId, input);
    sendSuccess(res, key, 201);
  },

  async revoke(req: Request, res: Response) {
    const keyId = req.params.keyId;
    if (!keyId) throw new ValidationError("keyId is required");
    await apiKeyService.revoke(orgIdFromParams(req), keyId);
    sendSuccess(res, { revoked: true });
  },
};
