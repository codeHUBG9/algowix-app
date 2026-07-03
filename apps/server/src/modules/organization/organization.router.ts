import { Router } from "express";
import multer from "multer";
import { authenticate } from "../../middleware/authenticate.js";
import { resolveTenantContext } from "../../middleware/tenantContext.js";
import { requireOwnOrganization } from "../../middleware/requireOwnOrganization.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { branchController } from "./branch.controller.js";
import { departmentController } from "./department.controller.js";
import { teamController } from "./team.controller.js";
import { memberController } from "./member.controller.js";
import { inviteController } from "./invite.controller.js";
import { settingsController } from "./settings.controller.js";
import { roleController } from "./role.controller.js";
import { organizationProfileController } from "./organization-profile.controller.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024 } });

export const organizationRouter = Router({ mergeParams: true });

organizationRouter.use("/:id", authenticate, resolveTenantContext, requireOwnOrganization);

// Organization profile — §1 / §10 (thin aliases over tenantService; see organization-profile.controller.ts)
organizationRouter.get(
  "/:id",
  requirePermission("organization.read"),
  asyncHandler(organizationProfileController.getOne)
);
organizationRouter.put(
  "/:id",
  requirePermission("organization.update"),
  asyncHandler(organizationProfileController.updateOne)
);

// Branches — 08-Organization-Management.md §3
organizationRouter.get("/:id/branches", requirePermission("branches.read"), asyncHandler(branchController.list));
organizationRouter.post("/:id/branches", requirePermission("branches.create"), asyncHandler(branchController.create));
organizationRouter.put(
  "/:id/branches/:branchId",
  requirePermission("branches.update"),
  asyncHandler(branchController.update)
);
organizationRouter.delete(
  "/:id/branches/:branchId",
  requirePermission("branches.delete"),
  asyncHandler(branchController.remove)
);

// Departments — §4
organizationRouter.get(
  "/:id/departments",
  requirePermission("departments.read"),
  asyncHandler(departmentController.list)
);
organizationRouter.post(
  "/:id/departments",
  requirePermission("departments.create"),
  asyncHandler(departmentController.create)
);
organizationRouter.put(
  "/:id/departments/:deptId",
  requirePermission("departments.update"),
  asyncHandler(departmentController.update)
);
organizationRouter.delete(
  "/:id/departments/:deptId",
  requirePermission("departments.delete"),
  asyncHandler(departmentController.remove)
);

// Teams — §5
organizationRouter.get("/:id/teams", requirePermission("teams.read"), asyncHandler(teamController.list));
organizationRouter.post("/:id/teams", requirePermission("teams.create"), asyncHandler(teamController.create));
organizationRouter.put("/:id/teams/:teamId", requirePermission("teams.update"), asyncHandler(teamController.update));
organizationRouter.delete(
  "/:id/teams/:teamId",
  requirePermission("teams.delete"),
  asyncHandler(teamController.remove)
);
organizationRouter.post(
  "/:id/teams/:teamId/members",
  requirePermission("teams.manage_members"),
  asyncHandler(teamController.addMember)
);
organizationRouter.delete(
  "/:id/teams/:teamId/members/:userId",
  requirePermission("teams.manage_members"),
  asyncHandler(teamController.removeMember)
);

// Roles (minimal — full RBAC is 13-RBAC.md) — needed for invite/member role pickers
organizationRouter.get("/:id/roles", requirePermission("roles.read"), asyncHandler(roleController.list));

// Members — §6
organizationRouter.get("/:id/members", requirePermission("users.read"), asyncHandler(memberController.list));
organizationRouter.patch(
  "/:id/members/:userId",
  requirePermission("users.update"),
  asyncHandler(memberController.updateStatus)
);
organizationRouter.delete(
  "/:id/members/:userId",
  requirePermission("users.remove"),
  asyncHandler(memberController.remove)
);

// Invitations — §7
organizationRouter.get("/:id/invites", requirePermission("users.invite"), asyncHandler(inviteController.list));
organizationRouter.post("/:id/invite", requirePermission("users.invite"), asyncHandler(inviteController.create));
organizationRouter.delete(
  "/:id/invites/:inviteId",
  requirePermission("users.invite"),
  asyncHandler(inviteController.cancel)
);
organizationRouter.post(
  "/:id/invite/bulk",
  requirePermission("users.invite"),
  upload.single("file"),
  asyncHandler(inviteController.bulkCreate)
);

// Settings — §8
organizationRouter.get(
  "/:id/settings/general",
  requirePermission("organization.read"),
  asyncHandler(settingsController.getGeneral)
);
organizationRouter.put(
  "/:id/settings/general",
  requirePermission("organization.update"),
  asyncHandler(settingsController.updateGeneral)
);
organizationRouter.get(
  "/:id/settings/branding",
  requirePermission("organization.read"),
  asyncHandler(settingsController.getBranding)
);
organizationRouter.put(
  "/:id/settings/branding",
  requirePermission("organization.update"),
  asyncHandler(settingsController.updateBranding)
);
organizationRouter.get(
  "/:id/settings/security",
  requirePermission("organization.read"),
  asyncHandler(settingsController.getSecurity)
);
organizationRouter.put(
  "/:id/settings/security",
  requirePermission("organization.update"),
  asyncHandler(settingsController.updateSecurity)
);
organizationRouter.get(
  "/:id/settings/notifications",
  requirePermission("organization.read"),
  asyncHandler(settingsController.getNotifications)
);
organizationRouter.put(
  "/:id/settings/notifications",
  requirePermission("organization.update"),
  asyncHandler(settingsController.updateNotifications)
);
