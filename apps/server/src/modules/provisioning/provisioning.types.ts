// 07-Tenant-Management.md §4.1 — provisioning contract between platform and products.
export interface ProvisionRequest {
  tenantId: string;
  organizationName: string;
  organizationSlug: string;
  billingEmail: string;
  plan: string;
  planFeatures: unknown;
  planLimits: unknown;
  adminUser?: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  timezone: string;
  currency: string;
  country: string;
  provisionedAt: string;
}

export interface ProvisionResponse {
  success: true;
  tenantId: string;
  tenantUrl?: string;
  adminLoginUrl?: string;
}
