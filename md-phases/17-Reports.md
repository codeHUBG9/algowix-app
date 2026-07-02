# AlgoWix Platform — 17 Reports & Analytics

**Document Version:** 1.0.0  
**Status:** Approved

---

## 1. Reports Architecture

The platform aggregates data from all products to provide a unified view:

```
Product APIs (CRM, Inventory, HRMS)
         │ (usage metrics pulled every 5 min)
         ▼
Platform Report Aggregator
         │
         ├→ Platform Own Data (billing, users, audit)
         │
         ▼
Report Cache (Redis + Pre-computed nightly)
         │
         ▼
Report API → Dashboard (Next.js)
```

---

## 2. Platform Dashboard Reports

### 2.1 Organization Overview

```
Cards:
- Total active users
- Products subscribed
- Current month spend
- Upcoming renewal date
- Storage used
- API calls this month

Charts:
- User growth (last 12 months)
- Product usage trend (weekly)
- Spend over time (monthly)
```

### 2.2 User Activity Report

```
- Login frequency heatmap
- Most active users
- Inactive users (no login > 30 days)
- Session duration distribution
- Device type breakdown
```

### 2.3 Billing Report

```
- MRR trend
- Invoice history (last 12 months)
- Payment success rate
- Upcoming renewals (30 days)
- Product-wise cost breakdown
```

---

## 3. Report Pre-computation (Nightly Jobs)

```typescript
// jobs/report-precompute.job.ts
// Runs at 2am UTC every night

async function precomputeReports() {
  const orgs = await orgRepo.findAllActive();
  
  for (const org of orgs) {
    // User stats
    const userStats = await computeUserStats(org.id);
    await cache.set(`report:users:${org.id}`, userStats, 24 * 3600);
    
    // Billing stats
    const billingStats = await computeBillingStats(org.id);
    await cache.set(`report:billing:${org.id}`, billingStats, 24 * 3600);
    
    // Product usage (from product APIs)
    const productStats = await aggregateProductUsage(org.id);
    await cache.set(`report:products:${org.id}`, productStats, 24 * 3600);
  }
}
```

---

## 4. Reports API

```
GET /api/v1/reports/dashboard          → Platform dashboard summary
GET /api/v1/reports/users              → User activity report
GET /api/v1/reports/billing            → Billing report
GET /api/v1/reports/products           → Product usage report
GET /api/v1/reports/audit-summary      → Audit events summary
GET /api/v1/reports/export             → Export any report as CSV/XLSX

Query params: from, to, granularity (day|week|month)
```

---

## 5. Export Functionality

```typescript
// Async export for large datasets
POST /api/v1/reports/export
Body: { reportType, from, to, format: 'csv' | 'xlsx' | 'pdf' }

Response: { jobId }

GET /api/v1/reports/export/:jobId
Response: { status: 'processing' | 'ready', downloadUrl? }
```

---

*Next: [18-Integrations.md — Third-Party Integrations, Marketplace Architecture]*

---
**Document Control**  
Owner: Platform Architect
