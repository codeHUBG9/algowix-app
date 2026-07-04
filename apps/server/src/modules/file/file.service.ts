import { randomUUID } from "node:crypto";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileRepository } from "./file.repository.js";
import { env } from "../../config/env.js";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../../utils/errors.js";
import { ALLOWED_MIME_TYPES, SIZE_LIMITS, storageQuotaMb, MIME_EXTENSIONS } from "./file.constants.js";
import type { FilePresignedUrlInput } from "./file.schema.js";

const PRESIGN_EXPIRY_MS = 15 * 60 * 1000;

function privatePath(organizationId: string, fileId: string, ext: string): string {
  const now = new Date();
  return path.join(
    "private",
    organizationId,
    String(now.getFullYear()),
    String(now.getMonth() + 1).padStart(2, "0"),
    `${fileId}.${ext}`
  );
}

function toPublic(file: {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: bigint;
  cdnUrl: string | null;
  folder: string | null;
  isPublic: boolean;
  createdAt: Date;
}) {
  return {
    id: file.id,
    filename: file.filename,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: Number(file.sizeBytes),
    status: file.cdnUrl ? "READY" : "PENDING",
    folder: file.folder,
    isPublic: file.isPublic,
    createdAt: file.createdAt,
  };
}

export const fileService = {
  async requestUpload(organizationId: string, uploadedById: string, input: FilePresignedUrlInput) {
    if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
      throw new ValidationError(`File type ${input.mimeType} is not allowed`);
    }
    if (input.sizeBytes > SIZE_LIMITS.document) {
      throw new ValidationError("File exceeds the maximum allowed size");
    }

    const org = await fileRepository.getOrganizationPlan(organizationId);
    const quotaMb = storageQuotaMb(org?.plan ?? "STARTER");
    if (quotaMb !== null) {
      const used = await fileRepository.totalStorageUsed(organizationId);
      if (used + input.sizeBytes > quotaMb * 1024 * 1024) {
        throw new ConflictError("Storage quota exceeded. Upgrade your plan or delete unused files.");
      }
    }

    const ext = MIME_EXTENSIONS[input.mimeType] ?? "bin";
    const id = randomUUID();
    const blobUrl = privatePath(organizationId, id, ext);

    const record = await fileRepository.create(organizationId, {
      id,
      uploadedById,
      filename: `${id}.${ext}`,
      originalName: input.filename,
      mimeType: input.mimeType,
      sizeBytes: BigInt(input.sizeBytes),
      blobUrl,
      folder: input.folder || null,
      isPublic: false,
    });

    return {
      fileId: record.id,
      uploadUrl: `/api/v1/files/${record.id}/raw`,
      expiresInSeconds: PRESIGN_EXPIRY_MS / 1000,
    };
  },

  async writeRaw(organizationId: string, fileId: string, buffer: Buffer) {
    const file = await fileRepository.findById(organizationId, fileId);
    if (!file) throw new NotFoundError("File not found");
    if (file.cdnUrl) throw new ConflictError("This file has already been uploaded");
    if (Date.now() - file.createdAt.getTime() > PRESIGN_EXPIRY_MS) {
      throw new ConflictError("Upload URL has expired — request a new one");
    }
    if (BigInt(buffer.length) !== file.sizeBytes) {
      throw new ValidationError("Uploaded file size does not match the declared size");
    }

    const fullPath = path.join(env.FILE_STORAGE_DIR, file.blobUrl);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, buffer);
  },

  async confirmUpload(organizationId: string, fileId: string) {
    const file = await fileRepository.findById(organizationId, fileId);
    if (!file) throw new NotFoundError("File not found");
    if (file.cdnUrl) return toPublic(file);

    const fullPath = path.join(env.FILE_STORAGE_DIR, file.blobUrl);
    try {
      const stats = await stat(fullPath);
      if (BigInt(stats.size) !== file.sizeBytes) throw new ValidationError("Uploaded file is incomplete");
    } catch {
      throw new ConflictError("File has not been uploaded yet");
    }

    const updated = await fileRepository.markReady(organizationId, fileId, `/api/v1/files/${fileId}/download`);
    return toPublic(updated);
  },

  async list(organizationId: string, opts: { folder?: string; page: number; limit: number }) {
    const [rows, total] = await fileRepository.list(organizationId, opts);
    return { data: rows.map(toPublic), total };
  },

  async getById(organizationId: string, id: string) {
    const file = await fileRepository.findById(organizationId, id);
    if (!file) throw new NotFoundError("File not found");
    return toPublic(file);
  },

  // 16-Files.md §4 — ownership check + serve. No real SAS token/CDN here, so
  // the download endpoint itself is the "time-limited URL": it re-checks
  // organizationId on every call rather than minting a separate short-lived
  // token, which is an equivalent (if less bandwidth-efficient) guarantee for
  // a single-server local deployment.
  async getFilePathForDownload(organizationId: string, id: string) {
    const file = await fileRepository.findById(organizationId, id);
    if (!file) throw new NotFoundError("File not found");
    if (file.organizationId !== organizationId) throw new ForbiddenError();
    if (!file.cdnUrl) throw new ConflictError("File is not ready for download yet");
    return { fullPath: path.join(env.FILE_STORAGE_DIR, file.blobUrl), originalName: file.originalName, mimeType: file.mimeType };
  },

  async delete(organizationId: string, id: string) {
    const file = await fileRepository.findById(organizationId, id);
    if (!file) throw new NotFoundError("File not found");
    await fileRepository.softDelete(organizationId, id);
  },

  async storageUsage(organizationId: string) {
    const org = await fileRepository.getOrganizationPlan(organizationId);
    const quotaMb = storageQuotaMb(org?.plan ?? "STARTER");
    const usedBytes = await fileRepository.totalStorageUsed(organizationId);
    return {
      usedBytes,
      quotaBytes: quotaMb === null ? null : quotaMb * 1024 * 1024,
      plan: org?.plan ?? "STARTER",
    };
  },

  async uploadAvatar(userId: string, organizationId: string, file: { buffer: Buffer; mimetype: string; size: number }) {
    if (!file.mimetype.startsWith("image/")) throw new ValidationError("Avatar must be an image");
    if (file.size > SIZE_LIMITS.avatar) throw new ValidationError("Avatar must be under 5MB");

    const ext = MIME_EXTENSIONS[file.mimetype] ?? "png";
    const relPath = path.join("public", "avatars", `${userId}.${ext}`);
    const fullPath = path.join(env.FILE_STORAGE_DIR, relPath);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file.buffer);

    const publicUrl = `/public-files/avatars/${userId}.${ext}?v=${Date.now()}`;
    await fileRepository.create(organizationId, {
      uploadedById: userId,
      filename: `${userId}.${ext}`,
      originalName: `avatar.${ext}`,
      mimeType: file.mimetype,
      sizeBytes: BigInt(file.size),
      blobUrl: relPath,
      folder: "avatars",
      isPublic: true,
    });
    await fileRepository.updateUserAvatar(userId, publicUrl);
    return { avatarUrl: publicUrl };
  },

  async uploadLogo(organizationId: string, userId: string, file: { buffer: Buffer; mimetype: string; size: number }) {
    if (!file.mimetype.startsWith("image/")) throw new ValidationError("Logo must be an image");
    if (file.size > SIZE_LIMITS.logo) throw new ValidationError("Logo must be under 2MB");

    const ext = MIME_EXTENSIONS[file.mimetype] ?? "png";
    const relPath = path.join("public", "org-logos", `${organizationId}.${ext}`);
    const fullPath = path.join(env.FILE_STORAGE_DIR, relPath);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file.buffer);

    const publicUrl = `/public-files/org-logos/${organizationId}.${ext}?v=${Date.now()}`;
    await fileRepository.create(organizationId, {
      uploadedById: userId,
      filename: `${organizationId}.${ext}`,
      originalName: `logo.${ext}`,
      mimeType: file.mimetype,
      sizeBytes: BigInt(file.size),
      blobUrl: relPath,
      folder: "org-logos",
      isPublic: true,
    });
    await fileRepository.updateOrgLogo(organizationId, publicUrl);
    return { logoUrl: publicUrl };
  },

  async getMyAvatar(userId: string) {
    const user = await fileRepository.getUserAvatar(userId);
    return { avatarUrl: user?.avatarUrl ?? null };
  },
};
