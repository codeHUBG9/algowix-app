# AlgoWix Platform — 07 Tenant Management

**Document Version:** 1.0.0  
**Status:** Approved

---

## Table of Contents

1. [Multi-Tenancy Model](#1-multi-tenancy-model)
2. [Tenant Lifecycle](#2-tenant-lifecycle)
3. [Tenant Isolation Architecture](#3-tenant-isolation-architecture)
4. [Tenant Provisioning in Products](#4-tenant-provisioning-in-products)
5. [Tenant Context Middleware](#5-tenant-context-middleware)
6. [Tenant Suspension & Deprovisioning](#6-tenant-suspension--deprovisioning)
7. [Cross-Tenant Security Rules](#7-cross-tenant-security-rules)
8. [Enterprise Dedicated Tenancy](#8-enterprise-dedicated-tenancy)

---

## 1. Multi-Tenancy Model

AlgoWix Platform uses **Row-Level Multi-Tenancy** (Shared Database, Shared Schema) as the default model, with optional **Dedicated Database Tenancy** for Enterprise customers.

### Tenancy Models Compared

| Model | Default | Enterprise Option |
|---|---|---|
| Architecture | Shared DB, Shared Schema | Dedicated DB per org |
| Isolation | Row-level (OrganizationId) | Full database isolation |
| Cost | Low | High |
| Compliance | Standard | GDPR/HIPAA ready |
| Performance | Shared resources | Dedicated resources |
| Customization | Standard | Custom schema extensions |

### The Tenant = Organization

In AlgoWix, a **Tenant** is an **Organization**. Every piece of data in the platform is scoped to an organization.

```
Tenant Identifier: organizationId (UUID)
Tenant Slug: org.slug (URL-safe, human-readable: "acme-corp")
```

---

## 2. Tenant Lifecycle

```
PENDING → TRIALING → ACTIVE → SUSPENDED → CANCELLED → PURGED

PENDING:    Organization created, email not verified
TRIALING:   Email verified, trial subscription active
ACTIVE:     Paid subscription active
SUSPENDED:  Payment failed or admin action
CANCELLED:  Customer cancelled, data retained 60 days
PURGED:     Data permanently deleted after retention period
```

### Lifecycle Events

| Transition | Trigger | Actions |
|---|---|---|
| PENDING → TRIALING | Email verified | Activate trial, provision products, send welcome |
| TRIALING → ACTIVE | Payment collected | Activate subscription, send confirmation |
| ACTIVE → SUSPENDED | Payment failed (day 30) | Suspend product access, send warning |
| SUSPENDED → ACTIVE | Payment retried successfully | Restore access, send confirmation |
| ACTIVE → CANCELLED | Customer action | Cancel at period end, send confirmation |
| CANCELLED → PURGED | 60 days after cancellation | Delete data, send final confirmation |

---

## 3. Tenant Isolation Architecture

### 3.1 Database Layer

Every table has `OrganizationId` as a required column:

```sql
-- Every query MUST include WHERE OrganizationId = @orgId
-- Enforced via Prisma middleware — cannot be bypassed by application code

-- Example: Users for an org
SELECT * FROM platform.Users u
JOIN platform.OrgMemberships m ON u.Id = m.UserId
WHERE m.OrganizationId = @OrganizationId;
```

### 3.2 Prisma Tenant Middleware

```typescript
// database/tenant-middleware.ts
// Automatically injects organizationId into all Prisma queries

export function tenantMiddleware(organizationId: string): Prisma.Middleware {
  return async (params, next) => {
    // Models that are tenant-scoped
    const tenantModels = [
      'OrgMembership', 'Branch', 'Department', 'Team',
      'Subscription', 'Invoice', 'Notification', 'AuditLog',
      'ApiKey', 'Webhook', 'FileRecord'
    ];

    if (tenantModels.includes(params.model || '')) {
      if (params.action === 'findMany' || params.action === 'findFirst') {
        params.args.where = { ...params.args.where, organizationId };
      }
      if (params.action === 'create') {
        params.args.data = { ...params.args.data, organizationId };
      }
    }

    return next(params);
  };
}
```

### 3.3 API Layer

Every API endpoint that operates on tenant data:

```typescript
// All controller methods receive tenant context from auth middleware
export class OrganizationController {
  async getMembers(req: AuthenticatedRequest, res: Response) {
    // req.auth.organizationId is always set and validated
    const members = await this.memberService.list(req.auth.organizationId);
    res.json({ success: true, data: members });
  }
}
```

---

## 4. Tenant Provisioning in Products

When an organization subscribes to a product, the platform provisions a tenant in that product:

### 4.1 Provisioning Protocol

```typescript
// platform → product: POST {product.baseUrl}/api/platform/provision
interface ProvisionRequest {
  tenantId: string;           // platform organizationId
  organizationName: string;
  organizationSlug: string;
  billingEmail: string;
  plan: string;
  planFeatures: string[];
  planLimits: Record<string, number>;
  adminUser: {
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

// product → platform: 200 OK
interface ProvisionResponse {
  success: true;
  tenantId: string;           // product's internal tenant ID (may differ)
  tenantUrl: string;          // https://crm.algowix.com/acme-corp
  adminLoginUrl: string;
}
```

### 4.2 Provisioning Retry

- If product is unavailable during provisioning: retry 3 times (exponential backoff: 1m, 5m, 15m)
- After 3 retries: mark subscription as PROVISION_FAILED, alert engineering
- Product must be idempotent: same provisioning request = same result (upsert)

---

## 5. Tenant Context Middleware

```typescript
// middleware/tenant-context.ts
export async function resolveTenantContext(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const { organizationId } = req.auth;

  // Get org from cache or DB
  let org = await cache.get(`org:${organizationId}`);
  if (!org) {
    org = await orgRepository.findById(organizationId);
    await cache.set(`org:${organizationId}`, org, 300); // 5 min TTL
  }

  if (!org) return next(new NotFoundError('Organization not found'));
  if (org.status === 'SUSPENDED') return next(new ForbiddenError('TENANT_SUSPENDED'));
  if (org.status === 'CANCELLED') return next(new ForbiddenError('TENANT_CANCELLED'));

  req.tenant = org;
  next();
}
```

---

## 6. Tenant Suspension & Deprovisioning

### 6.1 Suspension

```
Trigger: Payment failed after 30 days dunning

Actions:
1. Update Organization.status = 'SUSPENDED'
2. POST to all subscribed products: /api/platform/suspend
3. Product puts tenant in read-only mode
4. Cache invalidated for org
5. New logins show suspension banner
6. Existing sessions valid but feature access limited
7. Send email + in-app notification
```

### 6.2 Deprovisioning (Cancellation + Data Deletion)

```
Customer cancels subscription:
1. Set Subscription.cancelAtPeriodEnd = true
2. At period end: POST /api/platform/suspend to product

60 days after cancellation:
1. Send "data deletion" warning email (14 days notice)

74 days after cancellation:
1. POST to product: /api/platform/deprovision
2. Product deletes all tenant data
3. Platform deletes all org data
4. Send final confirmation email
5. Mark org as PURGED
```

---

## 7. Cross-Tenant Security Rules

**These rules are ABSOLUTE and must never be violated:**

1. An API key from Organization A CANNOT be used to access Organization B data
2. A JWT token from Organization A CANNOT access Organization B endpoints
3. All database queries MUST include `organizationId` filter
4. Shared resources (e.g., product catalog) are read-only for tenants
5. File URLs include a signed token that validates organization ownership
6. Admin-level platform staff access is logged and audited separately
7. SQL queries are parameterized — no string concatenation with user input ever

---

## 8. Enterprise Dedicated Tenancy

### 8.1 Architecture

```
Enterprise tenant gets:
├── Dedicated Azure SQL instance (or schema isolation minimum)
├── Connection string stored in Key Vault: tenant/{orgId}/db-connection
├── Dedicated Redis namespace (key prefix: {orgId}:)
├── Dedicated Azure Blob container: org-{orgId}/
└── Optional: dedicated App Service instance
```

### 8.2 Connection Resolution

```typescript
// For enterprise tenants: dynamic connection string resolution
async function getTenantDbClient(organizationId: string): Promise<PrismaClient> {
  const org = await getOrganization(organizationId);
  
  if (org.tenancyType === 'DEDICATED') {
    const connectionString = await keyVault.getSecret(`tenant/${organizationId}/db-connection`);
    return new PrismaClient({ datasources: { db: { url: connectionString } } });
  }
  
  // Default: shared client with tenant middleware
  return sharedPrismaClient.withMiddleware(tenantMiddleware(organizationId));
}
```

---

*Next: [08-Organization-Management.md — Org Hierarchy, Branches, Departments, Teams]*

---
**Document Control**  
Owner: Platform Architect  
