# AlgoWix Platform — 10 API Gateway

**Document Version:** 1.0.0  
**Status:** Approved

---

## Table of Contents

1. [API Gateway Architecture](#1-api-gateway-architecture)
2. [Azure API Management Configuration](#2-azure-api-management-configuration)
3. [Rate Limiting Design](#3-rate-limiting-design)
4. [Request Routing](#4-request-routing)
5. [API Authentication at Gateway](#5-api-authentication-at-gateway)
6. [Response Caching](#6-response-caching)
7. [API Versioning at Gateway Level](#7-api-versioning-at-gateway-level)
8. [Developer Portal (APIM Built-in)](#8-developer-portal-apim-built-in)
9. [Monitoring & Analytics](#9-monitoring--analytics)
10. [API Standards & Design Guidelines](#10-api-standards--design-guidelines)

---

## 1. API Gateway Architecture

```
External Clients
(Web App, Mobile, API Consumers)
        │
        ▼
  Cloudflare WAF
(DDoS, Bot Protection, IP Rules)
        │
        ▼
 Azure API Management (APIM)
┌───────────────────────────────┐
│  - JWT Validation             │
│  - Rate Limiting              │
│  - Request/Response Logging   │
│  - Caching                    │
│  - API Versioning             │
│  - IP Filtering               │
│  - CORS Policy                │
│  - Response Transformation    │
└───────────┬───────────────────┘
            │
    ┌───────┴────────┐
    │                │
    ▼                ▼
Platform API    Internal APIs
(Node.js)       (Admin, Jobs)
```

---

## 2. Azure API Management Configuration

### Products (APIM Products = API Groups)

```yaml
APIM Products:
  platform-public:
    description: Public Platform API
    requires_subscription: false
    apis: [auth, health, jwks]

  platform-authenticated:
    description: Authenticated Platform API  
    requires_subscription: true
    requires_approval: false
    apis: [organizations, users, products, billing, notifications, audit, files]

  developer-api:
    description: Developer API (requires API key)
    requires_subscription: true
    requires_approval: true
    apis: [api-v1]

  internal:
    description: Internal platform-to-product communication
    requires_subscription: true
    requires_approval: true
    apis: [internal-notifications, internal-audit]
```

### APIM Policy (Global Inbound)

```xml
<policies>
  <inbound>
    <!-- Security headers check -->
    <check-header name="Content-Type" failed-check-httpcode="415"
      failed-check-error-message="Unsupported media type" ignore-case="true">
      <value>application/json</value>
    </check-header>

    <!-- Correlation ID -->
    <set-header name="X-Request-ID" exists-action="skip">
      <value>@(Guid.NewGuid().ToString())</value>
    </set-header>

    <!-- CORS -->
    <cors allow-credentials="true">
      <allowed-origins>
        <origin>https://app.algowix.com</origin>
        <origin>https://dev.app.algowix.com</origin>
      </allowed-origins>
      <allowed-methods>GET, POST, PUT, PATCH, DELETE, OPTIONS</allowed-methods>
      <allowed-headers>Authorization, Content-Type, X-Request-ID</allowed-headers>
    </cors>
  </inbound>
</policies>
```

---

## 3. Rate Limiting Design

### Rate Limit Tiers

| Tier | Window | Max Requests | Burst |
|---|---|---|---|
| Unauthenticated | 1 min | 30 | 10 |
| Authenticated (Starter) | 1 min | 60 | 20 |
| Authenticated (Growth) | 1 min | 300 | 50 |
| Authenticated (Business) | 1 min | 1,000 | 100 |
| Enterprise | Custom | Custom | Custom |
| API Key (Starter) | 1 min | 60 | 10 |
| API Key (Growth) | 1 min | 600 | 50 |

### Rate Limit Keys

Rate limits are applied per:
1. IP address (unauthenticated)
2. Organization ID (authenticated requests)
3. API Key (developer API)

### Rate Limit Headers

```
HTTP/1.1 200 OK
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 245
X-RateLimit-Reset: 1735689600
X-RateLimit-Policy: growth-tier

HTTP/1.1 429 Too Many Requests
Retry-After: 45
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 0
```

### Redis-Backed Rate Limiting

```typescript
// middleware/rate-limiter.ts
import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';

export const rateLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: (req) => {
    if (!req.auth) return 30;
    switch (req.tenant?.plan) {
      case 'ENTERPRISE': return 10000;
      case 'BUSINESS': return 1000;
      case 'GROWTH': return 300;
      default: return 60;
    }
  },
  store: new RedisStore({ client: redisClient }),
  keyGenerator: (req) => req.auth?.organizationId || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' }
    });
  }
});
```

---

## 4. Request Routing

### Route Map

```
/api/v1/auth/*              → Auth Service module
/api/v1/organizations/*     → Organization Service module
/api/v1/users/*             → User/Identity module
/api/v1/products/*          → Product Registry module
/api/v1/subscriptions/*     → Subscription Service module
/api/v1/billing/*           → Billing Service module
/api/v1/notifications/*     → Notification Service module
/api/v1/audit/*             → Audit Service module
/api/v1/files/*             → File Service module
/api/v1/reports/*           → Report Service module
/api/v1/developer/*         → Developer Portal module
/api/v1/search              → Global Search
/api/internal/*             → Internal APIs (product communication)
/webhooks/*                 → Webhook receivers (payment gateways)
/.well-known/jwks.json      → Public key endpoint (no auth)
/health                     → Health check (no auth)
```

---

## 5. API Authentication at Gateway

### Auth Flow at Gateway

```
1. Extract JWT from Authorization header or cookie
2. Fetch JWKS from internal cache (refreshed every 15 min)
3. Verify JWT signature
4. Check expiry
5. Forward userId and organizationId as headers to backend:
   X-User-ID: uuid
   X-Organization-ID: uuid
   X-User-Role: Admin
6. Backend trusts these headers (only accessible from gateway)
```

### API Key Authentication

```
Authorization: ApiKey awx_live_xxxxxxxxxxxxx

Gateway:
1. Extract API key from header
2. Hash the key
3. Lookup hash in Redis cache (fallback: DB)
4. Validate key is active, not expired
5. Extract organizationId from key record
6. Forward as headers (same as JWT flow)
```

---

## 6. Response Caching

### Cacheable Endpoints

| Endpoint | TTL | Cache Key |
|---|---|---|
| GET /api/v1/products | 5 minutes | `products:catalog` |
| GET /api/v1/products/:slug | 5 minutes | `product:{slug}` |
| GET /.well-known/jwks.json | 15 minutes | `jwks:public` |
| GET /api/v1/organizations/:id | 60 seconds | `org:{id}` |

### Cache Invalidation Headers

```
Cache-Control: public, max-age=300
ETag: "abc123"
Last-Modified: Wed, 01 Jan 2025 10:00:00 GMT
```

---

## 7. API Versioning at Gateway Level

The gateway handles version routing:

```
/api/v1/* → Forward to primary backend
/api/v2/* → Forward to v2 backend instances (future)

Deprecation header added to v1 responses when v2 exists:
Deprecation: true
Sunset: Sat, 31 Dec 2026 00:00:00 GMT
Link: <https://docs.algowix.com/api/v2>; rel="successor-version"
```

---

## 8. Developer Portal (APIM Built-in)

Azure APIM provides a built-in developer portal at `developers.algowix.com`:

- Interactive API explorer (try-it-now)
- Auto-generated API documentation from OpenAPI specs
- API key self-service management
- Usage analytics per developer
- Code samples (Node.js, Python, cURL, PHP)

### OpenAPI Spec Generation

```typescript
// Using swagger-jsdoc + swagger-ui-express
import swaggerJsdoc from 'swagger-jsdoc';

const spec = swaggerJsdoc({
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'AlgoWix Platform API',
      version: '1.0.0',
      description: 'The AlgoWix Platform API',
    },
    servers: [{ url: 'https://api.algowix.com/v1' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        apiKey: { type: 'apiKey', in: 'header', name: 'Authorization' }
      }
    }
  },
  apis: ['./src/modules/**/*.router.ts'],
});
```

---

## 9. Monitoring & Analytics

### APIM Metrics Tracked

- Request count per endpoint, per consumer, per time window
- Response time percentiles (P50, P95, P99)
- Error rate by status code
- Cache hit rate
- Rate limit trigger rate

### Alerts

| Alert | Threshold | Action |
|---|---|---|
| Error rate > 1% | 5 min window | PagerDuty alert |
| P99 latency > 2s | 5 min window | Engineering notification |
| Rate limit hits > 1000/min | Any window | Review abuse |
| Health check failure | 2 consecutive | Incident created |

---

## 10. API Standards & Design Guidelines

### REST Principles Followed

1. **Resources are nouns** — `/organizations`, `/users`, `/subscriptions`
2. **HTTP methods are verbs** — GET (read), POST (create), PUT/PATCH (update), DELETE (delete)
3. **Plural resource names** — `/organizations` not `/organization`
4. **Nested for ownership** — `/organizations/:id/members` not `/members?orgId=xxx`
5. **Filter via query params** — `GET /users?status=active&role=admin`
6. **Pagination via query params** — `?page=1&limit=20` or cursor-based `?after=uuid`
7. **HTTP status codes are meaningful** — no `200` for errors
8. **Idempotent PUT** — PUT always replaces the resource completely
9. **PATCH for partial updates** — PATCH only updates provided fields
10. **Consistent date format** — ISO 8601 (`2025-01-01T10:00:00Z`)

### Field Naming

- All JSON fields in **camelCase**
- All enum values in **UPPER_SNAKE_CASE**
- All IDs are **UUIDs** (not integers)
- All dates are **ISO 8601 strings** (not Unix timestamps)

---

*Next: [11-Billing.md — Complete Billing Architecture, Payment Processing, Invoice Generation]*

---
**Document Control**  
Owner: Platform Architect + API Lead
