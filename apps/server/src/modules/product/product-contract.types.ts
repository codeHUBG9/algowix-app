// 09-Product-Integration.md §3.5–§3.7 — read-side contract calls a product
// must implement. Distinct from provisioning.types.ts (§4.1–§4.2, write-side).
export interface ProductUsageResponse {
  tenantId: string;
  metrics: Record<string, number>;
  limits: Record<string, number>;
  reportedAt: string;
}

export interface ProductLicenseResponse {
  tenantId: string;
  plan: string;
  status: string;
  validUntil: string;
  features: string[];
}

export interface ProductHealthResponse {
  status: "ok" | "degraded" | "down";
  version?: string;
  uptime?: number;
  checks?: Record<string, string>;
}

export interface UserSyncPayload {
  tenantId: string;
  users: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
  }[];
}
