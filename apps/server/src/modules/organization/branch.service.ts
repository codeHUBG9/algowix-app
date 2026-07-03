import type { Branch } from "@prisma/client";
import { branchRepository } from "./branch.repository.js";
import { ConflictError, NotFoundError } from "../../utils/errors.js";
import type { CreateBranchInput, UpdateBranchInput } from "./organization.schema.js";

function toPublicBranch(branch: Branch) {
  return {
    id: branch.id,
    name: branch.name,
    code: branch.code,
    address: branch.address,
    city: branch.city,
    state: branch.state,
    country: branch.country,
    pincode: branch.pincode,
    phone: branch.phone,
    isHeadOffice: branch.isHeadOffice,
    createdAt: branch.createdAt,
    updatedAt: branch.updatedAt,
  };
}

export const branchService = {
  async list(organizationId: string) {
    const branches = await branchRepository.list(organizationId);
    return branches.map(toPublicBranch);
  },

  async create(organizationId: string, input: CreateBranchInput) {
    if (input.code) {
      const existing = await branchRepository.findByCode(organizationId, input.code);
      if (existing) throw new ConflictError(`Branch code "${input.code}" is already in use`);
    }

    if (input.isHeadOffice) {
      await branchRepository.unsetHeadOffice(organizationId);
    }

    const branch = await branchRepository.create(organizationId, {
      name: input.name,
      code: input.code || null,
      address: input.address || null,
      city: input.city || null,
      state: input.state || null,
      country: input.country || null,
      pincode: input.pincode || null,
      phone: input.phone || null,
      isHeadOffice: input.isHeadOffice ?? false,
    });

    return toPublicBranch(branch);
  },

  async update(organizationId: string, id: string, input: UpdateBranchInput) {
    const existing = await branchRepository.findById(organizationId, id);
    if (!existing) throw new NotFoundError("Branch not found");

    if (input.code && input.code !== existing.code) {
      const codeOwner = await branchRepository.findByCode(organizationId, input.code);
      if (codeOwner && codeOwner.id !== id) throw new ConflictError(`Branch code "${input.code}" is already in use`);
    }

    if (input.isHeadOffice) {
      await branchRepository.unsetHeadOffice(organizationId, id);
    }

    const data: Record<string, unknown> = { ...input };
    if (input.code !== undefined) data.code = input.code || null;
    if (input.address !== undefined) data.address = input.address || null;
    if (input.city !== undefined) data.city = input.city || null;
    if (input.state !== undefined) data.state = input.state || null;
    if (input.country !== undefined) data.country = input.country || null;
    if (input.pincode !== undefined) data.pincode = input.pincode || null;
    if (input.phone !== undefined) data.phone = input.phone || null;

    const branch = await branchRepository.update(organizationId, id, data);
    return toPublicBranch(branch);
  },

  async remove(organizationId: string, id: string) {
    const existing = await branchRepository.findById(organizationId, id);
    if (!existing) throw new NotFoundError("Branch not found");
    await branchRepository.softDelete(organizationId, id);
  },
};
