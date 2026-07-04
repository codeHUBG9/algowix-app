import type { Product } from "@prisma/client";
import { signedGet } from "./signed-fetch.js";
import { callProductEndpoint } from "../provisioning/provisioning.service.js";
import type {
  ProductUsageResponse,
  ProductLicenseResponse,
  UserSyncPayload,
} from "./product-contract.types.js";

// 09-Product-Integration.md §3.5–§3.7 — the read-side contract calls 07 never
// built (07 only implemented provision/suspend/deprovision, §4.1–§4.2).
export const productContractService = {
  getUsage(product: Product, organizationId: string): Promise<ProductUsageResponse> {
    return signedGet(product.baseUrl, `${product.contractApiPath}/usage?tenantId=${organizationId}`);
  },

  getLicense(product: Product, organizationId: string): Promise<ProductLicenseResponse> {
    return signedGet(product.baseUrl, `${product.contractApiPath}/license?tenantId=${organizationId}`);
  },

  syncUsers(product: Product, payload: UserSyncPayload): Promise<{ success: true }> {
    return callProductEndpoint(product.baseUrl, `${product.contractApiPath}/users/sync`, payload);
  },
};
