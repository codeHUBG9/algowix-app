import type { Request, Response } from "express";
import { reportsService } from "./reports.service.js";
import { reportExportQuerySchema } from "./reports.schema.js";
import { sendSuccess } from "../../utils/respond.js";

export const reportsController = {
  async dashboard(req: Request, res: Response) {
    sendSuccess(res, await reportsService.dashboard(req.auth!.organizationId));
  },

  async users(req: Request, res: Response) {
    sendSuccess(res, await reportsService.users(req.auth!.organizationId));
  },

  async billing(req: Request, res: Response) {
    sendSuccess(res, await reportsService.billing(req.auth!.organizationId));
  },

  async products(req: Request, res: Response) {
    sendSuccess(res, await reportsService.products(req.auth!.organizationId));
  },

  async auditSummary(req: Request, res: Response) {
    sendSuccess(res, await reportsService.auditSummary(req.auth!.organizationId));
  },

  async export(req: Request, res: Response) {
    const { reportType } = reportExportQuerySchema.parse(req.query);
    const csv = await reportsService.export(req.auth!.organizationId, reportType);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${reportType}-report.csv"`);
    res.send(csv);
  },
};
