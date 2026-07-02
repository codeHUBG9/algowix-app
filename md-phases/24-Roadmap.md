# AlgoWix Platform — 24 Roadmap & Build Plan

**Document Version:** 1.0.0  
**Status:** Approved

---

## 1. 12-Week Build Plan

### Team Structure

| Role | Count | Responsibility |
|---|---|---|
| Platform Architect / Tech Lead | 1 | Architecture, code reviews, decisions |
| Backend Engineers (Node.js) | 3 | API modules, services, DB |
| Frontend Engineers (Next.js) | 2 | Dashboard, UI, UX |
| DevOps Engineer | 1 | Infrastructure, CI/CD, monitoring |
| QA Engineer | 1 | Test strategy, automation |
| Product Manager | 1 | Requirements, acceptance criteria |

---

## 2. Week-by-Week Delivery Plan

### Weeks 1–2: Foundation (Authentication + Organizations)

**Goal:** Users can register, verify email, login, create organization, and see a basic dashboard.

```
Backend:
□ Project scaffold (monorepo, Turborepo, TypeScript config)
□ Express app setup (middleware stack, error handling, logging)
□ Prisma setup + initial schema migration
□ Auth module: register, login, logout, email verification
□ JWT service (RS256 key pair, token generation, JWKS endpoint)
□ Session management (Redis-backed)
□ Organization module: create, read, update
□ OrgMembership module: invite flow, accept invite
□ Password reset flow
□ Audit log service (logging all auth events)

Frontend:
□ Next.js scaffold with App Router
□ Authentication pages: login, register, verify-email
□ Forgot password / reset password pages
□ Platform shell layout (sidebar, topnav)
□ Dashboard page (skeleton)
□ Organization settings page (basic)

Infrastructure:
□ Azure resource group + SQL instance + Redis (dev environment)
□ Docker Compose for local development
□ Azure DevOps pipeline (CI only)
□ Environment variable management

Definition of Done: A new user can sign up, verify email, log in, and see a dashboard.
```

### Week 3: Product Registry + Navigation

```
Backend:
□ Product module: CRUD for product catalog
□ Product health check polling job
□ Product launch token generation endpoint
□ Product Contract API client (calls product /health, /usage)

Frontend:
□ Products page (catalog view with subscription status)
□ Product launch flow (redirect with token)
□ Navigation: all sidebar sections wired up (even if pages are placeholders)
□ System status page

Definition of Done: Admin can view product catalog, click "Open CRM", and be redirected with a valid token.
```

### Week 4: Subscription & Billing (Core)

```
Backend:
□ Subscription module: create, lifecycle management
□ Razorpay integration: orders, payment capture
□ Stripe integration: payment intents
□ Invoice generation (DB + PDF async)
□ GST calculation service
□ Billing webhook handlers (Razorpay + Stripe)
□ Payment method management
□ Trial management + expiry job

Frontend:
□ Billing → Plans page (product plan cards)
□ Checkout flow (Razorpay modal integration)
□ Invoice list + PDF download
□ Payment methods management
□ Subscription status display

Definition of Done: Organization can subscribe to CRM, pay via Razorpay, receive invoice PDF.
```

### Week 5: Users, Teams & RBAC

```
Backend:
□ User management module (list, update, suspend)
□ Bulk invite system (CSV)
□ Role module: system roles, custom roles
□ Permission catalog seeding
□ RBAC middleware (requirePermission decorator)
□ Team management module
□ Department + Branch modules
□ Multi-org switch endpoint

Frontend:
□ Users management page (list, invite, suspend, change role)
□ Roles management page (create custom roles)
□ Permissions assignment UI
□ Teams page
□ Organization → Branches, Departments pages
□ Org switcher in top navigation

Definition of Done: Admin can invite users, assign roles, create teams. New user can accept invite and log in.
```

### Week 6: Notifications & Audit Logs

