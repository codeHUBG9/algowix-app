import type { Request, Response } from "express";
import { branchService } from "./branch.service.js";
import { createBranchSchema, updateBranchSchema } from "./organization.schema.js";
import { sendSuccess } from "../../utils/respond.js";

export const branchController = {
  async list(req: Request, res: Response) {
    const branches = await branchService.list(req.params.id!);
    sendSuccess(res, branches);
  },

  async create(req: Request, res: Response) {
    const input = createBranchSchema.parse(req.body);
    const branch = await branchService.create(req.params.id!, input);
    sendSuccess(res, branch, 201);
  },

  async update(req: Request, res: Response) {
    const input = updateBranchSchema.parse(req.body);
    const branch = await branchService.update(req.params.id!, req.params.branchId!, input);
    sendSuccess(res, branch);
  },

  async remove(req: Request, res: Response) {
    await branchService.remove(req.params.id!, req.params.branchId!);
    sendSuccess(res, { deleted: true });
  },
};
