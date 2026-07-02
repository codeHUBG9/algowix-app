# AlgoWix Platform — 04 System Design

**Document Version:** 1.0.0  
**Status:** Approved

---

## Table of Contents

1. [System Components Map](#1-system-components-map)
2. [Core Domain Model](#2-core-domain-model)
3. [Platform Services Catalog](#3-platform-services-catalog)
4. [Data Flow Diagrams](#4-data-flow-diagrams)
5. [API Versioning Strategy](#5-api-versioning-strategy)
6. [Cross-Cutting Concerns](#6-cross-cutting-concerns)
7. [Scalability Design](#7-scalability-design)
8. [Disaster Recovery Design](#8-disaster-recovery-design)
9. [Feature Flags System](#9-feature-flags-system)
10. [Background Jobs System](#10-background-jobs-system)

---

## 1. System Components Map

```
AlgoWix Platform System
│
├── PUBLIC FACING
│   ├── app.algowix.com                 → Platform Web Application
│   ├── api.algowix.com                 → Public REST API
│   └── developers.algowix.com          → Developer Portal
│
├── PLATFORM SERVICES
│   ├── Auth Service                    → JWT, OAuth, SAML
│   ├── Identity Service                → User profiles, avatars
│   ├── Organization Service            → Org CRUD, branches, departments
│   ├── Tenant Service                  → Multi-tenant provisioning
│   ├── Subscription Service            → Plan management, feature gates
│   ├── Billing Service                 → Invoices, payments, dunning
│   ├── RBAC Service                    → Roles, permissions, policies
│   ├── Notification Service            → In-app, email, push
│   ├── Audit Service                   → Immutable audit log
│   ├── File Service                    → Upload, store, serve files
│   ├── Report Service                  → Aggregated cross-product reports
│   ├── Integration Service             → Third-party connectors
│   ├── Webhook Service                 → Outbound webhook delivery
│   ├── Product Registry Service        → Product catalog management
│   ├── Search Service                  → Global entity search
│   └── AI Service (future)             → Recommendations, anomaly detection
│
├── INFRASTRUCTURE SERVICES
│   ├── API Gateway (Azure APIM)
│   ├── Event Bus (Azure Service Bus)
│   ├── Cache (Redis)
│   ├── Database (MSSQL - Azure SQL)
│   ├── Object Storage (Azure Blob)
│   ├── Secret Store (Azure Key Vault)
│   ├── Email (Azure Communication / SendGrid)
│   └── Monitoring (App Insights + Grafana)
│
└── INTERNAL TOOLS
    ├── Admin Portal (internal)          → Super-admin for AlgoWix staff
    ├── Support Dashboard               → Support team tooling
    └── Analytics Dashboard             → Business intelligence
```

---

## 2. Core Domain Model

### 2.1 Entity Hierarchy

```
AlgoWix Platform Entity Hierarchy:

Platform (Global)
└── Organization
    ├── has many: Branches
    ├── has many: Departments
    ├── has many: Teams
    ├── has many: Users (via OrgMembership)
    ├── has many: Subscriptions
    │   └── each Subscription: has one Product
    ├── has many: Invoices
    ├── has many: ApiKeys
    ├── has many: Webhooks
    ├── has many: AuditLogs
    └── has many: Files

User
├── belongs to many: Organizations (via OrgMembership)
├── has many: Sessions
├── has one per org: Role
└── has many: Notifications
```

### 2.2 Core Entity Definitions

```typescript
// Central entities of the platform domain

interface Organization {
  id: string;                    // UUID
  slug: string;                  // url-safe unique name (e.g., "acme-corp")
  name: string;
  logoUrl?: string;
  industry?: string;
  size?: 'MICRO' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE';
  country: string;               // ISO 3166-1 alpha-2
  currency: string;              // ISO 4217 (INR, USD, EUR)
  timezone: string;              // IANA timezone
  billingEmail: string;
  taxId?: string;                // GST number, VAT number
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'PENDING';
  plan: PlatformPlan;
  createdAt: Date;
  updatedAt: Date;
}

interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  phone?: string;
  phoneVerified?: boolean;
  language: string;
  timezone: string;
  twoFactorEnabled: boolean;
  twoFactorMethod?: 'TOTP' | 'SMS' | 'EMAIL';
  lastLoginAt?: Date;
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
  createdAt: Date;
}

interface OrgMembership {
  userId: string;
  organizationId: string;
  roleId: string;
  joinedAt: Date;
  invitedBy: string;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  isPrimary: boolean;            // user's default org
}

interface Product {
  id: string;
  slug: string;                  // 'crm', 'inventory', 'hrms'
  name: string;                  // 'CRM', 'Inventory'
  description: string;
  logoUrl: string;
  baseUrl: string;               // 'https://crm.algowix.com'
  contractApiPath: string;       // '/api/platform'
  isActive: boolean;
  isPublic: boolean;
  category: string;
  plans: ProductPlan[];
}

interface Subscription {
  id: string;
  organizationId: string;
  productId: string;
  planId: string;
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'PAUSED';
  seatCount: number;
  trialStartsAt?: Date;
  trialEndsAt?: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: Date;
  metadata: Record<string, unknown>;
}
```

---

## 3. Platform Services Catalog

### 3.1 Auth Service

**Responsibility:** All authentication operations  
**Owns:** Sessions, Tokens, OTP records, OAuth states  

Endpoints:
```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
POST /api/v1/auth/verify-email
POST /api/v1/auth/resend-verification
POST /api/v1/auth/2fa/enable
POST /api/v1/auth/2fa/verify
POST /api/v1/auth/2fa/disable
GET  /api/v1/auth/sessions
DELETE /api/v1/auth/sessions/{sessionId}
POST /api/v1/auth/oauth/{provider}
GET  /api/v1/auth/oauth/{provider}/callback
POST /api/v1/auth/saml/{orgSlug}             (Enterprise SSO)
```

### 3.2 Organization Service

**Responsibility:** Organization and hierarchy management  
**Owns:** Organizations, Branches, Departments, Teams  

Endpoints:
```
GET    /api/v1/organizations
POST   /api/v1/organizations
GET    /api/v1/organizations/:id
PUT    /api/v1/organizations/:id
DELETE /api/v1/organizations/:id
GET    /api/v1/organizations/:id/branches
POST   /api/v1/organizations/:id/branches
GET    /api/v1/organizations/:id/departments
POST   /api/v1/organizations/:id/departments
GET    /api/v1/organizations/:id/teams
POST   /api/v1/organizations/:id/teams
GET    /api/v1/organizations/:id/members
POST   /api/v1/organizations/:id/invite
DELETE /api/v1/organizations/:id/members/:userId
```

### 3.3 Subscription Service

**Responsibility:** Subscription lifecycle management  
**Owns:** Subscriptions, ProductPlans, FeatureFlags  

Endpoints:
```
GET    /api/v1/subscriptions
POST   /api/v1/subscriptions
GET    /api/v1/subscriptions/:id
POST   /api/v1/subscriptions/:id/upgrade
POST   /api/v1/subscriptions/:id/downgrade
POST   /api/v1/subscriptions/:id/cancel
POST   /api/v1/subscriptions/:id/reactivate
GET    /api/v1/subscriptions/:id/usage
GET    /api/v1/subscriptions/:id/seats
POST   /api/v1/subscriptions/:id/seats
```

### 3.4 Billing Service

**Responsibility:** Payment processing, invoicing  
**Owns:** Invoices, Payments, PaymentMethods  

Endpoints:
```
GET    /api/v1/billing/invoices
GET    /api/v1/billing/invoices/:id
GET    /api/v1/billing/invoices/:id/download
GET    /api/v1/billing/payment-methods
POST   /api/v1/billing/payment-methods
DELETE /api/v1/billing/payment-methods/:id
POST   /api/v1/billing/payment-methods/:id/default
POST   /api/v1/billing/checkout
POST   /webhooks/razorpay          (payment gateway webhook)
POST   /webhooks/stripe            (international)
```

---

## 4. Data Flow Diagrams

### 4.1 User Registration Flow

```
Browser                 Platform API              Database            Email Service
   │                        │                        │                     │
   │──POST /auth/register──►│                        │                     │
   │                        │──Validate input (Zod)  │                     │
   │                        │──Check email exists───►│                     │
   │                        │◄───────────────────────│                     │
   │                        │──Hash password (bcrypt) │                    │
   │                        │──Create User───────────►│                    │
   │                        │──Create Organization───►│                    │
   │                        │──Create OrgMembership──►│                    │
   │                        │──Create default Role───►│                    │
   │                        │──Generate verification token               │
   │                        │──Save token to DB──────►│                    │
   │                        │──Emit UserRegistered event                 │
   │                        │──────────────────────────────────────────►│
   │                        │                        │   Send verification email
   │◄──201 Created──────────│                        │                     │
```

### 4.2 Product Launch (SSO Token Flow)

```
Browser          Platform API          Product API (CRM)       Platform DB
   │                  │                      │                      │
   │──Click "Open CRM"│                      │                      │
   │──GET /products/crm/launch───────────────│                      │
   │                  │──Verify user session  │                      │
   │                  │──Check subscription──────────────────────►│
   │                  │◄──────────────────────────────────────────│
   │                  │──Generate signed JWT (RS256)               │
   │                  │  Payload: userId, orgId, permissions, exp  │
   │◄──302 Redirect───│                      │                      │
   │  to crm.algowix.com?token=xxx           │                      │
   │──GET crm.algowix.com?token=xxx──────────►│                      │
   │                                         │──Verify JWT signature│
   │                                         │──Check token not revoked
   │                                         │──Extract user context│
   │                                         │──Create local session│
   │◄────────────────────────────────────────│                      │
   │  User is in CRM — no second login       │                      │
```

### 4.3 Billing & Invoice Flow

```
Subscription Service      Billing Service       Razorpay         Email Service
       │                       │                    │                  │
       │──Period End Event─────►│                    │                  │
       │                       │──Calculate amount   │                  │
       │                       │──Apply discounts    │                  │
       │                       │──Create Invoice────►│                  │
       │                       │──Charge payment method────────────►│
       │                       │◄────────────────────────────────────│
       │                       │  Payment Success                     │
       │                       │──Update Invoice status               │
       │                       │──Generate PDF (async queue)          │
       │                       │──Emit invoice.paid event             │
       │                       │──────────────────────────────────────►│
       │                       │                                      │  Send receipt
```

### 4.4 RBAC Permission Check Flow

```
Request          Auth Middleware     RBAC Service         Cache (Redis)
   │                  │                  │                     │
   │──API Request─────►│                 │                     │
   │                  │──Extract JWT     │                     │
   │                  │──Parse userId, orgId, action           │
   │                  │──Check cache────────────────────────►│
   │                  │◄────────────────────────────────────│
   │                  │  Cache HIT: permissions[]             │
   │                  │──Evaluate: hasPermission(action)?     │
   │                  │  YES: proceed to controller           │
   │                  │  NO: return 403 Forbidden             │
   │                  │                                       │
   │                  │  Cache MISS:                         │
   │                  │──Fetch role permissions──────────────►│
   │                  │◄──────────────────────────────────────│
   │                  │──Store in Redis (TTL: 5 min)─────────►│
   │                  │──Evaluate permission                  │
```

---

## 5. API Versioning Strategy

### 5.1 URL Versioning

All API endpoints are versioned:
```
/api/v1/...    → Current stable API
/api/v2/...    → Next major version (when breaking changes required)
```

### 5.2 Version Lifecycle

| Version | Status | Sunset Policy |
|---|---|---|
| v1 | Current | Minimum 12 months after v2 release |
| v2 | Future | N/A |

### 5.3 Backwards Compatibility Rules

**SHALL NOT break without major version bump:**
- Removing an endpoint
- Renaming a required field
- Changing a field type
- Changing HTTP method

**MAY happen without version bump:**
- Adding new optional fields to responses
- Adding new optional query parameters
- Adding new endpoints
- Adding new error codes (not removing existing)

---

## 6. Cross-Cutting Concerns

### 6.1 Request Correlation

Every HTTP request receives a `X-Request-ID` header (UUID v4). This ID propagates:
- Through all middleware
- Into all log entries
- Into all events emitted
- Into all downstream API calls
- Returned in error responses for customer support

### 6.2 Structured Logging

```typescript
// Every log entry follows this structure
{
  "timestamp": "2025-01-01T10:00:00.000Z",
  "level": "info",              // error, warn, info, debug
  "requestId": "uuid",
  "userId": "uuid",
  "organizationId": "uuid",
  "service": "auth-service",
  "action": "user.login",
  "duration": 45,               // ms
  "statusCode": 200,
  "message": "User login successful",
  "metadata": { ... }           // optional additional context
}
```

### 6.3 Health Check Standards

Every service exposes:
```
GET /health
Response:
{
  "status": "ok" | "degraded" | "down",
  "version": "1.2.3",
  "uptime": 3600,
  "checks": {
    "database": "ok",
    "redis": "ok",
    "storage": "ok"
  }
}
```

### 6.4 Idempotency

All POST endpoints that create resources accept an `X-Idempotency-Key` header:
- If same key used within 24 hours: return original response
- Prevents duplicate charges, duplicate records on network retries
- Stored in Redis with 24-hour TTL

---

## 7. Scalability Design

### 7.1 Horizontal Scaling

- API servers: Stateless → add instances freely
- Frontend (Next.js): Stateless → add instances freely
- Sessions: Stored in Redis (not in-memory) → survives instance restarts
- File uploads: Go directly to Azure Blob (not through API) → no I/O bottleneck

### 7.2 Database Scaling

- Read replicas for all SELECT-heavy operations (reports, dashboards)
- Write operations strictly to primary
- Connection pooling via Azure SQL built-in pooling + Prisma connection pool
- Query optimization: indexed foreign keys, no N+1 queries (enforced in code review)

### 7.3 Performance Budgets

| Metric | Budget | Alerting Threshold |
|---|---|---|
| API Response Time (P50) | 50ms | 100ms |
| API Response Time (P95) | 200ms | 400ms |
| API Response Time (P99) | 500ms | 1000ms |
| Database Query Time (P95) | 50ms | 100ms |
| Page Load (TTI) | 2s | 4s |
| Largest Contentful Paint | 1.5s | 2.5s |

---

## 8. Disaster Recovery Design

### 8.1 Recovery Objectives

| Scenario | RTO (Recovery Time) | RPO (Recovery Point) |
|---|---|---|
| App server failure | 5 minutes | 0 (stateless) |
| Redis failure | 10 minutes | 0 (sessions invalidated, re-login) |
| Database primary failure | 15 minutes | < 5 minutes (Azure SQL failover) |
| Full region failure | 4 hours | 1 hour |
| Catastrophic data loss | 24 hours | 24 hours |

### 8.2 Backup Strategy

| Data | Backup Frequency | Retention | Storage |
|---|---|---|---|
| Azure SQL (point-in-time) | Continuous | 35 days | Azure backup |
| Azure SQL (weekly full) | Weekly | 12 weeks | Azure backup |
| Blob Storage | Geo-redundant (GRS) | N/A (replicated) | Azure |
| Configuration / IaC | Git | Permanent | GitHub |

### 8.3 Incident Response Levels

| Level | Impact | Response Time | Escalation |
|---|---|---|---|
| P0 | Platform down, all users affected | 15 minutes | CTO immediately |
| P1 | Core feature broken, many users affected | 1 hour | Engineering lead |
| P2 | Feature degraded, some users affected | 4 hours | Senior engineer |
| P3 | Minor issue, few users affected | 24 hours | On-call engineer |

---

## 9. Feature Flags System

### 9.1 Purpose

Feature flags enable:
- Gradual rollout of new features
- A/B testing
- Emergency kill switches
- Beta access for specific organizations

### 9.2 Implementation

Using **LaunchDarkly** (or Azure App Configuration feature flags):

```typescript
// Usage in code
const isNewDashboardEnabled = await featureFlags.isEnabled(
  'new-dashboard-v2',
  {
    organizationId: context.orgId,
    userId: context.userId,
    plan: context.subscription.plan
  }
);

if (isNewDashboardEnabled) {
  // new implementation
} else {
  // existing implementation
}
```

### 9.3 Flag Categories

| Category | Example | Kill Switch? |
|---|---|---|
| Feature Release | `new-billing-ui` | Yes |
| Experiment | `dashboard-layout-b` | Yes |
| Plan Gate | `advanced-audit-logs` | No (plan-based) |
| Maintenance | `read-only-mode` | Yes (emergency) |

---

## 10. Background Jobs System

### 10.1 Job Categories

| Job Name | Frequency | Description |
|---|---|---|
| subscription.renewal-check | Every hour | Find subscriptions due for renewal |
| billing.dunning-check | Daily at 8am | Process failed payment retries |
| product.usage-sync | Every 5 min | Pull usage stats from all products |
| notification.email-digest | Daily at 9am | Send activity digest emails |
| audit.retention-cleanup | Weekly | Archive old audit logs |
| session.cleanup | Daily | Remove expired sessions |
| file.orphan-cleanup | Weekly | Remove files with no DB record |
| report.precompute | Nightly | Pre-compute heavy dashboard reports |
| trial.expiry-notification | Daily | Send trial expiry warnings |

### 10.2 Job Architecture

Using **Bull** (Redis-backed queue) for job management:

```typescript
// jobs/subscription-renewal.job.ts
export const subscriptionRenewalJob = new Bull('subscription-renewal', redisConfig);

subscriptionRenewalJob.process(async (job) => {
  const { subscriptionId } = job.data;
  await subscriptionService.processRenewal(subscriptionId);
});

// Schedule: recurring every hour
subscriptionRenewalJob.add({}, { repeat: { cron: '0 * * * *' } });
```

### 10.3 Job Monitoring

- Failed jobs retry 3 times with exponential backoff
- Failed after all retries → alert via Sentry + email to engineering
- Job dashboard available in admin portal (Bull Board)
- Job completion rate tracked in Grafana

---

*Next: [05-Database-Design.md — Complete MSSQL Schema, Table Definitions, Indexes & Migration Strategy]*

---
**Document Control**  
Owner: Platform Architect  
Review: Before major feature additions