```
Backend:
□ Notification service (in-app + email)
□ SSE (Server-Sent Events) streaming endpoint
□ Email queue (Bull + SendGrid integration)
□ All email templates (React Email)
□ Notification preferences API
□ Audit log service (all events wired up)
□ Audit log query API with filters
□ Audit log export (CSV/JSON)

Frontend:
□ Notification bell + dropdown (SSE-powered, real-time)
□ Notification preferences settings page
□ Audit logs page (filterable, paginated table)
□ Audit log export button

Definition of Done: User receives real-time notifications. Admin can view full audit trail and export it.
```

### Week 7: Settings & Security

```
Backend:
□ Organization settings module (general, branding, security policy)
□ Security policy enforcement (session timeout, IP whitelist, 2FA requirement)
□ 2FA: TOTP setup + verify
□ 2FA: Backup codes generation
□ OAuth: Google + Microsoft
□ Session listing + revocation API
□ Magic link authentication
□ Account lockout enforcement

Frontend:
□ Settings pages: General, Branding, Security, Notifications
□ Security settings: 2FA setup wizard
□ Active sessions management page
□ Security alerts display

Definition of Done: Users can enable 2FA. Admins can enforce security policies. All sessions visible and revocable.
```

### Week 8: File Manager

```
Backend:
□ File service: presigned URL generation
□ File confirmation + metadata storage
□ Storage quota tracking
□ File listing + folder management
□ Virus scan integration (ClamAV)
□ Avatar + logo upload shortcuts
□ Signed download URL generation
□ File cleanup job (orphaned files)

Frontend:
□ File manager page (list, upload, delete, download)
□ Avatar upload in user profile
□ Organization logo upload in settings

Definition of Done: Users can upload, manage, and download files. Storage quota enforced.
```

### Week 9: Reports & Dashboard

```
Backend:
□ Report aggregation service
□ Nightly pre-compute jobs (user stats, billing stats)
□ Product usage aggregation (polls product /usage APIs)
□ Reports API endpoints
□ Export endpoint (CSV/XLSX async)
□ Dashboard summary endpoint

Frontend:
□ Dashboard: real data (users, subscriptions, spend, activity)
□ Reports: User activity charts
□ Reports: Billing charts
□ Reports: Product usage charts
□ Export functionality

Definition of Done: Dashboard shows real organizational data. Reports are accurate and exportable.
```

### Week 10: Developer Portal + API Keys

```
Backend:
□ API key creation, listing, revocation
□ API key authentication middleware
□ API key scope enforcement
□ Webhook creation, management
□ Webhook delivery engine (Bull queue)
□ Webhook retry logic
□ Webhook delivery log API
□ OpenAPI spec generation
□ Rate limiting for API key users
□ Developer usage analytics

Frontend:
□ Developer → API Keys management page
□ Developer → Webhooks management page
□ Webhook delivery log viewer
□ Test webhook button

Definition of Done: Developer can create API key, register webhooks, and receive events.
```

### Week 11: Integrations + Third-Party

```
Backend:
□ OAuth integration framework (Google Drive, Slack)
□ Integration connection/disconnection flow
□ Marketplace listing API (read-only V1)
□ SAML 2.0 configuration + validation (Enterprise SSO)

Frontend:
□ Integrations page
□ Connect/disconnect OAuth integrations
□ Marketplace browsing page
□ SAML SSO configuration page (under Security settings)

Definition of Done: Organizations can connect Google/Slack. Enterprise customers can configure SAML SSO.
```

### Week 12: Testing, Hardening & Launch

```
Testing:
□ Full E2E test suite (Playwright) for all critical paths
□ Load testing (k6 or Artillery) — baseline performance under load
□ Security review: OWASP checklist
□ Penetration test (automated DAST)
□ Cross-browser testing (Chrome, Firefox, Safari, Edge)
□ Mobile responsiveness testing

Documentation:
□ API documentation complete (all endpoints documented)
□ README.md for all repositories
□ Onboarding guide for new engineers
□ Operations runbook (deployment, rollback, incident response)

Launch Preparation:
□ Production infrastructure provisioned (Terraform apply)
□ DNS cutover planned (algowix.com → app.algowix.com)
□ SSL certificates verified
□ Monitoring dashboards set up (Grafana)
□ On-call rotation scheduled
□ Rollback plan documented

Stakeholder Sign-off:
□ PM acceptance testing complete
□ CEO/stakeholder demo
□ Legal review (T&Cs, Privacy Policy, DPA)
□ Support team training

Definition of Done: app.algowix.com is live, monitoring active, team on-call.
```

