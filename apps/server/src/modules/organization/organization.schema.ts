import { z } from "zod";
import * as sharedTypes from "@algowix/shared-types";

export const createBranchSchema = sharedTypes.createBranchSchema;
export const updateBranchSchema = sharedTypes.updateBranchSchema;
export const createDepartmentSchema = sharedTypes.createDepartmentSchema;
export const updateDepartmentSchema = sharedTypes.updateDepartmentSchema;
export const createTeamSchema = sharedTypes.createTeamSchema;
export const updateTeamSchema = sharedTypes.updateTeamSchema;
export const addTeamMemberSchema = sharedTypes.addTeamMemberSchema;
export const inviteMemberSchema = sharedTypes.inviteMemberSchema;
export const updateMemberStatusSchema = sharedTypes.updateMemberStatusSchema;
export const updateMemberRoleSchema = sharedTypes.updateMemberRoleSchema;
export const acceptInviteSchema = sharedTypes.acceptInviteSchema;
export const brandingSettingsSchema = sharedTypes.brandingSettingsSchema;
export const securitySettingsSchema = sharedTypes.securitySettingsSchema;
export const notificationSettingsSchema = sharedTypes.notificationSettingsSchema;
export const generalSettingsSchema = sharedTypes.generalSettingsSchema;

export type CreateBranchInput = sharedTypes.CreateBranchFormInput;
export type UpdateBranchInput = sharedTypes.UpdateBranchFormInput;
export type CreateDepartmentInput = sharedTypes.CreateDepartmentFormInput;
export type UpdateDepartmentInput = sharedTypes.UpdateDepartmentFormInput;
export type CreateTeamInput = sharedTypes.CreateTeamFormInput;
export type UpdateTeamInput = sharedTypes.UpdateTeamFormInput;
export type AddTeamMemberInput = sharedTypes.AddTeamMemberFormInput;
export type InviteMemberInput = sharedTypes.InviteMemberFormInput;
export type UpdateMemberStatusInput = sharedTypes.UpdateMemberStatusFormInput;
export type UpdateMemberRoleInput = sharedTypes.UpdateMemberRoleFormInput;
export type AcceptInviteInput = sharedTypes.AcceptInviteFormInput;
export type BrandingSettingsInput = sharedTypes.BrandingSettingsFormInput;
export type SecuritySettingsInput = sharedTypes.SecuritySettingsFormInput;
export type NotificationSettingsInput = sharedTypes.NotificationSettingsFormInput;
export type GeneralSettingsInput = sharedTypes.GeneralSettingsFormInput;

// Server-only schemas (query params, CSV bulk invite) — not shared with web forms.

export const memberQuerySchema = z.object({
  status: z.enum(["ACTIVE", "INVITED", "SUSPENDED"]).optional(),
  roleId: z.string().trim().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type MemberQueryInput = z.infer<typeof memberQuerySchema>;

export const bulkInviteRowSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  role: z.string().trim().min(1),
});

export type BulkInviteRow = z.infer<typeof bulkInviteRowSchema>;
