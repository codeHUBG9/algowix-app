# AlgoWix Platform — 15 Audit Logs

**Document Version:** 1.0.0  
**Status:** Approved

---

## 1. Audit Log Architecture

The Audit Log provides an **immutable, tamper-evident** record of all significant actions in the platform. It is:
- **Write-only via application code** (no update/delete via API)
- **Append-only in the database** (row-level permissions prevent modification)
- **Retained for 7 years** (compliance requirement)
- **Exportable** as CSV or JSON for compliance teams

---

## 2. What Gets Logged

### Always Logged (Automatic)

| Category | Events |
|---|---|
| Authentication | Login, logout, failed login, password reset, 2FA enable/disable |
| Organization | Create, update, delete org, branch, department, team |
| User Management | Invite, join, remove, suspend, role change |
| Billing | Subscription created/changed/cancelled, payment succeeded/failed |
| Products | Product accessed, tenant provisioned/suspended |
| API Keys | Created, revoked, used (summary) |
| Webhooks | Created, deleted, delivery failure |
| Security | Session revoked, suspicious activity, SAML configured |
| Settings | Any setting change (before/after values captured) |
| Data | Bulk export, bulk import |

### Severity Levels

```typescript
enum AuditSeverity {
  INFO = 'INFO',          // Normal operations
  WARNING = 'WARNING',    // Unusual but not harmful
  CRITICAL = 'CRITICAL',  // Security events, billing changes
}
```

---

## 3. Audit Log Entry Structure

```typescript
interface AuditLog {
  id: string;
  organizationId: string;
  
  // Who did it
  actorId?: string;          // null for system actions
  actorType: 'USER' | 'API_KEY' | 'SYSTEM' | 'PLATFORM';
  actorEmail?: string;       // Denormalized for historical accuracy
  
  // What happened
  action: string;            // 'user.role.changed', 'billing.subscription.cancelled'
  resource: string;          // 'User', 'Subscription'
  resourceId?: string;
  
  // Where from
  ipAddress?: string;
  userAgent?: string;
  
  // Data changes
  before?: Record<string, unknown>;  // State before
  after?: Record<string, unknown>;   // State after
  
  // Classification
  severity: AuditSeverity;
  metadata?: Record<string, unknown>;
  
  createdAt: Date;           // Immutable — set once on insert
}
```

---

## 4. Logging Implementation

```typescript
// services/audit.service.ts
export class AuditService {
  
  async log(entry: CreateAuditLogDto): Promise<void> {
    // Always async — never block the main request
    await this.auditRepo.create({
      ...entry,
      createdAt: new Date(),  // Server time — not client time
    });
    
    // Critical events also trigger alerts
    if (entry.severity === 'CRITICAL') {
      await this.alertingService.notifyAdmin(entry);
    }
  }
}

// Usage in service layer:
await auditService.log({
  organizationId: orgId,
  actorId: req.auth.userId,
  actorType: 'USER',
  actorEmail: req.auth.email,
  action: 'user.role.changed',
  resource: 'OrgMembership',
  resourceId: membershipId,
  before: { role: 'Member' },
  after: { role: 'Admin' },
  ipAddress: req.ip,
  severity: 'WARNING',
});
```

---

## 5. Audit Log UI

### Filters Available

```
Date range: from → to
Actor: specific user or all
Action: dropdown of action types
Resource: User, Subscription, Organization...
Severity: INFO | WARNING | CRITICAL
IP Address: filter by IP
```

### Compliance Export

```
GET /api/v1/audit/export
Query: { from, to, format: 'csv' | 'json', severity }
Response: Downloadable file (up to 100K records)
```

---

## 6. Audit Log Retention & Archival

```
0-12 months: Live in MSSQL (fast query)
12-36 months: Compressed, Azure Blob (available on request)
36-84 months: Cold storage (legal hold)
>7 years: Deleted (unless legal hold active)

GDPR Note:
User PII in audit logs is pseudonymized after 2 years:
actorEmail → "[redacted:uuid]"
ipAddress → "[redacted]"
```

---

## 7. Audit API Reference

```
GET /api/v1/audit                   → List audit logs (paginated)
GET /api/v1/audit/:id               → Get single audit entry
GET /api/v1/audit/export            → Export audit logs
GET /api/v1/audit/stats             → Summary stats (events per day, top actors)
```

Required Permission: `audit_logs.read.org`

---

*Next: [16-Files.md — File Management, Storage Architecture, Access Control]*

---
**Document Control**  
Owner: Security Lead + Compliance
