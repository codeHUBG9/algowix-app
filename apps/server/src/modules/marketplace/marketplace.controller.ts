import type { Request, Response } from "express";
import { marketplaceService } from "./marketplace.service.js";
import { sendSuccess } from "../../utils/respond.js";

export const marketplaceController = {
  async browse(req: Request, res: Response) {
    sendSuccess(res, await marketplaceService.browse(req.auth!.organizationId));
  },

  async install(req: Request, res: Response) {
    sendSuccess(res, await marketplaceService.install(req.auth!.organizationId, req.auth!.userId, req.params.id!));
  },

  async uninstall(req: Request, res: Response) {
    sendSuccess(res, await marketplaceService.uninstall(req.auth!.organizationId, req.params.id!));
  },
};
