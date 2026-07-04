import type { Request, Response } from "express";
import { auditService } from "./audit.service.js";
import { auditQuerySchema, auditExportQuerySchema } from "./audit.schema.js";
import { sendSuccess, sendPaginated } from "../../utils/respond.js";

export const auditController = {
  async list(req: Request, res: Response) {
    const query = auditQuerySchema.parse(req.query);
    const { data, total } = await auditService.list(req.auth!.organizationId, query);
    sendPaginated(res, data, { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) });
  },

  async getById(req: Request, res: Response) {
    const entry = await auditService.getById(req.auth!.organizationId, req.params.id!);
    sendSuccess(res, entry);
  },

  async stats(req: Request, res: Response) {
    const { from, to } = req.query as { from?: string; to?: string };
    const stats = await auditService.stats(req.auth!.organizationId, from, to);
    sendSuccess(res, stats);
  },

  async export(req: Request, res: Response) {
    const query = auditExportQuerySchema.parse(req.query);
    const { contentType, body } = await auditService.exportRows(req.auth!.organizationId, query);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="audit-log.${query.format}"`);
    res.send(body);
  },
};
