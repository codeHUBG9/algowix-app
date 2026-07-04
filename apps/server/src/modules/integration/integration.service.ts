import { randomBytes } from "node:crypto";
import { integrationRepository } from "./integration.repository.js";
import { INTEGRATION_CATALOG, findIntegration } from "./integration.catalog.js";
import { encrypt } from "../../utils/crypto.js";
import { NotFoundError } from "../../utils/errors.js";

export const integrationService = {
  async list(organizationId: string) {
    const connections = await integrationRepository.list(organizationId);
    const byProvider = new Map(connections.map((c) => [c.provider, c]));

    return INTEGRATION_CATALOG.map((entry) => {
      const connection = byProvider.get(entry.provider);
      return {
        provider: entry.provider,
        name: entry.name,
        category: entry.category,
        scopes: entry.scopes,
        status: connection?.status ?? "DISCONNECTED",
        connectedAt: connection?.connectedAt ?? null,
      };
    });
  },

  // 18-Integrations.md §3 — real flow is "redirect to provider consent page,
  // exchange code for tokens on callback." No real OAuth app is registered
  // with any provider here, so this collapses the two steps into one
  // immediate mock exchange (same category of simplification as
  // gateway/mock.gateway.ts standing in for a hosted checkout page) —
  // tokens are fabricated but still pass through the same encrypt-at-rest
  // path (utils/crypto.ts) real tokens would.
  async connect(organizationId: string, userId: string, provider: string) {
    const entry = findIntegration(provider);
    if (!entry) throw new NotFoundError("Unknown integration provider");

    const mockAccessToken = `mock_access_${randomBytes(16).toString("hex")}`;
    const mockRefreshToken = `mock_refresh_${randomBytes(16).toString("hex")}`;

    const connection = await integrationRepository.upsertConnected(organizationId, provider, {
      accessTokenEnc: encrypt(mockAccessToken),
      refreshTokenEnc: encrypt(mockRefreshToken),
      scopes: JSON.stringify(entry.scopes),
      connectedById: userId,
    });

    return { provider, status: connection.status, connectedAt: connection.connectedAt };
  },

  async disconnect(organizationId: string, provider: string) {
    const existing = await integrationRepository.findByProvider(organizationId, provider);
    if (!existing || existing.status !== "CONNECTED") throw new NotFoundError("Integration is not connected");
    await integrationRepository.disconnect(organizationId, provider);
  },
};
