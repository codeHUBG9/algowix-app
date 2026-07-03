import type { Request, Response } from "express";
import { teamService } from "./team.service.js";
import { createTeamSchema, updateTeamSchema, addTeamMemberSchema } from "./organization.schema.js";
import { sendSuccess } from "../../utils/respond.js";

export const teamController = {
  async list(req: Request, res: Response) {
    const teams = await teamService.list(req.params.id!);
    sendSuccess(res, teams);
  },

  async create(req: Request, res: Response) {
    const input = createTeamSchema.parse(req.body);
    const team = await teamService.create(req.params.id!, input);
    sendSuccess(res, team, 201);
  },

  async update(req: Request, res: Response) {
    const input = updateTeamSchema.parse(req.body);
    const team = await teamService.update(req.params.id!, req.params.teamId!, input);
    sendSuccess(res, team);
  },

  async remove(req: Request, res: Response) {
    await teamService.remove(req.params.id!, req.params.teamId!);
    sendSuccess(res, { deleted: true });
  },

  async addMember(req: Request, res: Response) {
    const input = addTeamMemberSchema.parse(req.body);
    const team = await teamService.addMember(req.params.id!, req.params.teamId!, input);
    sendSuccess(res, team, 201);
  },

  async removeMember(req: Request, res: Response) {
    await teamService.removeMember(req.params.id!, req.params.teamId!, req.params.userId!);
    sendSuccess(res, { removed: true });
  },
};
