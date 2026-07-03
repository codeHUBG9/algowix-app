import type { Department } from "@prisma/client";
import { departmentRepository } from "./department.repository.js";
import { ConflictError, NotFoundError, ValidationError } from "../../utils/errors.js";
import type { CreateDepartmentInput, UpdateDepartmentInput } from "./organization.schema.js";

const MAX_DEPTH = 5;

async function toPublicDepartment(dept: Department) {
  let headUser = null;
  if (dept.headUserId) {
    const [user] = await departmentRepository.findHeadUsers([dept.headUserId]);
    headUser = user ?? null;
  }

  return {
    id: dept.id,
    name: dept.name,
    code: dept.code,
    parentId: dept.parentId,
    headUserId: dept.headUserId,
    headUser,
    createdAt: dept.createdAt,
    updatedAt: dept.updatedAt,
  };
}

/** Depth of `parentId` itself (root = 1), walking up ancestors. Bails out past MAX_DEPTH to avoid infinite loops on bad data. */
async function depthOf(organizationId: string, parentId: string): Promise<number> {
  let depth = 1;
  let current = await departmentRepository.findById(organizationId, parentId);
  if (!current) throw new NotFoundError("Parent department not found");

  while (current.parentId) {
    depth += 1;
    if (depth > MAX_DEPTH) return depth;
    const next = await departmentRepository.findById(organizationId, current.parentId);
    if (!next) break;
    current = next;
  }
  return depth;
}

async function isDescendant(organizationId: string, ancestorId: string, candidateId: string): Promise<boolean> {
  let current = await departmentRepository.findById(organizationId, candidateId);
  let hops = 0;
  while (current?.parentId && hops < MAX_DEPTH + 1) {
    if (current.parentId === ancestorId) return true;
    current = await departmentRepository.findById(organizationId, current.parentId);
    hops += 1;
  }
  return false;
}

async function assertHeadIsActiveMember(organizationId: string, headUserId: string | null | undefined) {
  if (!headUserId) return;
  const membership = await departmentRepository.findActiveMembership(organizationId, headUserId);
  if (!membership) throw new ValidationError("Department head must be an active organization member");
}

export const departmentService = {
  async list(organizationId: string) {
    const departments = await departmentRepository.list(organizationId);
    return Promise.all(departments.map(toPublicDepartment));
  },

  async create(organizationId: string, input: CreateDepartmentInput) {
    if (input.code) {
      const existing = await departmentRepository.findByCode(organizationId, input.code);
      if (existing) throw new ConflictError(`Department code "${input.code}" is already in use`);
    }

    let parentId: string | null = null;
    if (input.parentId) {
      parentId = input.parentId;
      const parentDepth = await depthOf(organizationId, parentId);
      if (parentDepth + 1 > MAX_DEPTH) {
        throw new ConflictError(`Department hierarchy cannot exceed ${MAX_DEPTH} levels`);
      }
    }

    await assertHeadIsActiveMember(organizationId, input.headUserId);

    const dept = await departmentRepository.create(organizationId, {
      name: input.name,
      code: input.code || null,
      parentId,
      headUserId: input.headUserId || null,
    });

    return toPublicDepartment(dept);
  },

  async update(organizationId: string, id: string, input: UpdateDepartmentInput) {
    const existing = await departmentRepository.findById(organizationId, id);
    if (!existing) throw new NotFoundError("Department not found");

    if (input.code && input.code !== existing.code) {
      const codeOwner = await departmentRepository.findByCode(organizationId, input.code);
      if (codeOwner && codeOwner.id !== id) {
        throw new ConflictError(`Department code "${input.code}" is already in use`);
      }
    }

    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.code !== undefined) data.code = input.code || null;

    if (input.parentId !== undefined) {
      const newParentId = input.parentId || null;
      if (newParentId === id) {
        throw new ValidationError("A department cannot be its own parent");
      }
      if (newParentId) {
        if (await isDescendant(organizationId, id, newParentId)) {
          throw new ValidationError("A department cannot be moved under its own descendant");
        }
        const parentDepth = await depthOf(organizationId, newParentId);
        if (parentDepth + 1 > MAX_DEPTH) {
          throw new ConflictError(`Department hierarchy cannot exceed ${MAX_DEPTH} levels`);
        }
      }
      data.parentId = newParentId;
    }

    if (input.headUserId !== undefined) {
      await assertHeadIsActiveMember(organizationId, input.headUserId || null);
      data.headUserId = input.headUserId || null;
    }

    const dept = await departmentRepository.update(organizationId, id, data);
    return toPublicDepartment(dept);
  },

  async remove(organizationId: string, id: string) {
    const existing = await departmentRepository.findById(organizationId, id);
    if (!existing) throw new NotFoundError("Department not found");

    const childCount = await departmentRepository.countChildren(organizationId, id);
    if (childCount > 0) {
      throw new ConflictError("Reassign or remove child departments before deleting this department");
    }

    await departmentRepository.softDelete(organizationId, id);
  },
};
