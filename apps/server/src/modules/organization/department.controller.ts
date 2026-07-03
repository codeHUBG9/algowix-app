import type { Request, Response } from "express";
import { departmentService } from "./department.service.js";
import { createDepartmentSchema, updateDepartmentSchema } from "./organization.schema.js";
import { sendSuccess } from "../../utils/respond.js";

export const departmentController = {
  async list(req: Request, res: Response) {
    const departments = await departmentService.list(req.params.id!);
    sendSuccess(res, departments);
  },

  async create(req: Request, res: Response) {
    const input = createDepartmentSchema.parse(req.body);
    const dept = await departmentService.create(req.params.id!, input);
    sendSuccess(res, dept, 201);
  },

  async update(req: Request, res: Response) {
    const input = updateDepartmentSchema.parse(req.body);
    const dept = await departmentService.update(req.params.id!, req.params.deptId!, input);
    sendSuccess(res, dept);
  },

  async remove(req: Request, res: Response) {
    await departmentService.remove(req.params.id!, req.params.deptId!);
    sendSuccess(res, { deleted: true });
  },
};
