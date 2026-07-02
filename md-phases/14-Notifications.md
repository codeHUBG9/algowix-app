# AlgoWix Platform — 14 Notifications

**Document Version:** 1.0.0  
**Status:** Approved

---

## 1. Notification Architecture

```
Event Source (platform service or product)
        │
        ▼
Notification Service
        │
   ┌────┴────────────┬──────────────┐
   ▼                 ▼              ▼
In-App           Email (Queue)   Push (future)
(Real-time via   (Async via      (Mobile PWA)
 WebSocket/SSE)   SendGrid)
```

---

## 2. Notification Types

```typescript
enum NotificationType {
  // Auth
  EMAIL_VERIFICATION = 'auth.email_verification',
  PASSWORD_RESET = 'auth.password_reset',
  SECURITY_ALERT = 'auth.security_alert',
  
  // Billing
  TRIAL_EXPIRING = 'billing.trial_expiring',
  SUBSCRIPTION_ACTIVATED = 'billing.subscription_activated',
  PAYMENT_FAILED = 'billing.payment_failed',
  INVOICE_PAID = 'billing.invoice_paid',
  
  // Team
  USER_INVITED = 'team.user_invited',
  USER_JOINED = 'team.user_joined',
  
  // Products
  PRODUCT_DOWN = 'product.health_down',
  USAGE_LIMIT_WARNING = 'product.usage_limit_warning',
}
```

---

## 3. Notification Service Implementation

```typescript
// services/notification.service.ts

export class NotificationService {
  
  async send(notification: CreateNotificationDto): Promise<void> {
    // 1. Save to database (in-app notification)
    const saved = await this.notificationRepo.create(notification);
    
    // 2. Push real-time to connected clients
    await this.pushRealtime(notification.userId, saved);
    
    // 3. Send email if preference allows
    const prefs = await this.getNotificationPreferences(notification.userId);
    if (prefs.emailEnabled && this.shouldSendEmail(notification.type, prefs)) {
      await this.emailQueue.add('send-notification-email', {
        notificationId: saved.id,
        ...notification
      });
    }
  }
  
  async pushRealtime(userId: string, notification: Notification): Promise<void> {
    // Using Server-Sent Events (SSE)
    const client = this.sseClients.get(userId);
    if (client) {
      client.write(`data: ${JSON.stringify(notification)}\n\n`);
    }
  }
}
```

---

## 4. Real-Time Delivery (SSE)

```typescript
// routes: GET /api/v1/notifications/stream
export async function notificationStream(req: AuthenticatedRequest, res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  
  const userId = req.auth.userId;
  notificationService.registerClient(userId, res);
  
  // Keep-alive heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    res.write(':heartbeat\n\n');
  }, 30000);
  
  req.on('close', () => {
    clearInterval(heartbeat);
    notificationService.unregisterClient(userId);
  });
}
```

---

## 5. Notification Preferences

```typescript
interface NotificationPreferences {
  // In-app always enabled
  email: {
    security: boolean;        // Always true, cannot be disabled
    billing: boolean;
    team: boolean;
    product: boolean;
    digest: boolean;          // Daily digest email
    digestTime: string;       // "09:00"
    digestTimezone: string;
  };
  push: {
    enabled: boolean;
    types: NotificationType[];
  };
}
```

---

## 6. Notification API

```
GET    /api/v1/notifications          → List notifications (paginated)
GET    /api/v1/notifications/unread-count  → Badge count
PATCH  /api/v1/notifications/:id/read → Mark as read
PATCH  /api/v1/notifications/read-all → Mark all as read
DELETE /api/v1/notifications/:id      → Delete notification
GET    /api/v1/notifications/stream   → SSE stream
GET    /api/v1/notifications/preferences → Get preferences
PUT    /api/v1/notifications/preferences → Update preferences
```

---

*Next: [15-Audit-Logs.md — Immutable Audit Trail, Compliance Logging]*

---
**Document Control**  
Owner: Platform Architect
