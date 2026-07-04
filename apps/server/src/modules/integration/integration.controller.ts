import type { Request, Response } from "express";
import { integrationService } from "./integration.service.js";
import { sendSuccess } from "../../utils/respond.js";

export const integrationController = {
  async list(req: Request, res: Response) {
    sendSuccess(res, await integrationService.list(req.auth!.organizationId));
  },

  async connect(req: Request, res: Response) {
    const result = await integrationService.connect(req.auth!.organizationId, req.auth!.userId, req.params.provider!);
    sendSuccess(res, result);
  },

  async disconnect(req: Request, res: Response) {
    await integrationService.disconnect(req.auth!.organizationId, req.params.provider!);
    sendSuccess(res, { success: true });
  },
};
