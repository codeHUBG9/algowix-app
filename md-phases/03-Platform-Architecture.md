# AlgoWix Platform — 03 Platform Architecture

**Document Version:** 1.0.0  
**Status:** Approved  
**Stack:** Node.js + Next.js + MSSQL + Azure

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack Decision Matrix](#2-technology-stack-decision-matrix)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Backend Architecture (Node.js)](#4-backend-architecture-nodejs)
5. [Frontend Architecture (Next.js)](#5-frontend-architecture-nextjs)
6. [Database Architecture (MSSQL)](#6-database-architecture-mssql)
7. [API Gateway Layer](#7-api-gateway-layer)
8. [Caching Strategy](#8-caching-strategy)
9. [Queue & Event Architecture](#9-queue--event-architecture)
10. [Storage Architecture](#10-storage-architecture)
11. [Email & Communication Layer](#11-email--communication-layer)
12. [Infrastructure Topology](#12-infrastructure-topology)
13. [Environment Strategy](#13-environment-strategy)
14. [Service Communication Patterns](#14-service-communication-patterns)

---

## 1. Architecture Overview

AlgoWix Platform follows a **Layered Microservices Architecture** with a modular monolith at its core. Rather than starting with dozens of independent microservices (which adds operational overhead at early scale), the platform starts as a well-structured modular Node.js application that can be decomposed later.

### Architecture Style: Modular Monolith → Selective Microservices

```
                        ┌────────────────────────────────────────────┐
                        │            CLIENTS                          │
                        │  Next.js Web App | Mobile PWA | API Clients │
                        └──────────────────┬─────────────────────────┘
                                           │ HTTPS
                        ┌──────────────────▼─────────────────────────┐
                        │         EDGE LAYER (Cloudflare)             │
                        │   DDoS Protection | WAF | CDN | Rate Limit  │
                        └──────────────────┬─────────────────────────┘
                                           │
                        ┌──────────────────▼─────────────────────────┐
                        │         API GATEWAY (Express / Kong)        │
                        │   Auth Middleware | Rate Limiting | Routing  │
                        └──┬──────────┬───────────┬────────────┬─────┘
                           │          │           │            │
              ┌────────────▼───┐ ┌────▼────┐ ┌───▼───┐  ┌────▼────┐
              │ Auth Service   │ │ Org Svc │ │Billing│  │Notif Svc│
              │ (JWT/OAuth)    │ │         │ │  Svc  │  │         │
              └────────────────┘ └─────────┘ └───────┘  └─────────┘
                           │          │           │            │
                        ┌──▼──────────▼───────────▼────────────▼─────┐
                        │           MSSQL Database Cluster             │
                        │   Primary (R/W) | Read Replica | Tenant DBs │
                        └─────────────────────────────────────────────┘
```

### Deployment Target: Azure Cloud

| Service | Azure Product |
|---|---|
| Compute | Azure App Service / AKS (future) |
| Database | Azure SQL (MSSQL Managed) |
| Cache | Azure Cache for Redis |
| Storage | Azure Blob Storage |
| CDN | Azure CDN + Cloudflare |
| Email | Azure Communication Services / SendGrid |
| Queue | Azure Service Bus |
| Secrets | Azure Key Vault |
| Monitoring | Azure Monitor + Application Insights |
| CI/CD | Azure DevOps Pipelines |

---

## 2. Technology Stack Decision Matrix

### 2.1 Backend

| Technology | Choice | Rationale |
|---|---|---|
| Runtime | **Node.js 20 LTS** | Non-blocking I/O ideal for API gateway patterns; large ecosystem; team familiarity |
| Framework | **Express.js 4.x** (core) + **Fastify** (high-perf services) | Express for flexibility, Fastify for critical path services |
| Language | **TypeScript 5.x** | Type safety across all services; mandatory for enterprise codebase |
| ORM | **Prisma ORM** | Type-safe MSSQL queries; migration management; excellent DX |
| Validation | **Zod** | Runtime schema validation; integrates with TypeScript |
| Authentication | **JWT + Passport.js + node-jose** | Industry standard; supports RSA-256 signing |
| Testing | **Vitest + Supertest** | Fast unit tests; API integration tests |
| API Documentation | **OpenAPI 3.1 + Swagger UI** | Auto-generated from TypeScript decorators |
| Logging | **Winston + Morgan** | Structured JSON logging; request logging |
| Process Manager | **PM2** (dev/staging), **Kubernetes** (prod) | Clustering; zero-downtime deploys |

### 2.2 Frontend

| Technology | Choice | Rationale |
|---|---|---|
| Framework | **Next.js 14 (App Router)** | SSR/SSG/ISR capabilities; file-based routing; React Server Components |
| Language | **TypeScript 5.x** | Shared types with backend via monorepo |
| State Management | **Zustand** (global) + **React Query (TanStack)** (server state) | Lightweight global state; powerful cache + sync for API data |
| UI Library | **shadcn/ui + Radix UI** | Headless, accessible, fully customizable |
| Styling | **Tailwind CSS 3.x** | Utility-first; fast design iteration; consistent design tokens |
| Forms | **React Hook Form + Zod** | Performant forms; shared validation schemas with backend |
| Charts | **Recharts + Tremor** | React-native charts; enterprise dashboard components |
| Icons | **Lucide React** | Consistent, modern icon set |
| Date Handling | **date-fns** | Lightweight; tree-shakable; timezone support |
| Testing | **Vitest + Testing Library + Playwright** | Unit + E2E testing |
| Animation | **Framer Motion** | Smooth transitions; micro-interactions |

### 2.3 Database

| Technology | Choice | Rationale |
|---|---|---|
| Primary DB | **Microsoft SQL Server 2022** | Enterprise-grade; JSON support; row-level security; Azure SQL managed |
| Cache | **Redis 7** | Session storage; rate limiting; real-time pub/sub |
| Search | **Azure Cognitive Search** (future) | Full-text search across platform entities |
| File Storage | **Azure Blob Storage** | Scalable object storage; CDN integration |
| Migrations | **Prisma Migrate** | Version-controlled schema migrations |

### 2.4 Infrastructure & DevOps

| Technology | Choice | Rationale |
|---|---|---|
| Containerization | **Docker** | Consistent environments; easy deployment |
| Orchestration | **Azure App Service** (v1), **AKS** (v2) | Managed scale; Kubernetes when complexity justifies it |
| CI/CD | **Azure DevOps Pipelines** | Integrated with Azure; supports YAML-based pipelines |
| IaC | **Terraform** | Declarative infrastructure; reproducible environments |
| Monitoring | **Azure Application Insights** + **Grafana** | APM; custom dashboards |
| Error Tracking | **Sentry** | Real-time error alerting; performance monitoring |
| API Gateway | **Azure API Management** | Rate limiting; caching; developer portal |
| Secrets | **Azure Key Vault** | Centralized secrets; no secrets in code |
| CDN / WAF | **Cloudflare** | Global CDN; DDoS protection; WAF rules |

---

## 3. Monorepo Structure

The entire AlgoWix Platform is managed in a single monorepo using **Turborepo**.

```
algowix-platform/
├── apps/
│   ├── web/                          # Next.js frontend (app.algowix.com)
│   │   ├── app/                      # App Router pages
│   │   ├── components/               # UI components
│   │   ├── lib/                      # Utilities
│   │   ├── hooks/                    # Custom React hooks
│   │   ├── stores/                   # Zustand stores
│   │   └── public/                   # Static assets
│   │
│   └── api/                          # Node.js backend
│       ├── src/
│       │   ├── modules/              # Feature modules
│       │   │   ├── auth/
│       │   │   ├── organizations/
│       │   │   ├── users/
│       │   │   ├── products/
│       │   │   ├── billing/
│       │   │   ├── subscriptions/
│       │   │   ├── notifications/
│       │   │   ├── audit/
│       │   │   ├── files/
│       │   │   ├── reports/
│       │   │   └── developer/
│       │   ├── middleware/           # Express middleware
│       │   ├── config/               # App configuration
│       │   ├── database/             # Prisma client, migrations
│       │   ├── services/             # Shared services
│       │   ├── jobs/                 # Background jobs
│       │   ├── events/               # Event bus handlers
│       │   └── utils/                # Shared utilities
│       └── prisma/
│           ├── schema.prisma
│           └── migrations/
│
├── packages/
│   ├── shared-types/                 # Shared TypeScript types
│   ├── shared-utils/                 # Shared utility functions
│   ├── ui/                           # Shared UI component library
│   ├── email-templates/              # React Email templates
│   ├── config/                       # Shared ESLint, TS configs
│   └── sdk/                          # AlgoWix Platform SDK (for products)
│
├── infrastructure/
│   ├── terraform/                    # IaC for all environments
│   ├── docker/                       # Dockerfiles
│   └── k8s/                          # Kubernetes manifests (future)
│
├── scripts/                          # Dev tooling scripts
├── .github/ OR azure-pipelines/      # CI/CD definitions
├── turbo.json                        # Turborepo pipeline config
├── package.json                      # Root package.json (workspaces)
└── docker-compose.yml                # Local dev environment
```

---

## 4. Backend Architecture (Node.js)

### 4.1 Module Structure (Each Feature Module)

Each feature in the backend follows a consistent module pattern:

```
modules/organizations/
├── organizations.router.ts       # Express router with route definitions
├── organizations.controller.ts   # Request/response handling
├── organizations.service.ts      # Business logic
├── organizations.repository.ts   # Database queries via Prisma
├── organizations.schema.ts       # Zod validation schemas
├── organizations.types.ts        # TypeScript interfaces
├── organizations.events.ts       # Domain events emitted/consumed
├── organizations.middleware.ts   # Module-specific middleware
└── organizations.test.ts         # Unit + integration tests
```

### 4.2 Request Lifecycle

```
HTTP Request
    │
    ▼
Cloudflare Edge (WAF, DDoS, TLS termination)
    │
    ▼
Azure Load Balancer
    │
    ▼
Express App Entry Point (app.ts)
    │
    ▼
Global Middleware Stack:
  - Helmet (security headers)
  - CORS (origin validation)
  - Rate Limiter (Redis-backed)
  - Request ID (correlation ID)
  - Request Logger (Morgan)
  - Body Parser (JSON, 10mb limit)
    │
    ▼
API Router (/api/v1)
    │
    ▼
Auth Middleware (JWT validation)
    │
    ▼
Tenant Resolution Middleware (extract org context)
    │
    ▼
Permission Check Middleware (RBAC)
    │
    ▼
Feature Router (e.g., /api/v1/organizations)
    │
    ▼
Controller (validate input with Zod)
    │
    ▼
Service (business logic)
    │
    ▼
Repository (Prisma query)
    │
    ▼
MSSQL Database
    │
    ▼
Response Serializer (transform + envelope)
    │
    ▼
HTTP Response
```

### 4.3 Standard API Response Envelope

All API responses follow a consistent envelope:

```typescript
// Success Response
{
  "success": true,
  "data": { ... },           // actual payload
  "meta": {                  // optional pagination/metadata
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "requestId": "uuid-v4"    // correlation ID for debugging
}

// Error Response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",    // machine-readable code
    "message": "Email is invalid", // human-readable
    "details": [                   // optional field-level errors
      { "field": "email", "message": "Must be a valid email" }
    ]
  },
  "requestId": "uuid-v4"
}
```

### 4.4 Error Code Standards

| Code | HTTP Status | Meaning |
|---|---|---|
| `UNAUTHORIZED` | 401 | No valid authentication |
| `FORBIDDEN` | 403 | Authenticated but no permission |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `VALIDATION_ERROR` | 422 | Input validation failed |
| `CONFLICT` | 409 | Duplicate resource |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | Downstream service down |
| `TENANT_SUSPENDED` | 403 | Organization subscription expired |
| `FEATURE_NOT_AVAILABLE` | 403 | Feature not in subscription plan |

### 4.5 Application Entry Point (app.ts)

```typescript
// src/app.ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimiter } from './middleware/rateLimiter';
import { requestId } from './middleware/requestId';
import { errorHandler } from './middleware/errorHandler';
import { apiRouter } from './api.router';

const app = express();

// Security
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') }));

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Platform middleware
app.use(requestId);
app.use(rateLimiter);

// Health check (no auth required)
app.get('/health', (req, res) => res.json({ status: 'ok', version: process.env.APP_VERSION }));

// API routes
app.use('/api/v1', apiRouter);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
```

---

## 5. Frontend Architecture (Next.js)

### 5.1 App Router Structure

```
app/
├── (auth)/                          # Auth layout group
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── forgot-password/page.tsx
│   └── verify-email/page.tsx
│
├── (platform)/                      # Main platform layout
│   ├── layout.tsx                   # Platform shell (sidebar, topbar)
│   ├── dashboard/page.tsx
│   ├── organization/
│   │   ├── page.tsx
│   │   ├── branches/page.tsx
│   │   └── departments/page.tsx
│   ├── products/
│   │   ├── page.tsx                 # Product catalog
│   │   └── [productSlug]/page.tsx   # Product detail/launch
│   ├── administration/
│   │   ├── users/page.tsx
│   │   ├── roles/page.tsx
│   │   └── audit-logs/page.tsx
│   ├── billing/
│   │   ├── plans/page.tsx
│   │   ├── invoices/page.tsx
│   │   └── payment-methods/page.tsx
│   ├── developer/
│   │   ├── api-keys/page.tsx
│   │   ├── webhooks/page.tsx
│   │   └── integrations/page.tsx
│   └── settings/
│       ├── general/page.tsx
│       ├── security/page.tsx
│       └── sessions/page.tsx
│
├── api/                             # Next.js API routes (BFF layer)
│   └── [...]/route.ts
│
├── layout.tsx                       # Root layout
├── not-found.tsx
└── error.tsx
```

### 5.2 State Management Strategy

```typescript
// Global state: Zustand (lightweight, no boilerplate)
// Use for: auth session, theme, sidebar state, notifications count

// Server state: TanStack Query (React Query)
// Use for: all API data — fetching, caching, invalidation, mutations
// Every API resource gets its own query hook

// Example: useOrganization hook
export function useOrganization() {
  return useQuery({
    queryKey: ['organization', orgId],
    queryFn: () => api.organizations.get(orgId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

### 5.3 Authentication Flow (Frontend)

```
1. User opens app.algowix.com
2. Middleware (middleware.ts) checks for valid session cookie
3. No session → redirect to /login
4. Login form submits to /api/auth/login
5. Backend validates credentials → returns JWT + refresh token
6. JWT stored in httpOnly cookie (NOT localStorage)
7. Refresh token stored in httpOnly cookie
8. Next.js middleware validates JWT on every request
9. JWT expires → middleware calls /api/auth/refresh automatically
10. Invalid refresh token → redirect to /login
```

### 5.4 API Client Layer

```typescript
// lib/api-client.ts
// Typed API client using fetch with interceptors

class ApiClient {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL;

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: this.getHeaders(),
      credentials: 'include', // send cookies
    });
    return this.handleResponse<T>(response);
  }

  // POST, PUT, PATCH, DELETE...
  
  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
      // Token expired — attempt refresh
      await this.refreshToken();
    }
    const data = await response.json();
    if (!data.success) throw new ApiError(data.error);
    return data.data as T;
  }
}
```

---

## 6. Database Architecture (MSSQL)

### 6.1 Database Topology

```
Azure SQL Configuration:
├── Primary Instance (Read + Write)
│   └── algowix_platform (main database)
│       ├── Schema: platform      → core platform tables
│       ├── Schema: billing       → billing/invoice tables
│       ├── Schema: audit         → audit log tables
│       └── Schema: developer     → api keys, webhooks
│
├── Read Replica (Read-Only)
│   └── For reports, dashboards, heavy read queries
│
└── Future: Per-Tenant Databases (Enterprise tier)
    ├── tenant_org_001
    └── tenant_org_002
```

### 6.2 Schema Separation Strategy

Using SQL Server schemas to logically separate concerns:

```sql
-- Core platform tables
CREATE TABLE platform.Organizations ( ... );
CREATE TABLE platform.Users ( ... );
CREATE TABLE platform.Sessions ( ... );

-- Billing tables
CREATE TABLE billing.Subscriptions ( ... );
CREATE TABLE billing.Invoices ( ... );
CREATE TABLE billing.Payments ( ... );

-- Audit tables (append-only, never updated)
CREATE TABLE audit.Logs ( ... );

-- Developer tables
CREATE TABLE developer.ApiKeys ( ... );
CREATE TABLE developer.Webhooks ( ... );
```

### 6.3 Multi-Tenancy Approach

**Row-Level Tenancy** (default for all plans):
- Every table includes `OrganizationId` column
- All queries include `WHERE OrganizationId = @orgId` automatically via middleware
- Prisma middleware auto-injects tenant filter

**Dedicated Database Tenancy** (Enterprise):
- Enterprise customers get isolated database instance
- Connection string stored in Key Vault, resolved at runtime per tenant
- Identical schema; no data mixing possible

---

## 7. API Gateway Layer

### 7.1 Azure API Management Configuration

```yaml
# Rate limits per tier
Starter:
  requests_per_minute: 60
  requests_per_day: 1000

Growth:
  requests_per_minute: 300
  requests_per_day: 10000

Business:
  requests_per_minute: 1000
  requests_per_day: 100000

Enterprise:
  requests_per_minute: custom
  requests_per_day: custom
```

### 7.2 Gateway Responsibilities

- JWT token validation before routing
- Rate limiting (per API key, per IP, per organization)
- Request/response logging
- Caching of frequently-accessed, low-volatility responses
- Transformation (e.g., field renaming for SDK backwards compatibility)
- Documentation hosting (Swagger UI)

---

## 8. Caching Strategy

### 8.1 Cache Layers

| Layer | Technology | TTL | Use Case |
|---|---|---|---|
| Browser Cache | HTTP Cache-Control | 5 min | Static assets |
| CDN Cache | Cloudflare | 1 hour | Public pages |
| Application Cache | Redis | Variable | Session, tokens, computed data |
| Database Query Cache | Redis | 60s | Expensive reports queries |

### 8.2 Redis Key Naming Convention

```
# Session
session:{userId}:{sessionId}

# Rate limit
ratelimit:{identifier}:{window}

# Organization (cached)
org:{organizationId}

# User permissions (cached)
permissions:{userId}:{organizationId}

# Product catalog (cached, shared)
products:catalog

# Subscription status
subscription:{organizationId}:{productSlug}
```

### 8.3 Cache Invalidation Rules

- Organization updated → invalidate `org:{id}` + `permissions:*:{id}`
- User role changed → invalidate `permissions:{userId}:*`
- Subscription changed → invalidate `subscription:{orgId}:*`
- Product catalog updated → invalidate `products:catalog`

---

## 9. Queue & Event Architecture

### 9.1 Azure Service Bus Configuration

```
Topics (Pub/Sub):
├── platform.user.events
│   ├── Subscription: notification-service
│   ├── Subscription: audit-service
│   └── Subscription: email-service
│
├── platform.billing.events
│   ├── Subscription: notification-service
│   ├── Subscription: audit-service
│   └── Subscription: webhook-dispatcher
│
└── platform.product.events
    ├── Subscription: notification-service
    └── Subscription: audit-service

Queues (Point-to-Point):
├── email.outbound          → Email delivery queue
├── webhook.dispatch        → Webhook delivery queue
├── report.generation       → Async report generation
└── invoice.generation      → Invoice PDF generation
```

### 9.2 Event Schema Standard

All platform events follow this structure:

```typescript
interface PlatformEvent<T = unknown> {
  eventId: string;          // UUID v4
  eventType: string;        // 'user.created', 'subscription.activated'
  version: string;          // '1.0'
  timestamp: string;        // ISO 8601
  organizationId: string;   // Tenant context
  actorId: string;          // Who triggered this
  data: T;                  // Event-specific payload
  metadata: {
    source: string;         // 'platform-api'
    correlationId: string;  // Request correlation ID
    environment: string;    // 'production' | 'staging'
  };
}
```

---

## 10. Storage Architecture

### 10.1 Azure Blob Storage Structure

```
Storage Account: algowix-platform-storage
├── Container: org-files/{organizationId}/
│   ├── documents/
│   ├── images/
│   └── exports/
├── Container: invoices/
│   └── {year}/{month}/{invoiceId}.pdf
├── Container: avatars/
│   └── {userId}/profile.jpg
└── Container: backups/
    └── {date}/
```

### 10.2 File Upload Flow

```
Client → Request presigned URL from API
API → Validate permissions → Generate Azure SAS token (15 min expiry)
Client → Upload directly to Blob Storage (no server proxy)
Client → Notify API of upload completion
API → Validate file (virus scan, size, type) → Save metadata to DB
API → Return permanent file URL (CDN-backed)
```

---

## 11. Email & Communication Layer

### 11.1 Email Provider

**Primary:** Azure Communication Services  
**Fallback:** SendGrid  

### 11.2 Email Template System

Built with **React Email** — TypeScript-first email templates:

```
packages/email-templates/
├── templates/
│   ├── auth/
│   │   ├── welcome.tsx
│   │   ├── email-verification.tsx
│   │   ├── password-reset.tsx
│   │   └── magic-link.tsx
│   ├── billing/
│   │   ├── invoice.tsx
│   │   ├── payment-failed.tsx
│   │   ├── subscription-activated.tsx
│   │   └── trial-expiring.tsx
│   ├── organization/
│   │   ├── user-invite.tsx
│   │   └── team-added.tsx
│   └── notifications/
│       └── digest.tsx
```

---

## 12. Infrastructure Topology

### 12.1 Production Topology (Azure)

```
Internet
    │
    ▼
Cloudflare (DNS, CDN, WAF, DDoS)
    │
    ▼
Azure Application Gateway (SSL Termination, Load Balancer)
    │
    ├──► Azure App Service (Next.js Frontend) — 2 instances
    │
    ├──► Azure App Service (Node.js API) — 2-4 instances (auto-scale)
    │
    ├──► Azure Cache for Redis — Standard tier (2 nodes)
    │
    ├──► Azure SQL — Business Critical tier
    │       ├── Primary (R/W)
    │       └── Secondary Replica (R only)
    │
    ├──► Azure Blob Storage (Files, Invoices)
    │
    ├──► Azure Service Bus (Event queues)
    │
    ├──► Azure Key Vault (Secrets)
    │
    └──► Azure Application Insights (Monitoring)
```

---

## 13. Environment Strategy

| Environment | Domain | Purpose | Auto-Deploy |
|---|---|---|---|
| Local Dev | localhost:3000 / :4000 | Developer machines | No |
| Development | dev.app.algowix.com | Feature branch testing | Yes (PR merge) |
| Staging | staging.app.algowix.com | Pre-production QA | Yes (main branch) |
| Production | app.algowix.com | Live customers | Manual approval |

### 13.1 Environment Variables Strategy

```bash
# Never hardcoded — always from environment
# Local: .env.local (gitignored)
# Staging/Prod: Azure Key Vault references in App Service config

NODE_ENV=production
DATABASE_URL=           # Azure SQL connection string (from Key Vault)
REDIS_URL=              # Azure Redis connection string (from Key Vault)
JWT_PRIVATE_KEY=        # RSA private key (from Key Vault)
JWT_PUBLIC_KEY=         # RSA public key (from Key Vault)
AZURE_STORAGE_URL=      # Blob storage endpoint
SENDGRID_API_KEY=       # Email provider (from Key Vault)
RAZORPAY_KEY_ID=        # Payment gateway (from Key Vault)
RAZORPAY_KEY_SECRET=    # Payment gateway (from Key Vault)
SENTRY_DSN=             # Error tracking
NEXT_PUBLIC_API_URL=    # Frontend → API URL
```

---

## 14. Service Communication Patterns

### 14.1 Synchronous (REST API)
Used for: User-facing requests, CRUD operations, real-time data

### 14.2 Asynchronous (Service Bus Events)
Used for: Email sending, webhook delivery, audit log writing, report generation

### 14.3 Platform → Product Communication

Each AlgoWix product exposes a **Product Contract API**. The platform calls these endpoints to:

```typescript
// Platform calls product every 5 minutes (or on demand)
GET {product_url}/api/platform/health      → Product health status
GET {product_url}/api/platform/usage       → Current usage metrics
GET {product_url}/api/platform/license     → License validation
GET {product_url}/api/platform/statistics  → Dashboard stats for platform

// Platform sends to product (on subscription change)
POST {product_url}/api/platform/provision    → Create tenant
POST {product_url}/api/platform/suspend      → Suspend tenant
POST {product_url}/api/platform/deprovision  → Delete tenant data
```

### 14.4 Product → Platform Communication

```typescript
// Product calls platform (webhook or direct API)
POST {platform_url}/api/internal/notifications  → Send notification to user
POST {platform_url}/api/internal/audit          → Log an action
POST {platform_url}/api/internal/usage-event    → Report usage event
```

---

*Next: [04-System-Design.md — Detailed System Design, Entity Relationships & Data Flow Diagrams]*

---
**Document Control**  
Owner: Platform Architect  
Review: Before any infrastructure change
