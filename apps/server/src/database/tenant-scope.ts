import { prisma } from "./prisma.js";

// Cross-tenant isolation guardrail per 07-Tenant-Management.md §3.2/§7.
// A Prisma Client Extension (the maintained replacement for the deprecated
// $use middleware API in Prisma 5) that auto-injects organizationId into
// every query against a tenant-scoped model, so application code cannot
// accidentally read or write another organization's rows even if it forgets
// a `where: { organizationId }` clause.
//
// Only models that actually exist in this schema and belong to a single
// tenant are listed. TeamMember is scoped indirectly via its parent Team
// (it has no organizationId column of its own), so it's deliberately absent.
// Same reasoning excludes InvoiceLineItem (scoped via its parent Invoice) and
// Coupon (platform-wide, no organizationId at all) — see 11-Billing.md.
const TENANT_SCOPED_MODELS = new Set([
  "OrgMembership",
  "OrgInvite",
  "Subscription",
  "Notification",
  "AuditLog",
  "ApiKey",
  "Webhook",
  "FileRecord",
  "Branch",
  "Department",
  "Team",
  "Invoice",
  "Payment",
  "PaymentMethod",
  "Credit",
  "CouponRedemption",
]);

const READ_AND_BULK_WRITE_OPS = new Set(["findMany", "findFirst", "count", "updateMany", "deleteMany"]);

type QueryArgs = { where?: Record<string, unknown>; data?: Record<string, unknown> };

export function tenantScopedClient(organizationId: string) {
  return prisma.$extends({
    name: `tenant-scope:${organizationId}`,
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!TENANT_SCOPED_MODELS.has(model)) return query(args);

          const scopedArgs = args as QueryArgs;
          if (READ_AND_BULK_WRITE_OPS.has(operation)) {
            scopedArgs.where = { ...scopedArgs.where, organizationId };
          } else if (operation === "create") {
            scopedArgs.data = { ...scopedArgs.data, organizationId };
          }

          return query(scopedArgs);
        },
      },
    },
  });
}

export type TenantScopedClient = ReturnType<typeof tenantScopedClient>;
