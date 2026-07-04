import { roleRepository } from "./role.repository.js";
import { permissionRepository } from "./permission.repository.js";
import { productRepository } from "../product/product.repository.js";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../../utils/errors.js";
import { isPlanAtLeast } from "../../utils/planTier.js";
import type { CreateRoleInput, UpdateRoleInput } from "./role.schema.js";

type RoleWithRelations = Awaited<ReturnType<typeof roleRepository.findForOrg>>;

function permissionKey(p: { resource: string; action: string }): string {
  return `${p.resource}.${p.action}`;
}

function toPublicRole(role: NonNullable<RoleWithRelations>, memberCount?: number) {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    isDefault: role.isDefault,
    permissions: role.permissions.map((rp) => ({
      id: rp.permission.id,
      key: permissionKey(rp.permission),
      resource: rp.permission.resource,
      action: rp.permission.action,
      scope: rp.permission.scope,
    })),
    productAccess: role.productAccess.map((pa) => ({
      productId: pa.product.id,
      slug: pa.product.slug,
      name: pa.product.name,
    })),
    memberCount,
  };
}

// Resolves the requested permission ids against the DB, enforcing 13-RBAC.md
// §4's role constraints: no `global`-scope permission can be handed out via
// this API, and the resulting set can never exceed the creator's own
// permissions (a Member can't invent a role with more power than themselves).
async function resolveAndValidatePermissions(permissionIds: string[], creatorPermissions: string[]) {
  const permissions = await permissionRepository.findByIds(permissionIds);
  if (permissions.length !== permissionIds.length) {
    throw new ValidationError("One or more permissions were not found");
  }

  const globalScoped = permissions.find((p) => p.scope === "global");
  if (globalScoped) {
    throw new ForbiddenError("Cannot assign a platform-wide (global scope) permission to an organization role");
  }

  const creatorSet = new Set(creatorPermissions);
  const beyondCreator = permissions.find((p) => !creatorSet.has(permissionKey(p)));
  if (beyondCreator) {
    throw new ForbiddenError(
      `Cannot grant "${permissionKey(beyondCreator)}" — it exceeds your own role's permissions`
    );
  }

  return permissions;
}

async function resolveProductSlugs(slugs: string[]): Promise<string[]> {
  if (slugs.length === 0) return [];
  const products = await productRepository.findBySlugs(slugs);
  if (products.length !== slugs.length) throw new ValidationError("One or more products were not found");
  return products.map((p) => p.id);
}

export const roleService = {
  async list(organizationId: string) {
    const roles = await roleRepository.listForOrg(organizationId);
    return Promise.all(
      roles.map(async (role) => toPublicRole(role, await roleRepository.countMemberships(role.id)))
    );
  },

  async getById(organizationId: string, roleId: string) {
    const role = await roleRepository.findForOrg(roleId, organizationId);
    if (!role) throw new NotFoundError("Role not found");
    return toPublicRole(role, await roleRepository.countMemberships(role.id));
  },

  // §4 — custom roles require a Growth+ plan.
  async create(organizationId: string, plan: string, creatorPermissions: string[], input: CreateRoleInput) {
    if (!isPlanAtLeast(plan, "GROWTH")) {
      throw new ForbiddenError("Custom roles require a Growth plan or higher");
    }

    const existing = await roleRepository.findByName(organizationId, input.name);
    if (existing) throw new ConflictError(`A role named "${input.name}" already exists in this organization`);

    await resolveAndValidatePermissions(input.permissionIds, creatorPermissions);
    const productIds = await resolveProductSlugs(input.productAccess ?? []);

    const role = await roleRepository.create(organizationId, input.name, input.description || null, input.permissionIds, productIds);
    return toPublicRole(role, 0);
  },

  async update(organizationId: string, roleId: string, creatorPermissions: string[], input: UpdateRoleInput) {
    const role = await roleRepository.findForOrg(roleId, organizationId);
    if (!role) throw new NotFoundError("Role not found");
    if (role.isSystem) throw new ForbiddenError("System roles cannot be modified");

    if (input.name && input.name !== role.name) {
      const existing = await roleRepository.findByName(organizationId, input.name);
      if (existing) throw new ConflictError(`A role named "${input.name}" already exists in this organization`);
    }

    if (input.permissionIds) {
      await resolveAndValidatePermissions(input.permissionIds, creatorPermissions);
    }

    const productIds = input.productAccess ? await resolveProductSlugs(input.productAccess) : undefined;

    const updated = await roleRepository.update(
      roleId,
      { name: input.name, description: input.description !== undefined ? input.description || null : undefined },
      input.permissionIds,
      productIds
    );
    return toPublicRole(updated, await roleRepository.countMemberships(roleId));
  },

  async remove(organizationId: string, roleId: string) {
    const role = await roleRepository.findForOrg(roleId, organizationId);
    if (!role) throw new NotFoundError("Role not found");
    if (role.isSystem) throw new ForbiddenError("System roles cannot be deleted");

    const memberCount = await roleRepository.countMemberships(roleId);
    if (memberCount > 0) {
      throw new ConflictError(`Reassign ${memberCount} member(s) off this role before deleting it`);
    }

    await roleRepository.delete(roleId);
  },
};
