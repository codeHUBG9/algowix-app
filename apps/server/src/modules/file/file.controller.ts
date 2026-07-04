import type { Request, Response } from "express";
import { createReadStream } from "node:fs";
import { fileService } from "./file.service.js";
import { filePresignedUrlSchema, fileListQuerySchema } from "./file.schema.js";
import { sendSuccess, sendPaginated } from "../../utils/respond.js";
import { ValidationError } from "../../utils/errors.js";

export const fileController = {
  async requestUpload(req: Request, res: Response) {
    const input = filePresignedUrlSchema.parse(req.body);
    const result = await fileService.requestUpload(req.auth!.organizationId, req.auth!.userId, input);
    sendSuccess(res, result, 201);
  },

  async writeRaw(req: Request, res: Response) {
    if (!Buffer.isBuffer(req.body)) throw new ValidationError("Expected raw binary body");
    await fileService.writeRaw(req.auth!.organizationId, req.params.id!, req.body);
    sendSuccess(res, { success: true });
  },

  async confirm(req: Request, res: Response) {
    const file = await fileService.confirmUpload(req.auth!.organizationId, req.params.id!);
    sendSuccess(res, file);
  },

  async list(req: Request, res: Response) {
    const query = fileListQuerySchema.parse(req.query);
    const { data, total } = await fileService.list(req.auth!.organizationId, query);
    sendPaginated(res, data, { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) });
  },

  async getById(req: Request, res: Response) {
    const file = await fileService.getById(req.auth!.organizationId, req.params.id!);
    sendSuccess(res, file);
  },

  async download(req: Request, res: Response) {
    const { fullPath, originalName, mimeType } = await fileService.getFilePathForDownload(
      req.auth!.organizationId,
      req.params.id!
    );
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${originalName}"`);
    createReadStream(fullPath).pipe(res);
  },

  async remove(req: Request, res: Response) {
    await fileService.delete(req.auth!.organizationId, req.params.id!);
    sendSuccess(res, { success: true });
  },

  async storageUsage(req: Request, res: Response) {
    const usage = await fileService.storageUsage(req.auth!.organizationId);
    sendSuccess(res, usage);
  },

  async uploadAvatar(req: Request, res: Response) {
    if (!req.file) throw new ValidationError("No file uploaded");
    const result = await fileService.uploadAvatar(req.auth!.userId, req.auth!.organizationId, req.file);
    sendSuccess(res, result);
  },

  async getMyAvatar(req: Request, res: Response) {
    const result = await fileService.getMyAvatar(req.auth!.userId);
    sendSuccess(res, result);
  },

  async uploadLogo(req: Request, res: Response) {
    if (!req.file) throw new ValidationError("No file uploaded");
    const result = await fileService.uploadLogo(req.auth!.organizationId, req.auth!.userId, req.file);
    sendSuccess(res, result);
  },
};
