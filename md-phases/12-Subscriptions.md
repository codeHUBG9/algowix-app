# AlgoWix Platform — 12 Subscriptions

**Document Version:** 1.0.0  
**Status:** Approved

---

## 1. Subscription Lifecycle

```
Created → TRIALING → ACTIVE → PAST_DUE → SUSPENDED → CANCELLED
                 ↘             ↗
                  INCOMPLETE (payment pending)
```

### State Transitions

| From | To | Trigger |
|---|---|---|
| — | TRIALING | New subscription created |
| TRIALING | ACTIVE | First payment collected |
| TRIALING | CANCELLED | Trial ends, no payment |
| ACTIVE | PAST_DUE | Renewal payment fails |
| PAST_DUE | ACTIVE | Dunning payment succeeds |
| PAST_DUE | SUSPENDED | Dunning fails after 30 days |
| SUSPENDED | ACTIVE | Payment collected manually |
| ACTIVE | CANCELLED | Customer cancels |

---

## 2. Trial Management

### Trial Configuration

```typescript
interface TrialConfig {
  duration: number;          // Default: 14 days
  requiresCreditCard: boolean; // Default: false for Starter
  allowedFeatures: string[]; // Features available during trial
  trialEndActions: {
    gracePeriodDays: number;  // Extra days after trial before hard lock
    sendWarningDays: number[]; // [7, 3, 1] days before expiry
    defaultOnExpiry: 'SUSPEND' | 'DOWNGRADE_TO_FREE';
  };
}
```

### Trial Warning Emails

```
Day (trialEndDate - 7): "Your trial ends in 7 days"
Day (trialEndDate - 3): "Your trial ends in 3 days - upgrade now"
Day (trialEndDate - 1): "Last day of your trial"
Day (trialEndDate): "Trial ended - upgrade to continue"
Day (trialEndDate + 3): "Your data will be deleted in X days" (if no upgrade)
```

---

## 3. Feature Gating

Feature gating ensures users can only access features in their plan:

```typescript
// services/feature-gate.service.ts
export class FeatureGateService {
  
  async canAccess(
    organizationId: string,
    feature: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const subscription = await this.getActiveSubscription(organizationId);
    
    if (!subscription) {
      return { allowed: false, reason: 'NO_ACTIVE_SUBSCRIPTION' };
    }
    
    if (subscription.status === 'SUSPENDED') {
      return { allowed: false, reason: 'SUBSCRIPTION_SUSPENDED' };
    }
    
    const plan = await this.getPlan(subscription.planId);
    const hasFeature = plan.features.includes(feature);
    
    return hasFeature
      ? { allowed: true }
      : { allowed: false, reason: 'FEATURE_NOT_IN_PLAN' };
  }
  
  async checkLimit(
    organizationId: string,
    metric: string,
    currentValue: number
  ): Promise<{ withinLimit: boolean; limit: number; current: number }> {
    const subscription = await this.getActiveSubscription(organizationId);
    const plan = await this.getPlan(subscription.planId);
    const limit = plan.limits[metric];
    
    return {
      withinLimit: currentValue < limit,
      limit,
      current: currentValue
    };
  }
}
```

### Usage in Controllers

```typescript
// In API controller — check feature before action
const access = await featureGateService.canAccess(orgId, 'advanced_reporting');
if (!access.allowed) {
  throw new ForbiddenError(`FEATURE_NOT_AVAILABLE: ${access.reason}`);
}
```

---

## 4. Seat Management

```typescript
// Seat = one licensed user per product

// Check seat availability before adding user
async function addUserToProduct(orgId: string, userId: string, productSlug: string) {
  const subscription = await getSubscription(orgId, productSlug);
  const currentSeats = await getUsedSeatCount(orgId, productSlug);
  
  if (currentSeats >= subscription.seatCount) {
    throw new BusinessError('SEAT_LIMIT_REACHED', {
      current: currentSeats,
      limit: subscription.seatCount,
      upgradeUrl: '/billing/upgrade'
    });
  }
  
  await grantProductAccess(userId, orgId, productSlug);
}
```

---

## 5. Subscription API Reference

```
GET    /api/v1/subscriptions                    → List org subscriptions
POST   /api/v1/subscriptions                    → Create subscription
GET    /api/v1/subscriptions/:id                → Get subscription details
POST   /api/v1/subscriptions/:id/upgrade        → Upgrade plan
POST   /api/v1/subscriptions/:id/downgrade      → Downgrade plan
POST   /api/v1/subscriptions/:id/cancel         → Cancel subscription
POST   /api/v1/subscriptions/:id/reactivate     → Reactivate cancelled
GET    /api/v1/subscriptions/:id/usage          → Usage metrics
GET    /api/v1/subscriptions/:id/history        → Plan change history
POST   /api/v1/subscriptions/:id/seats          → Increase seats
```

---

## 6. Coupon & Discount System

```typescript
interface Coupon {
  code: string;              // "LAUNCH50"
  type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  value: number;             // 50 = 50% or ₹500
  appliesTo: 'ALL' | 'FIRST_INVOICE' | string[]; // product slugs
  maxUses: number;
  currentUses: number;
  minOrderAmount?: number;
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
}
```

---

*Next: [13-RBAC.md — Role-Based Access Control, Permissions Design]*

---
**Document Control**  
Owner: Platform Architect
