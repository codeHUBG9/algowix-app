# AlgoWix Platform — 18 Integrations & Marketplace

**Document Version:** 1.0.0  
**Status:** Approved

---

## 1. Integration Categories

```
Native Integrations (built by AlgoWix):
├── Communication: Gmail, Outlook, Slack, WhatsApp Business
├── Productivity: Google Drive, OneDrive, Notion
├── Finance: Tally, Zoho Books, QuickBooks
├── Payments: Razorpay, Stripe, PayU
├── HR: LinkedIn, Naukri, Keka
└── Analytics: Google Analytics, Mixpanel

Marketplace (third-party):
├── Verified Partner Apps
├── Community Apps
└── Custom Apps (private)
```

---

## 2. Webhook System

Webhooks allow external systems to receive real-time events from AlgoWix.

### Supported Events

```typescript
const WEBHOOK_EVENTS = [
  'organization.updated',
  'user.created', 'user.updated', 'user.removed',
  'subscription.created', 'subscription.activated',
  'subscription.cancelled', 'subscription.past_due',
  'invoice.paid', 'invoice.created',
  'payment.succeeded', 'payment.failed',
];
```

### Webhook Delivery

```typescript
// Webhook payload signature
const signature = crypto
  .createHmac('sha256', webhook.secret)
  .update(JSON.stringify(payload) + timestamp)
  .digest('hex');

// Headers sent with every webhook
{
  'X-AlgoWix-Signature': `sha256=${signature}`,
  'X-AlgoWix-Timestamp': timestamp,
  'X-AlgoWix-Event': 'invoice.paid',
  'X-AlgoWix-Delivery': deliveryId,
  'Content-Type': 'application/json',
}
```

### Delivery Retry Policy

```
Attempt 1: Immediate
Attempt 2: After 5 minutes
Attempt 3: After 30 minutes
Attempt 4: After 2 hours
Attempt 5: After 12 hours
→ Mark webhook as FAILED, notify org admin
```

---

## 3. OAuth Integration Framework

Platform provides OAuth 2.0 integration for connecting external services:

```typescript
interface OAuthIntegration {
  name: string;
  provider: string;           // 'google', 'slack', 'microsoft'
  scopes: string[];           // Required OAuth scopes
  authUrl: string;
  tokenUrl: string;
  iconUrl: string;
  isAvailable: boolean;
  requiredPlan: PlatformPlan;
}

// Connect integration flow:
GET /api/v1/integrations/:provider/connect
→ Redirect to provider OAuth consent page

GET /api/v1/integrations/:provider/callback?code=xxx
→ Exchange code → store tokens → mark integration as connected

GET /api/v1/integrations
→ List available integrations + connection status
```

---

## 4. Marketplace Architecture

### Listing Types

```typescript
interface MarketplaceListing {
  id: string;
  name: string;
  description: string;
  developerName: string;
  developerEmail: string;
  type: 'FREE' | 'PAID_FLAT' | 'PAID_SUBSCRIPTION';
  price?: number;
  logoUrl: string;
  screenshots: string[];
  tags: string[];
  category: string;
  rating: number;
  reviewCount: number;
  installCount: number;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  
  // Technical
  webhookEvents: string[];    // Events it subscribes to
  requiredScopes: string[];   // Platform permissions it needs
  installUrl: string;         // Where to redirect on install
  webhookUrl: string;         // Where to send events
}
```

### App Review Process

```
Developer submits app → AlgoWix review (security, quality)
→ Testing in sandbox → Approval/Rejection → Live on Marketplace
Review SLA: 5 business days
```

---

## 5. Integration API

```
GET    /api/v1/integrations               → List available integrations
GET    /api/v1/integrations/:provider     → Integration details
POST   /api/v1/integrations/:provider/connect  → Start OAuth flow
DELETE /api/v1/integrations/:provider     → Disconnect

GET    /api/v1/webhooks                   → List webhooks
POST   /api/v1/webhooks                   → Create webhook
GET    /api/v1/webhooks/:id               → Get webhook
PUT    /api/v1/webhooks/:id               → Update webhook
DELETE /api/v1/webhooks/:id               → Delete webhook
GET    /api/v1/webhooks/:id/deliveries    → Delivery history
POST   /api/v1/webhooks/:id/test          → Send test event

GET    /api/v1/marketplace                → Browse marketplace
POST   /api/v1/marketplace/:id/install    → Install marketplace app
DELETE /api/v1/marketplace/:id/uninstall  → Uninstall app
```

---

*Next: [19-AI-Layer.md — AI Features Architecture, Recommendations, Anomaly Detection]*

---
**Document Control**  
Owner: Platform Architect
