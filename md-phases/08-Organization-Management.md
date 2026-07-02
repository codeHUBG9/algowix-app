# AlgoWix Platform — 08 Organization Management

**Document Version:** 1.0.0  
**Status:** Approved

---

## Table of Contents

1. [Organization Model](#1-organization-model)
2. [Organization Hierarchy](#2-organization-hierarchy)
3. [Branches](#3-branches)
4. [Departments](#4-departments)
5. [Teams](#5-teams)
6. [Member Management](#6-member-management)
7. [Invitation System](#7-invitation-system)
8. [Organization Settings](#8-organization-settings)
9. [Multi-Organization Support](#9-multi-organization-support)
10. [API Reference](#10-api-reference)

---

## 1. Organization Model

An Organization is the top-level entity that owns all data in the platform. Every user belongs to at least one organization.

### Organization Profile Fields

```typescript
interface OrganizationProfile {
  // Identity
  id: string;
  slug: string;              // Unique URL-safe identifier: "acme-corp"
  name: string;              // Display name: "Acme Corporation"
  legalName?: string;        // Legal entity name for invoices
  logoUrl?: string;

  // Classification
  industry?: string;         // 'Technology', 'Manufacturing', 'Retail', ...
  size?: OrgSize;            // MICRO | SMALL | MEDIUM | LARGE | ENTERPRISE
  foundedYear?: number;

  // Contact
  website?: string;
  phone?: string;
  email: string;             // Primary contact email
  billingEmail: string;      // Invoices go here

  // Location
  address?: string;
  city?: string;
  state?: string;
  country: string;           // ISO 3166-1 alpha-2 (e.g., "IN", "US")
  pincode?: string;

  // Finance
  currency: string;          // ISO 4217 (e.g., "INR", "USD")
  taxId?: string;            // GST number, VAT number, EIN
  taxType?: string;          // "GSTIN", "VAT", "EIN"

  // Platform
  timezone: string;
  language: string;
  status: OrgStatus;
  plan: PlatformPlan;
}
```

### Slug Generation Rules

```typescript
// Auto-generated from organization name on creation
// "Acme Corporation" → "acme-corporation"
// If taken: "acme-corporation-2"
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}
```

---

## 2. Organization Hierarchy

```
Organization
├── Branches (physical/geographic units)
│   └── Branch has: name, code, address, isHeadOffice
├── Departments (functional units)
│   └── Department has: name, code, parent (hierarchical), head user
│       ├── Engineering
│       │   ├── Frontend
│       │   └── Backend
│       └── Sales
└── Teams (cross-functional groups)
    └── Team has: name, description, members with roles
```

---

## 3. Branches

A Branch represents a physical office location or geographic unit.

```typescript
// POST /api/v1/organizations/:id/branches
interface CreateBranchDto {
  name: string;              // "Mumbai Office"
  code?: string;             // "MUM-01"
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  phone?: string;
  isHeadOffice?: boolean;   // Only one branch can be head office
}
```

### Business Rules

- Maximum 1 head office per organization
- Branches can be soft-deleted (deletedAt timestamp)
- Products (HR, Attendance) reference branches for employee assignment
- Branch codes must be unique within an organization

---

## 4. Departments

Departments support unlimited hierarchical nesting.

```typescript
// POST /api/v1/organizations/:id/departments
interface CreateDepartmentDto {
  name: string;              // "Engineering"
  code?: string;             // "ENG"
  parentId?: string;         // For nested departments
  headUserId?: string;       // Department head (must be org member)
}
```

### Hierarchy Rules

- Maximum depth: 5 levels (prevents UI and performance issues)
- A department cannot be its own parent (or ancestor)
- Deleting a parent: children must be reassigned first
- Department head must be an active organization member

---

## 5. Teams

Teams are cross-functional groups that cut across departments.

```typescript
// POST /api/v1/organizations/:id/teams
interface CreateTeamDto {
  name: string;              // "Q4 Product Launch Team"
  description?: string;
  memberIds?: string[];      // Initial members
}

// Team member roles
enum TeamRole {
  LEAD = 'LEAD',
  MEMBER = 'MEMBER',
  OBSERVER = 'OBSERVER'
}
```

---

## 6. Member Management

### Member Listing with Filters

```
GET /api/v1/organizations/:id/members
Query params:
  - status: ACTIVE | INVITED | SUSPENDED
  - roleId: filter by role
  - search: search by name/email
  - page, limit: pagination
```

### Member Response Shape

```typescript
interface OrgMember {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  role: { id: string; name: string };
  status: MemberStatus;
  joinedAt: Date;
  lastLoginAt?: Date;
  productAccess: string[];   // Which products this member can access
}
```

### Suspending a Member

```
PATCH /api/v1/organizations/:id/members/:userId
Body: { status: "SUSPENDED", reason: "Employee on leave" }

Actions:
1. Update OrgMembership.status = SUSPENDED
2. Revoke all active sessions for this user in this org
3. Log to audit log
4. Optionally notify user
```

---

## 7. Invitation System

### Invite Flow

```
POST /api/v1/organizations/:id/invite
Body: { email, roleId, message? }

1. Check inviter has 'users.invite' permission
2. Check seat limit not exceeded
3. Check email not already a member or pending invite
4. Generate invite token (crypto.randomBytes(32))
5. Store invite (expires 7 days)
6. Send invite email with link:
   https://app.algowix.com/accept-invite?token=xxx
7. Return: { inviteId, email, expiresAt }
```

### Accept Invite Flow

```
GET /api/v1/invites/:token (validate token, return org info)
POST /api/v1/invites/:token/accept
Body: { password } (if user doesn't exist) OR { } (if logged in)

1. Validate token not expired, not used
2. If user exists: add to org membership
3. If new user: create account + add to membership
4. Assign specified role
5. Mark invite as accepted
6. Auto-login user
7. Redirect to platform dashboard
```

### Bulk Invite (CSV Upload)

```
POST /api/v1/organizations/:id/invite/bulk
Body: multipart/form-data with CSV file
CSV format: email, firstName, lastName, role
```

---

## 8. Organization Settings

### Settings Categories

```
GET/PUT /api/v1/organizations/:id/settings/general
  - name, timezone, language, currency, date format

GET/PUT /api/v1/organizations/:id/settings/branding
  - logo, primary color, favicon, email header

GET/PUT /api/v1/organizations/:id/settings/security
  - password policy, session timeout, allowed IPs, 2FA requirement

GET/PUT /api/v1/organizations/:id/settings/notifications
  - email notification preferences per event type
```

---

## 9. Multi-Organization Support

A single user can belong to multiple organizations (e.g., a consultant).

### Switching Organizations

```typescript
// User sees an org switcher in the top navigation
// On switch:
POST /api/v1/auth/switch-organization
Body: { organizationId }

1. Verify user is a member of the target org
2. Update session.organizationId
3. Update active JWT claims
4. Return new access token with new org context
```

### Primary Organization

- Each user has one `isPrimary` organization
- Primary org is the default on login if no org context is set
- Users can change their primary org in profile settings

---

## 10. API Reference

```
Organizations:
GET    /api/v1/organizations/:id
PUT    /api/v1/organizations/:id
DELETE /api/v1/organizations/:id

Branches:
GET    /api/v1/organizations/:id/branches
POST   /api/v1/organizations/:id/branches
PUT    /api/v1/organizations/:id/branches/:branchId
DELETE /api/v1/organizations/:id/branches/:branchId

Departments:
GET    /api/v1/organizations/:id/departments
POST   /api/v1/organizations/:id/departments
PUT    /api/v1/organizations/:id/departments/:deptId
DELETE /api/v1/organizations/:id/departments/:deptId

Teams:
GET    /api/v1/organizations/:id/teams
POST   /api/v1/organizations/:id/teams
PUT    /api/v1/organizations/:id/teams/:teamId
POST   /api/v1/organizations/:id/teams/:teamId/members
DELETE /api/v1/organizations/:id/teams/:teamId/members/:userId

Members:
GET    /api/v1/organizations/:id/members
PATCH  /api/v1/organizations/:id/members/:userId
DELETE /api/v1/organizations/:id/members/:userId
POST   /api/v1/organizations/:id/invite
DELETE /api/v1/organizations/:id/invites/:inviteId
```

---

*Next: [09-Product-Integration.md — Product Contract API, Product Registry, Integration Protocol]*

---
**Document Control**  
Owner: Platform Architect
