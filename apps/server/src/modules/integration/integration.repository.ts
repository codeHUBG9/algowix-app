import { tenantScopedClient } from "../../database/tenant-scope.js";

export const integrationRepository = {
  list(organizationId: string) {
    return tenantScopedClient(organizationId).integration.findMany();
  },

  findByProvider(organizationId: string, provider: string) {
    return tenantScopedClient(organizationId).integration.findUnique({
      where: { organizationId_provider: { organizationId, provider } },
    });
  },

  upsertConnected(
    organizationId: string,
    provider: string,
    data: { accessTokenEnc: string; refreshTokenEnc: string; scopes: string; connectedById: string }
  ) {
    return tenantScopedClient(organizationId).integration.upsert({
      where: { organizationId_provider: { organizationId, provider } },
      create: { organizationId, provider, status: "CONNECTED", connectedAt: new Date(), ...data },
      update: { status: "CONNECTED", connectedAt: new Date(), ...data },
    });
  },

  disconnect(organizationId: string, provider: string) {
    return tenantScopedClient(organizationId).integration.update({
      where: { organizationId_provider: { organizationId, provider } },
      data: { status: "DISCONNECTED", accessTokenEnc: null, refreshTokenEnc: null, connectedAt: null },
    });
  },
};