---

## 3. Post-Launch: Year 1 Roadmap

### Month 4: HRMS Integration
- HRMS product built and connected via product contract
- Platform provisions HRMS tenants
- User sync between platform and HRMS

### Month 5: Advanced RBAC
- Custom permission policies
- Attribute-based access control (ABAC) for enterprise
- IP-based access restrictions

### Month 6: Mobile PWA
- Progressive Web App version of platform dashboard
- Push notifications (mobile)
- Biometric authentication

### Month 7-8: Payroll Integration
- Payroll product connected
- Cross-product payroll + HRMS data flow

### Month 9-10: Marketplace V1
- Third-party app submissions open
- 5 verified marketplace apps live
- Developer registration portal

### Month 11-12: AI Features Beta
- Smart product recommendations
- Usage anomaly detection
- Natural language dashboard queries

---

## 4. Technical Debt Register

Track known shortcuts taken during 12-week sprint for future remediation:

| Item | Risk | Sprint | Planned Resolution |
|---|---|---|---|
| No database read replica at launch | Performance | Week 1 | Month 3 |
| Webhook delivery uses Bull (not Azure Service Bus) | Scalability | Week 10 | Month 5 |
| Report pre-computation not horizontally scaled | Performance | Week 9 | Month 4 |
| No CDN for API responses at launch | Latency | Week 1 | Month 2 |
| SAML testing limited to Okta only | Compatibility | Week 11 | Month 4 |

---

## 5. Success Criteria for Launch

```
Functional:
□ All 12 modules fully functional
□ CRM integration working end-to-end (signup → subscribe → launch CRM)
□ Inventory integration working
□ Payment collection working (Razorpay)
□ Email notifications working

Non-Functional:
□ API P95 latency < 200ms under normal load
□ Frontend LCP < 2.5 seconds
□ Zero P0 bugs
□ < 5 P1 bugs (accepted with workaround)
□ 100% test coverage for auth and billing modules
□ Security scan: zero critical vulnerabilities

Operational:
□ Monitoring dashboards live
□ Alerting configured (PagerDuty or similar)
□ Runbooks written and reviewed
□ On-call team trained
□ Support team trained
□ 99.9% uptime SLA ready to commit
```

---

## 6. Definition of "Done" (Platform-Level)

A feature is "Done" when:
1. Code reviewed and merged to main branch
2. Unit tests written and passing
3. API documentation updated in OpenAPI spec
4. Audit logging implemented for all state changes
5. Error handling covers all edge cases
6. Performance verified (query time < 100ms)
7. QA tested on staging
8. PM accepted

---

*End of AlgoWix Platform Blueprint*

---

## Blueprint Index

| # | Document | Pages (approx) |
|---|---|---|
| 01 | Vision & Mission | 15 |
| 02 | Business Model | 15 |
| 03 | Platform Architecture | 20 |
| 04 | System Design | 18 |
| 05 | Database Design | 25 |
| 06 | Authentication | 20 |
| 07 | Tenant Management | 12 |
| 08 | Organization Management | 12 |
| 09 | Product Integration | 15 |
| 10 | API Gateway | 12 |
| 11 | Billing | 15 |
| 12 | Subscriptions | 10 |
| 13 | RBAC | 12 |
| 14 | Notifications | 10 |
| 15 | Audit Logs | 10 |
| 16 | File Management | 10 |
| 17 | Reports | 8 |
| 18 | Integrations & Marketplace | 10 |
| 19 | AI Layer | 8 |
| 20 | Developer Portal | 10 |
| 21 | Deployment | 18 |
| 22 | Security | 18 |
| 23 | CI/CD | 15 |
| 24 | Roadmap | 18 |
| **Total** | | **~330 pages** |

---
**Document Control**  
Owner: CTO + Platform Architect  
Version: 1.0.0  
Status: Foundation Blueprint — Living Document  
Review Cycle: Quarterly
