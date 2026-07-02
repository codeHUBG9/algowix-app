# AlgoWix Platform — 09 Product Integration

**Document Version:** 1.0.0  
**Status:** Approved

---

## Table of Contents

1. [Product Integration Philosophy](#1-product-integration-philosophy)
2. [Product Registry](#2-product-registry)
3. [Product Contract API (Required)](#3-product-contract-api-required)
4. [Platform → Product Communication](#4-platform--product-communication)
5. [Product → Platform Communication](#5-product--platform-communication)
6. [Product Health Monitoring](#6-product-health-monitoring)
7. [Platform SDK for Products](#7-platform-sdk-for-products)
8. [Product Onboarding Checklist](#8-product-onboarding-checklist)
9. [CRM Integration Example](#9-crm-integration-example)

---

## 1. Product Integration Philosophy

Each AlgoWix product (CRM, Inventory, HRMS) remains:
- An **independent codebase** with its own Git repository
- An **independent deployment** with its own infrastructure
- An **independent database** with no shared tables with the platform
- An **independent release cycle** — releases do not need to be coordinated with platform releases

The platform and products communicate only through:
1. A **JWT-based SSO token** (user identity)
2. A **Product Contract API** (standardized REST endpoints each product exposes)
3. An **Event Bus** (optional, for real-time notifications)

---

## 2. Product Registry

The Product Registry is the platform's catalog of all available products.

### Product Registration

Products are registered by AlgoWix engineering team in the platform database. Third-party apps go through an approval process before appearing in the Marketplace.

```typescript
// To register a new product, insert into Products table:
interface ProductRegistration {
  slug: string;              // 'crm', 'inventory', 'hrms'
  name: string;              // 'CRM'
  description: string;
  baseUrl: string;           // 'https://crm.algowix.com'
  contractApiPath: string;   // '/api/platform' (default)
  category: string;          // 'Sales', 'Operations', 'HR'
  logoUrl: string;
  isActive: boolean;
  plans: ProductPlan[];      // Pricing plans
}
```

### Product Discovery

```
GET /api/v1/products
→ Returns all active products with their plans

GET /api/v1/products/:slug
→ Returns product detail + organization's subscription status

GET /api/v1/products/:slug/plans
→ Returns available pricing plans
```

---

## 3. Product Contract API (Required)

Every AlgoWix product MUST implement these endpoints. Failure to implement them will prevent integration with the platform.

### 3.1 Health Check

```
GET {product.baseUrl}/api/platform/health
Authorization: Platform-Internal-Key {secret}

Response 200:
{
  "status": "ok" | "degraded" | "down",
  "version": "1.5.2",
  "uptime": 86400,
  "checks": {
    "database": "ok",
    "cache": "ok"
  }
}
```

### 3.2 Tenant Provisioning

```
POST {product.baseUrl}/api/platform/provision
Authorization: Platform-Internal-Key {secret}

Request:
{
  "tenantId": "org-uuid",
  "organizationName": "Acme Corp",
  "organizationSlug": "acme-corp",
  "plan": "professional",
  "planLimits": { "contacts": 50000, "seats": 25 },
  "adminUser": { "userId": "...", "email": "...", "firstName": "..." },
  "timezone": "Asia/Kolkata",
  "currency": "INR"
}

Response 200:
{
  "success": true,
  "tenantId": "acme-corp",
  "tenantUrl": "https://crm.algowix.com"
}
```

### 3.3 Tenant Suspension

```
POST {product.baseUrl}/api/platform/suspend
Body: { "tenantId": "org-uuid", "reason": "PAYMENT_FAILED" }

Product action: Put tenant in read-only mode immediately
Response: { "success": true }
```

### 3.4 Tenant Deprovisioning

```
POST {product.baseUrl}/api/platform/deprovision
Body: { "tenantId": "org-uuid", "reason": "CANCELLED" }

Product action: Delete all tenant data irreversibly
Response: { "success": true, "dataDeletedAt": "ISO timestamp" }
```

### 3.5 Usage Metrics

```
GET {product.baseUrl}/api/platform/usage?tenantId={orgId}
Authorization: Platform-Internal-Key {secret}

Response:
{
  "tenantId": "org-uuid",
  "metrics": {
    "activeUsers": 12,
    "totalContacts": 4521,
    "storageUsedMb": 245,
    "apiCallsThisMonth": 12500
  },
  "limits": {
    "maxSeats": 25,
    "maxContacts": 50000,
    "storageLimitMb": 10240
  },
  "reportedAt": "2025-01-01T10:00:00Z"
}
```

### 3.6 License Validation

```
GET {product.baseUrl}/api/platform/license?tenantId={orgId}
Authorization: Platform-Internal-Key {secret}

Response:
{
  "tenantId": "org-uuid",
  "plan": "professional",
  "status": "active",
  "validUntil": "2025-12-31T23:59:59Z",
  "features": ["automation", "api_access", "custom_fields"]
}
```

### 3.7 User Sync

```
POST {product.baseUrl}/api/platform/users/sync
Body: {
  "tenantId": "org-uuid",
  "users": [
    {
      "userId": "platform-user-uuid",
      "email": "user@acme.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "ADMIN",
      "status": "ACTIVE"
    }
  ]
}
```

---

## 4. Platform → Product Communication

### Authentication for Internal Calls

Platform-to-product calls use a **shared secret** (not JWT) for server-to-server authentication:

```
Header: Platform-Internal-Key: {HMAC_SHA256_signature}

Signature = HMAC-SHA256(requestBody + timestamp, sharedSecret)
Product validates signature + timestamp (reject if > 5 min old)
```

Shared secrets stored in Azure Key Vault, rotated quarterly.

### Polling Schedule

| Endpoint | Frequency | Purpose |
|---|---|---|
| /health | Every 1 minute | Uptime monitoring |
| /usage | Every 5 minutes | Usage tracking |
| /license | On subscription change | License sync |
| /users/sync | On user role change | Permission sync |

---

## 5. Product → Platform Communication

Products communicate back to the platform via:

### 5.1 Notification Push

```
POST https://app.algowix.com/api/internal/notifications
Authorization: Platform-Internal-Key {secret}
Body: {
  "organizationId": "...",
  "userId": "...",
  "type": "deal.closed",
  "title": "Deal Won: $50,000 contract",
  "body": "John Doe closed the Acme contract",
  "actionUrl": "https://crm.algowix.com/deals/123",
  "metadata": { "dealId": "123", "amount": 50000 }
}
```

### 5.2 Audit Event Push

```
POST https://app.algowix.com/api/internal/audit
Authorization: Platform-Internal-Key {secret}
Body: {
  "organizationId": "...",
  "actorId": "user-uuid",
  "action": "crm.contact.deleted",
  "resource": "Contact",
  "resourceId": "contact-uuid",
  "before": { "name": "John Doe" },
  "after": null,
  "ipAddress": "...",
  "metadata": { "source": "crm" }
}
```

---

## 6. Product Health Monitoring

The platform monitors all products and surfaces status in the System Status page:

```typescript
// Background job: runs every minute
async function syncProductHealth() {
  const products = await productRepository.findAllActive();
  
  for (const product of products) {
    try {
      const response = await fetch(`${product.baseUrl}/api/platform/health`, {
        headers: { 'Platform-Internal-Key': generateInternalKey(product.id) },
        timeout: 5000
      });
      
      const health = await response.json();
      await productRepository.updateHealth(product.id, {
        status: health.status,
        lastCheckedAt: new Date(),
        lastSuccessAt: new Date(),
        consecutiveFailures: 0
      });
    } catch (error) {
      await productRepository.incrementFailureCount(product.id);
      
      if (product.consecutiveFailures >= 3) {
        await alertingService.sendAlert('product.health.down', { product });
      }
    }
  }
}
```

---

## 7. Platform SDK for Products

A lightweight Node.js SDK to help product teams integrate faster:

```typescript
// packages/sdk/src/index.ts
// npm install @algowix/platform-sdk

import { AlgoWixSDK } from '@algowix/platform-sdk';

const sdk = new AlgoWixSDK({
  productSlug: 'crm',
  internalSecret: process.env.PLATFORM_INTERNAL_SECRET,
  platformUrl: 'https://app.algowix.com',
});

// Verify a product launch token
const identity = await sdk.verifyLaunchToken(req.query.token);
// Returns: { userId, organizationId, tenantId, permissions, user: {...} }

// Push a notification to the platform
await sdk.pushNotification({
  organizationId: '...',
  userId: '...',
  type: 'deal.won',
  title: 'New Deal Won',
  body: 'You closed a $10K deal',
  actionUrl: 'https://crm.algowix.com/deals/123'
});

// Report usage
await sdk.reportUsage({
  organizationId: '...',
  metrics: { activeUsers: 5, totalContacts: 1200 }
});
```

---

## 8. Product Onboarding Checklist

Before a product can be listed on the platform, it must pass this checklist:

```
Contract API:
□ /api/platform/health → implemented
□ /api/platform/provision → implemented + idempotent
□ /api/platform/suspend → implemented
□ /api/platform/deprovision → implemented + irreversible
□ /api/platform/usage → implemented
□ /api/platform/license → implemented
□ /auth/platform → SSO token validation implemented
□ /.well-known/jwks.json public key fetch tested

Security:
□ Internal key validation on all contract endpoints
□ Token replay protection (jti checked in Redis)
□ Tenant isolation verified (cannot access another org's data)
□ HTTPS enforced

Operations:
□ /health endpoint returns correct format
□ Product team's on-call contacts registered
□ Incident escalation path documented
□ Rollback procedure documented
```

---

## 9. CRM Integration Example

### Complete Token Validation in CRM (Express.js)

```typescript
// crm/src/middleware/platform-auth.ts
import { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const PLATFORM_JWKS_URL = 'https://app.algowix.com/.well-known/jwks.json';
const jwks = createRemoteJWKSet(new URL(PLATFORM_JWKS_URL));

export async function validatePlatformToken(req: Request, res: Response, next: NextFunction) {
  const token = req.query.token as string;
  if (!token) return res.redirect('/login');

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: 'https://app.algowix.com',
      audience: 'crm.algowix.com',
    });

    // Check one-time use
    const used = await redis.exists(`jti:${payload.jti}`);
    if (used) return res.status(401).json({ error: 'Token already used' });
    await redis.setex(`jti:${payload.jti}`, 600, '1'); // mark used, 10 min TTL

    // Create CRM session from platform identity
    req.session.userId = payload.userId as string;
    req.session.organizationId = payload.organizationId as string;
    req.session.tenantId = payload.tenantId as string;

    res.redirect('/dashboard');
  } catch (error) {
    res.redirect(`https://app.algowix.com/products/crm?error=invalid_token`);
  }
}
```

---

*Next: [10-API-Gateway.md — API Gateway Architecture, Rate Limiting, Developer API Design]*

---
**Document Control**  
Owner: Platform Architect + Product Engineering Leads
