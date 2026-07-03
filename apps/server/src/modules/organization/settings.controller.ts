import type { Request, Response } from "express";
import { settingsService } from "./settings.service.js";
import {
  generalSettingsSchema,
  brandingSettingsSchema,
  securitySettingsSchema,
  notificationSettingsSchema,
} from "./organization.schema.js";
import { sendSuccess } from "../../utils/respond.js";

export const settingsController = {
  async getGeneral(req: Request, res: Response) {
    sendSuccess(res, await settingsService.getGeneral(req.params.id!));
  },
  async updateGeneral(req: Request, res: Response) {
    const input = generalSettingsSchema.parse(req.body);
    sendSuccess(res, await settingsService.updateGeneral(req.params.id!, input));
  },

  async getBranding(req: Request, res: Response) {
    sendSuccess(res, await settingsService.getBranding(req.params.id!));
  },
  async updateBranding(req: Request, res: Response) {
    const input = brandingSettingsSchema.parse(req.body);
    sendSuccess(res, await settingsService.updateBranding(req.params.id!, input));
  },

  async getSecurity(req: Request, res: Response) {
    sendSuccess(res, await settingsService.getSecurity(req.params.id!));
  },
  async updateSecurity(req: Request, res: Response) {
    const input = securitySettingsSchema.parse(req.body);
    sendSuccess(res, await settingsService.updateSecurity(req.params.id!, input));
  },

  async getNotifications(req: Request, res: Response) {
    sendSuccess(res, await settingsService.getNotifications(req.params.id!));
  },
  async updateNotifications(req: Request, res: Response) {
    const input = notificationSettingsSchema.parse(req.body);
    sendSuccess(res, await settingsService.updateNotifications(req.params.id!, input));
  },
};
