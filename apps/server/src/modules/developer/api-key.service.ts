import { randomBytes } from "node:crypto";
import type { ApiKey } from "@prisma/client";
import { apiKeyRepository } from "./api-key.repository.js";
import { hashToken } from "../../utils/hash-token.js";
import { NotFoundError } from "../../utils/errors.js";
import type { CreateApiKeyInput } from "./api-key.schema.js";

function toPublicApiKey(key: ApiKey) {
  return {
    id: key.id,
    name: key.name,
    keyPrefix: key.keyPrefix,
    scopes: JSON.parse(key.scopes) as string[],
    environment: key.environment,
    lastUsedAt: key.lastUsedAt,
    expiresAt: key.expiresAt,
    isActive: key.isActive,
    createdAt: key.createdAt,
  };
}

export const apiKeyService = {
  async list(organizationId: string) {
    const keys = await apiKeyRepository.list(organizationId);
    return keys.map(toPublicApiKey);
  },

  // Returns the raw key alongside the public record — this is the only
  // moment the raw value ever exists outside the caller's clipboard; only
  // the sha256 hash is persisted (10-API-Gateway.md §5).
  async create(organizationId: string, createdById: string, input: CreateApiKeyInput) {
    const keyPrefixLabel = `awx_${input.environment}_`;
    const rawKey = `${keyPrefixLabel}${randomBytes(32).toString("hex")}`;
    const keyHash = hashToken(rawKey);
    const keyPrefix = rawKey.slice(0, keyPrefixLabel.length + 6);

    const key = await apiKeyRepository.create(organizationId, {
      name: input.name,
      keyHash,
      keyPrefix,
      scopes: JSON.stringify(input.scopes),
      environment: input.environment,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      createdById,
    });

    return { ...toPublicApiKey(key), rawKey };
  },

  async revoke(organizationId: string, id: string) {
    const existing = await apiKeyRepository.findById(organizationId, id);
    if (!existing) throw new NotFoundError("API key not found");
    await apiKeyRepository.revoke(organizationId, id);
  },
};
