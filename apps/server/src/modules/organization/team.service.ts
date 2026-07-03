import { teamRepository } from "./team.repository.js";
import { ConflictError, NotFoundError, ValidationError } from "../../utils/errors.js";
import type { CreateTeamInput, UpdateTeamInput, AddTeamMemberInput } from "./organization.schema.js";

type TeamWithMembers = Awaited<ReturnType<typeof teamRepository.findById>>;

function toPublicTeam(team: NonNullable<TeamWithMembers>) {
  return {
    id: team.id,
    name: team.name,
    description: team.description,
    members: team.members.map((m) => ({
      id: m.id,
      role: m.role,
      joinedAt: m.joinedAt,
      user: m.user,
    })),
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  };
}

export const teamService = {
  async list(organizationId: string) {
    const teams = await teamRepository.list(organizationId);
    return teams.map(toPublicTeam);
  },

  async create(organizationId: string, input: CreateTeamInput) {
    const team = await teamRepository.create(organizationId, {
      name: input.name,
      description: input.description || null,
    });

    for (const userId of input.memberIds ?? []) {
      const membership = await teamRepository.findActiveMembership(organizationId, userId);
      if (!membership) continue; // skip silently — not an org member (or not active)
      await teamRepository.addMember(team.id, userId, "MEMBER");
    }

    const refreshed = await teamRepository.findById(organizationId, team.id);
    return toPublicTeam(refreshed!);
  },

  async update(organizationId: string, id: string, input: UpdateTeamInput) {
    const existing = await teamRepository.findById(organizationId, id);
    if (!existing) throw new NotFoundError("Team not found");

    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description || null;

    const team = await teamRepository.update(organizationId, id, data);
    return toPublicTeam(team);
  },

  async remove(organizationId: string, id: string) {
    const existing = await teamRepository.findById(organizationId, id);
    if (!existing) throw new NotFoundError("Team not found");
    await teamRepository.softDelete(organizationId, id);
  },

  async addMember(organizationId: string, teamId: string, input: AddTeamMemberInput) {
    const team = await teamRepository.findById(organizationId, teamId);
    if (!team) throw new NotFoundError("Team not found");

    const membership = await teamRepository.findActiveMembership(organizationId, input.userId);
    if (!membership) throw new ValidationError("User must be an active organization member");

    const existingTeamMember = await teamRepository.findMember(teamId, input.userId);
    if (existingTeamMember) throw new ConflictError("User is already a member of this team");

    await teamRepository.addMember(teamId, input.userId, input.role ?? "MEMBER");

    const refreshed = await teamRepository.findById(organizationId, teamId);
    return toPublicTeam(refreshed!);
  },

  async removeMember(organizationId: string, teamId: string, userId: string) {
    const team = await teamRepository.findById(organizationId, teamId);
    if (!team) throw new NotFoundError("Team not found");

    const existingTeamMember = await teamRepository.findMember(teamId, userId);
    if (!existingTeamMember) throw new NotFoundError("User is not a member of this team");

    await teamRepository.removeMember(teamId, userId);
  },
};
