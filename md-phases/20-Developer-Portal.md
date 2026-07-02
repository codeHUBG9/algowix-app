# AlgoWix Platform — 20 Developer Portal

**Document Version:** 1.0.0  
**Status:** Approved

---

## 1. Developer Portal Overview

The Developer Portal (`developers.algowix.com`) is a first-class product for:
- External developers building integrations
- AlgoWix product engineers
- Partner/reseller technical teams
- Enterprise customers needing API automation

---

## 2. API Keys

### Key Format

```
awx_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx    (production)
awx_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx   (test environment)

Prefix: awx_
Environment: live | test
Body: 32 random alphanumeric characters (crypto.randomBytes(24).toString('base64url'))
```

### Key Management

```typescript
// POST /api/v1/developer/api-keys
interface CreateApiKeyDto {
  name: string;              // "Production Integration"
  scopes: ApiScope[];        // ['organizations:read', 'subscriptions:read']
  expiresAt?: Date;          // Optional expiry
  ipWhitelist?: string[];    // Optional IP restrictions (CIDR)
}

// Response (key shown ONCE — never again):
{
  id: "uuid",
  name: "Production Integration",
  key: "awx_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx",   // Full key — show once
  keyPrefix: "awx_live_xxxx",                    // Prefix for identification
  scopes: [...],
  createdAt: "..."
}

// Subsequent fetches return only keyPrefix — never full key
```

### API Key Scopes

```
organizations:read
organizations:write
users:read
subscriptions:read
billing:read
audit:read
webhooks:manage
reports:read
```

---

## 3. Webhook Management (Developer)

See [18-Integrations.md] for full webhook spec.

Developer Portal provides:
- Visual webhook builder
- Event subscription picker
- Test webhook delivery button
- Real-time delivery log viewer
- Retry management

---

## 4. SDK

### @algowix/platform-sdk (Node.js)

```typescript
npm install @algowix/platform-sdk

import { AlgoWixClient } from '@algowix/platform-sdk';

const client = new AlgoWixClient({
  apiKey: 'awx_live_xxx',
  environment: 'production',
});

// List organization members
const members = await client.organizations.members.list(orgId);

// Get subscription status
const subscription = await client.subscriptions.get(subscriptionId);

// List invoices
const invoices = await client.billing.invoices.list({ limit: 20 });
```

### SDK Features

- Full TypeScript types
- Automatic retry with exponential backoff
- Rate limit handling
- Webhook signature verification helpers
- Pagination helpers

---

## 5. Developer Portal Features

```
Documentation:
├── Getting Started Guide
├── Authentication Guide
├── API Reference (OpenAPI)
├── Webhook Guide
├── SDK Reference
├── Code Examples (Node.js, Python, PHP, Go)
├── Postman Collection download
└── Changelog

Self-Service:
├── API Key management
├── Webhook management
├── API usage analytics
├── Rate limit status
└── Sandbox environment

Community:
├── GitHub Issues
├── Developer Discord
└── Stack Overflow tag
```

---

## 6. Sandbox Environment

Every organization has access to a test environment:
- Same API as production, isolated data
- Test API keys prefixed `awx_test_`
- Razorpay test mode / Stripe test mode
- No real emails sent (redirected to test inbox)
- Can be reset anytime via developer portal

---

## 7. Developer API Reference

```
GET    /api/v1/developer/api-keys          → List API keys
POST   /api/v1/developer/api-keys          → Create API key
DELETE /api/v1/developer/api-keys/:id      → Revoke API key
GET    /api/v1/developer/api-keys/:id/usage  → Usage stats

GET    /api/v1/developer/rate-limits       → Current rate limit status
GET    /api/v1/developer/usage             → API call history
GET    /api/v1/developer/logs              → Request/response logs (last 7 days)
```

---

*Next: [21-Deployment.md — Deployment Strategy, Docker, CI/CD, Azure Infrastructure]*

---
**Document Control**  
Owner: Platform Architect + Developer Relations
