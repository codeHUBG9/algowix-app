import { ConflictError } from "../../utils/errors.js";

// 07-Tenant-Management.md §2 — PENDING → TRIALING → ACTIVE → SUSPENDED → CANCELLED → PURGED
export const TENANT_STATUSES = [
  "PENDING",
  "TRIALING",
  "ACTIVE",
  "SUSPENDED",
  "CANCELLED",
  "PURGED",
] as const;

export type TenantStatus = (typeof TENANT_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<TenantStatus, TenantStatus[]> = {
  PENDING: ["TRIALING", "CANCELLED"],
  TRIALING: ["ACTIVE", "SUSPENDED", "CANCELLED"],
  ACTIVE: ["SUSPENDED", "CANCELLED"],
  SUSPENDED: ["ACTIVE", "CANCELLED"],
  CANCELLED: ["PURGED"],
  PURGED: [],
};

export function assertTransitionAllowed(from: TenantStatus, to: TenantStatus): void {
  if (!ALLOWED_TRANSITIONS[from]?.includes(to)) {
    throw new ConflictError(`Cannot transition tenant from ${from} to ${to}`);
  }
}
