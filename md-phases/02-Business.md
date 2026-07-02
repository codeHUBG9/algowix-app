# AlgoWix Platform — 02 Business Model & Market Strategy

**Document Version:** 1.0.0  
**Status:** Approved  
**Classification:** Internal — Confidential

---

## Table of Contents

1. [Business Model Overview](#1-business-model-overview)
2. [Revenue Streams](#2-revenue-streams)
3. [Pricing Architecture](#3-pricing-architecture)
4. [Subscription Tiers](#4-subscription-tiers)
5. [Trial & Freemium Strategy](#5-trial--freemium-strategy)
6. [Billing Cycles & Payment Strategy](#6-billing-cycles--payment-strategy)
7. [Marketplace Revenue Model](#7-marketplace-revenue-model)
8. [Enterprise Sales Model](#8-enterprise-sales-model)
9. [Partner & Reseller Model](#9-partner--reseller-model)
10. [Customer Segments](#10-customer-segments)
11. [Competitive Analysis](#11-competitive-analysis)
12. [Unit Economics](#12-unit-economics)
13. [Financial Projections (Platform Layer)](#13-financial-projections-platform-layer)

---

## 1. Business Model Overview

AlgoWix operates a **Multi-Product SaaS Platform** business model. The platform layer (`app.algowix.com`) is the connective tissue that makes the multi-product business viable.

### Model Type: SaaS Platform + Marketplace

```
Revenue Layer 1: Per-Seat Subscription (Products)
Revenue Layer 2: Platform Access Fee (Enterprise)
Revenue Layer 3: Marketplace Transaction Fees
Revenue Layer 4: Professional Services & Implementation
Revenue Layer 5: Partner / Reseller Commission
```

### Why the Platform Drives Revenue Indirectly

The platform itself may not charge separately for small organizations — but it is the mechanism that:
- Reduces churn (sticky ecosystem effect)
- Enables upsells (cross-sell other products from one dashboard)
- Enables enterprise contracts (enterprises require SSO, RBAC, audit logs — all platform features)
- Enables the marketplace (new revenue stream not possible without the platform)

---

## 2. Revenue Streams

### Stream 1: Product Subscriptions
Each AlgoWix product (CRM, Inventory, HRMS) has its own subscription plan. The platform manages the subscription lifecycle — trial, activation, renewal, cancellation, dunning.

### Stream 2: Platform Enterprise License
Enterprises with 100+ users or compliance requirements (SAML SSO, advanced audit logs, SLA guarantees) pay a platform license fee on top of product subscriptions.

### Stream 3: Marketplace Fees
Third-party developers list integrations in the AlgoWix Marketplace. AlgoWix takes a 20-30% revenue share on every paid marketplace listing transaction.

### Stream 4: Professional Services
Onboarding, data migration, custom integration development billed hourly or as fixed-price projects.

### Stream 5: AlgoWix Partner Program
Resellers and implementation partners earn commission on customer revenue they bring. The platform tracks attribution for commission calculations.

---

## 3. Pricing Architecture

### 3.1 Pricing Dimensions

| Dimension | Used For |
|---|---|
| Per Seat (User) | CRM, HRMS, Payroll |
| Per Transaction | Billing, Payroll runs |
| Per Record Volume | Inventory (SKU count), CRM (contact count) |
| Per Storage (GB) | File Manager, Document uploads |
| Per API Call | Developer / Marketplace tier |
| Flat Organization Fee | Small business base fee |

### 3.2 Pricing Philosophy

- **Simple for SMB:** Flat monthly fee per product, no complexity
- **Flexible for Mid-Market:** Seat-based with volume discounts
- **Custom for Enterprise:** Negotiated annual contract with SLA

---

## 4. Subscription Tiers

### 4.1 Platform Tiers (Organization-Level)

| Tier | Target | Platform Features | Price |
|---|---|---|---|
| **Starter** | 1–10 users | SSO, 2 products, basic RBAC | Free (included with any product) |
| **Growth** | 11–50 users | SSO, unlimited products, advanced RBAC, audit logs | ₹2,999/month or $35/month |
| **Business** | 51–200 users | All Growth + SAML SSO, priority support, SLA | ₹7,999/month or $99/month |
| **Enterprise** | 200+ users | All Business + white-glove, custom SLA, dedicated instance option | Custom |

### 4.2 Product Tiers (Per Product, Per Seat)

#### CRM Pricing Example

| Tier | Features | Price per Seat |
|---|---|---|
| Free | 2 users, 1,000 contacts | ₹0 |
| Professional | Unlimited users, 50K contacts, automation | ₹799/user/month |
| Enterprise | Custom contacts, AI, API | ₹1,499/user/month |

#### Inventory Pricing Example

| Tier | Features | Price |
|---|---|---|
| Starter | 500 SKUs, 1 warehouse | ₹1,499/month |
| Professional | Unlimited SKUs, multi-warehouse | ₹3,999/month |
| Enterprise | Custom | Custom |

---

## 5. Trial & Freemium Strategy

### 5.1 Trial Model

- Every new organization gets a **14-day free trial** of any product
- Trial requires no credit card for Starter tier
- Credit card required for Business/Enterprise trial activation
- Trial expiry sends 7-day, 3-day, and 1-day warning emails (automated via platform notification service)
- On expiry: product access suspended, data retained for 30 days

### 5.2 Freemium Limits

The Starter tier exists permanently (not just trial) to:
- Reduce barrier to entry for micro-businesses
- Create a pipeline of users who upgrade as they grow
- Allow evaluation for enterprise procurement

### 5.3 Trial to Paid Conversion Goals

| Channel | Target Conversion | Timeline |
|---|---|---|
| Self-service web signup | 20% | Within 30 days |
| Sales-assisted trial | 50% | Within 21 days |
| Partner-referred trial | 40% | Within 30 days |

---

## 6. Billing Cycles & Payment Strategy

### 6.1 Billing Cycles

- **Monthly Billing:** Default for Starter and Growth
- **Annual Billing:** 20% discount for Business and Enterprise
- **Anniversary Billing:** Charge date = organization creation date (not calendar month)

### 6.2 Payment Methods

| Method | Supported | Gateway |
|---|---|---|
| Credit / Debit Card | Yes | Razorpay (India), Stripe (International) |
| UPI | Yes | Razorpay |
| Net Banking | Yes | Razorpay |
| Wire Transfer / Bank Transfer | Enterprise only | Manual processing |
| Invoice-Based (NET 30) | Enterprise only | Manual + automated reminder |

### 6.3 Dunning Management

When payment fails, the platform automatically:

```
Day 0  → Payment fails → Customer notification email
Day 3  → Retry payment → Email reminder
Day 7  → Retry payment → Email + in-app banner warning
Day 14 → Retry payment → Email + product access limited (read-only)
Day 21 → Final retry   → Email + account suspension warning
Day 30 → Suspend access → Data retained 60 days
Day 90 → Data purge notice → 30-day final warning before deletion
```

### 6.4 Proration

When a customer upgrades mid-cycle:
- Credit remaining days on current plan
- Charge prorated amount for new plan for remaining days
- New plan effective immediately

### 6.5 Tax Handling

- GST (India): Automatically applied for Indian customers (18% GST)
- VAT (EU): VAT-inclusive pricing with reverse charge for B2B
- Tax registration numbers stored per organization
- GST invoice generation automated

---

## 7. Marketplace Revenue Model

### 7.1 Marketplace Model Types

| Listing Type | Revenue Share | Settlement |
|---|---|---|
| Free Integration | 0% | N/A |
| Paid Integration (Flat) | 30% to AlgoWix | Monthly |
| Paid Integration (Subscription) | 20% to AlgoWix | Monthly |
| AlgoWix-Built Integration | 100% to AlgoWix | N/A |

### 7.2 Marketplace Payout Rules

- Developer earnings paid monthly on NET 30 basis
- Minimum payout threshold: ₹1,000 or $25
- Platform deducts processing fees before calculating revenue share
- Refunds within 7 days are fully reversed from developer earnings

---

## 8. Enterprise Sales Model

### 8.1 Enterprise Definition

An organization qualifies for enterprise treatment if ANY of the following:
- 100+ licensed users
- Requires SAML 2.0 SSO
- Requires dedicated infrastructure
- Requires custom SLA (< 4 hour response time)
- Requires custom data residency (on-premise or specific region)
- Annual contract value (ACV) > ₹5,00,000 or $6,000

### 8.2 Enterprise Sales Process

```
1. Enterprise Lead Captured → CRM tagged as "Enterprise"
2. Solutions Engineer assigned
3. Discovery call → understand tech stack, security requirements
4. Platform demo + custom proposal
5. Security questionnaire response (SOC 2, VAPT reports)
6. Procurement / Legal review
7. Contract signed (DocuSign)
8. Implementation kickoff
9. Customer Success Manager assigned
10. Quarterly business reviews
```

### 8.3 Enterprise Contract Components

- Master Service Agreement (MSA)
- Data Processing Agreement (DPA) — GDPR compliant
- Service Level Agreement (SLA) with credits
- Statement of Work (SOW) for implementation
- Security Addendum

---

## 9. Partner & Reseller Model

### 9.1 Partner Tiers

| Tier | ACV Threshold | Commission | Benefits |
|---|---|---|---|
| Registered | ₹0 | 10% | Partner portal access |
| Silver | ₹5L+ annual | 15% | Co-marketing, leads |
| Gold | ₹20L+ annual | 20% | Dedicated partner manager |
| Platinum | ₹50L+ annual | 25% | Custom support SLA |

### 9.2 Partner Attribution

- Partners register opportunities in the Partner Portal (platform module)
- Deal registration gives 90-day exclusivity
- Platform tracks revenue attributable to each partner
- Commission auto-calculated from billing data

---

## 10. Customer Segments

### Segment 1: Small Business (1–10 employees)
- Use case: Single product (usually CRM)
- Pain: Simple, affordable, easy setup
- Platform role: Self-service onboarding, no hand-holding needed
- Value metric: Number of deals closed, contacts managed

### Segment 2: Growing Business (11–100 employees)
- Use case: CRM + Inventory or CRM + HRMS
- Pain: Managing multiple tools, team access control
- Platform role: Multi-product SSO, team management, consolidated billing
- Value metric: Time saved on cross-tool administration

### Segment 3: Mid-Market (101–500 employees)
- Use case: 3+ products, compliance requirements, multiple branches
- Pain: Audit trails, RBAC, integration with existing tools
- Platform role: Full platform suite including SAML, audit logs, API access
- Value metric: Compliance readiness, operational efficiency

### Segment 4: Enterprise (500+ employees)
- Use case: Full suite, white-glove implementation
- Pain: Data residency, SSO with existing IdP (Okta, Azure AD)
- Platform role: Enterprise SSO, dedicated CSM, SLA
- Value metric: Risk reduction, IT consolidation

---

## 11. Competitive Analysis

| Feature | AlgoWix Platform | Zoho One | HubSpot Suite | Salesforce |
|---|---|---|---|---|
| Multi-product SSO | ✅ | ✅ | ✅ | ✅ |
| Centralized Billing | ✅ | ✅ | Partial | ✅ |
| Product Marketplace | Planned | ✅ | ✅ | ✅ |
| India-first Pricing | ✅ | ✅ | ❌ | ❌ |
| HRMS + CRM + Inventory Combined | ✅ | ✅ | ❌ | Partial |
| Open API | ✅ | Partial | ✅ | ✅ |
| Offline/Mobile App | Planned | ✅ | ✅ | ✅ |
| SMB Friendly Onboarding | ✅ | Partial | ✅ | ❌ |
| White-Label Option | Planned | ❌ | ❌ | ❌ |

### AlgoWix Differentiation

1. **India-First:** Built for Indian GST, UPI, regional compliance — competitors are India-adapted, not India-native
2. **Transparent Pricing:** No per-module micro-billing complexity
3. **Open Standards:** Standard OAuth 2.0, OIDC, webhooks — no proprietary lock-in
4. **Modern Stack:** Next.js + Node.js + MSSQL — modern, fast, developer-friendly

---

## 12. Unit Economics

### 12.1 Key Metrics Definitions

| Metric | Formula |
|---|---|
| MRR | Sum of all active monthly subscription revenue |
| ARR | MRR × 12 |
| CAC (Customer Acquisition Cost) | Total Sales + Marketing Spend / New Customers |
| LTV (Lifetime Value) | ARPU × Avg Customer Lifespan |
| LTV:CAC Ratio | Must be > 3:1 to be healthy |
| Churn Rate | Customers cancelled / Total customers at start of period |
| Net Revenue Retention (NRR) | (Starting MRR + Expansions - Contractions - Churn) / Starting MRR |

### 12.2 Platform-Specific Unit Economics

| Metric | Year 1 Target | Year 2 Target |
|---|---|---|
| Organizations on Platform | 200 | 1,000 |
| Avg Products per Org | 1.3 | 2.1 |
| Avg Revenue per Org/Month | ₹2,500 | ₹4,000 |
| MRR | ₹5,00,000 | ₹40,00,000 |
| Gross Margin | 75% | 80% |
| Platform Infrastructure Cost | ₹50,000/month | ₹2,00,000/month |

---

## 13. Financial Projections (Platform Layer)

### 13.1 Headcount Cost (Platform Engineering Team)

| Role | Count | Monthly Cost |
|---|---|---|
| Platform Architect / Tech Lead | 1 | ₹1,50,000 |
| Backend Engineers (Node.js) | 3 | ₹2,70,000 |
| Frontend Engineers (Next.js) | 2 | ₹1,60,000 |
| DevOps / Infrastructure | 1 | ₹1,00,000 |
| QA Engineer | 1 | ₹70,000 |
| Product Manager | 1 | ₹1,20,000 |
| **Total Monthly** | **9** | **₹8,70,000** |

### 13.2 Infrastructure Cost (Monthly)

| Service | Cost |
|---|---|
| Azure / AWS compute (app + DB) | ₹40,000 |
| CDN (Cloudflare) | ₹5,000 |
| Email (SendGrid / SES) | ₹3,000 |
| Monitoring (Datadog / New Relic) | ₹8,000 |
| Payment processing fees (2.5% of revenue) | Variable |
| **Total Fixed** | **₹56,000** |

### 13.3 Break-Even Analysis

Break-even at platform layer = when platform MRR covers infrastructure + team cost

Target: Break-even by Month 18 assuming product subscriptions flowing through the platform.

---

*Next: [03-Platform-Architecture.md — Technical Architecture, System Components & Infrastructure Design]*

---
**Document Control**  
Owner: CPO + CFO  
Review: Quarterly
