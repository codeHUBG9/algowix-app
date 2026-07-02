# AlgoWix Platform — 05 Database Design

**Document Version:** 1.0.0  
**Status:** Approved  
**Database:** Microsoft SQL Server 2022 (Azure SQL)  
**ORM:** Prisma

---

## Table of Contents

1. [Database Design Philosophy](#1-database-design-philosophy)
2. [Schema Organization](#2-schema-organization)
3. [Prisma Schema — Complete Definition](#3-prisma-schema--complete-definition)
4. [Table Definitions with DDL](#4-table-definitions-with-ddl)
5. [Index Strategy](#5-index-strategy)
6. [Stored Procedures](#6-stored-procedures)
7. [Data Archival Strategy](#7-data-archival-strategy)
8. [Migration Strategy](#8-migration-strategy)
9. [Seed Data](#9-seed-data)
10. [Query Optimization Patterns](#10-query-optimization-patterns)

---

## 1. Database Design Philosophy

### Principles

1. **UUIDs as Primary Keys** — All tables use UUID (`UNIQUEIDENTIFIER` in MSSQL) as PK. Avoids integer ID guessing, safe for distributed inserts.
2. **Soft Delete** — Records are never hard-deleted unless explicitly required (e.g., GDPR erasure). Use `deletedAt` timestamp.
3. **Created/Updated Timestamps** — Every table has `createdAt` and `updatedAt`.
4. **Tenant Isolation** — Every multi-tenant table has `organizationId` as a non-nullable foreign key.
5. **Audit by Default** — Changes to critical tables are captured in the audit log.
6. **No Business Logic in DB** — Stored procedures only for performance-critical read operations. Business logic lives in the service layer.
7. **Normalized but Practical** — 3NF minimum; denormalize only when query performance demands it, and document the reason.

### Naming Conventions

| Object | Convention | Example |
|---|---|---|
| Tables | PascalCase | `Organizations`, `UserProfiles` |
| Columns | PascalCase | `OrganizationId`, `CreatedAt` |
| Indexes | `IX_TableName_Column` | `IX_Users_Email` |
| Unique Indexes | `UX_TableName_Column` | `UX_Organizations_Slug` |
| Foreign Keys | `FK_Table_RefTable` | `FK_Users_Organizations` |
| Schemas | lowercase | `platform`, `billing`, `audit` |

---

## 2. Schema Organization

```sql
-- MSSQL Schemas (logical grouping)
CREATE SCHEMA platform;   -- Core identity, org, product
CREATE SCHEMA billing;    -- Billing, payments, invoices
CREATE SCHEMA audit;      -- Immutable audit trail
CREATE SCHEMA developer;  -- API keys, webhooks
CREATE SCHEMA files;      -- File management
CREATE SCHEMA reports;    -- Cached/pre-computed report data
```

---

## 3. Prisma Schema — Complete Definition

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlserver"
  url      = env("DATABASE_URL")
}

// ============================================================
// ORGANIZATIONS & STRUCTURE
// ============================================================

model Organization {
  id             String   @id @default(uuid()) @db.UniqueIdentifier
  slug           String   @unique @db.NVarChar(100)
  name           String   @db.NVarChar(255)
  logoUrl        String?  @db.NVarChar(500)
  industry       String?  @db.NVarChar(100)
  size           OrgSize?
  country        String   @db.NChar(2)
  currency       String   @db.NChar(3)    @default("INR")
  timezone       String   @db.NVarChar(50) @default("Asia/Kolkata")
  billingEmail   String   @db.NVarChar(255)
  taxId          String?  @db.NVarChar(50)
  taxType        String?  @db.NVarChar(20)    // GST, VAT, etc.
  status         OrgStatus @default(ACTIVE)
  plan           PlatformPlan @default(STARTER)
  trialEndsAt    DateTime?
  settings       Json?
  metadata       Json?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?

  // Relations
  memberships    OrgMembership[]
  branches       Branch[]
  departments    Department[]
  teams          Team[]
  subscriptions  Subscription[]
  invoices       Invoice[]
  paymentMethods PaymentMethod[]
  apiKeys        ApiKey[]
  webhooks       Webhook[]
  files          FileRecord[]
  auditLogs      AuditLog[]
  notifications  Notification[]
  samlConfig     SamlConfig?

  @@map("Organizations")
  @@schema("platform")
}

model Branch {
  id             String   @id @default(uuid()) @db.UniqueIdentifier
  organizationId String   @db.UniqueIdentifier
  name           String   @db.NVarChar(255)
  code           String?  @db.NVarChar(50)
  address        String?  @db.NVarChar(500)
  city           String?  @db.NVarChar(100)
  state          String?  @db.NVarChar(100)
  country        String?  @db.NChar(2)
  pincode        String?  @db.NVarChar(20)
  phone          String?  @db.NVarChar(20)
  isHeadOffice   Boolean  @default(false)
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?

  organization   Organization @relation(fields: [organizationId], references: [id])

  @@map("Branches")
  @@schema("platform")
}

model Department {
  id             String   @id @default(uuid()) @db.UniqueIdentifier
  organizationId String   @db.UniqueIdentifier
  name           String   @db.NVarChar(255)
  code           String?  @db.NVarChar(50)
  parentId       String?  @db.UniqueIdentifier
  headUserId     String?  @db.UniqueIdentifier
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?

  organization   Organization @relation(fields: [organizationId], references: [id])
  parent         Department?  @relation("DepartmentHierarchy", fields: [parentId], references: [id])
  children       Department[] @relation("DepartmentHierarchy")

  @@map("Departments")
  @@schema("platform")
}

model Team {
  id             String   @id @default(uuid()) @db.UniqueIdentifier
  organizationId String   @db.UniqueIdentifier
  name           String   @db.NVarChar(255)
  description    String?  @db.NVarChar(500)
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization   Organization @relation(fields: [organizationId], references: [id])
  members        TeamMember[]

  @@map("Teams")
  @@schema("platform")
}

model TeamMember {
  teamId   String   @db.UniqueIdentifier
  userId   String   @db.UniqueIdentifier
  role     String   @db.NVarChar(50) @default("MEMBER")
  joinedAt DateTime @default(now())

  team     Team @relation(fields: [teamId], references: [id])
  user     User @relation(fields: [userId], references: [id])

  @@id([teamId, userId])
  @@map("TeamMembers")
  @@schema("platform")
}

// ============================================================
// USERS & IDENTITY
// ============================================================

model User {
  id                  String    @id @default(uuid()) @db.UniqueIdentifier
  email               String    @unique @db.NVarChar(255)
  emailVerified       Boolean   @default(false)
  emailVerifiedAt     DateTime?
  passwordHash        String?   @db.NVarChar(255)
  firstName           String    @db.NVarChar(100)
  lastName            String    @db.NVarChar(100)
  displayName         String?   @db.NVarChar(200)
  avatarUrl           String?   @db.NVarChar(500)
  phone               String?   @db.NVarChar(20)
  phoneVerified       Boolean   @default(false)
  language            String    @db.NVarChar(10) @default("en")
  timezone            String    @db.NVarChar(50) @default("Asia/Kolkata")
  twoFactorEnabled    Boolean   @default(false)
  twoFactorMethod     TwoFactorMethod?
  twoFactorSecret     String?   @db.NVarChar(255)
  backupCodes         Json?
  status              UserStatus @default(ACTIVE)
  loginAttempts       Int       @default(0)
  lockedUntil         DateTime?
  lastLoginAt         DateTime?
  lastLoginIp         String?   @db.NVarChar(45)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  deletedAt           DateTime?

  memberships         OrgMembership[]
  sessions            Session[]
  oauthAccounts       OAuthAccount[]
  emailVerifications  EmailVerification[]
  passwordResets      PasswordReset[]
  teamMemberships     TeamMember[]
  notifications       Notification[]
  sentInvites         OrgInvite[] @relation("InvitedBy")

  @@map("Users")
  @@schema("platform")
}

model OrgMembership {
  id             String   @id @default(uuid()) @db.UniqueIdentifier
  userId         String   @db.UniqueIdentifier
  organizationId String   @db.UniqueIdentifier
  roleId         String   @db.UniqueIdentifier
  status         MemberStatus @default(ACTIVE)
  isPrimary      Boolean  @default(false)
  joinedAt       DateTime @default(now())
  invitedBy      String?  @db.UniqueIdentifier
  invitedAt      DateTime?
  updatedAt      DateTime @updatedAt

  user           User         @relation(fields: [userId], references: [id])
  organization   Organization @relation(fields: [organizationId], references: [id])
  role           Role         @relation(fields: [roleId], references: [id])

  @@unique([userId, organizationId])
  @@map("OrgMemberships")
  @@schema("platform")
}

model OrgInvite {
  id             String   @id @default(uuid()) @db.UniqueIdentifier
  organizationId String   @db.UniqueIdentifier
  email          String   @db.NVarChar(255)
  roleId         String   @db.UniqueIdentifier
  token          String   @unique @db.NVarChar(255)
  status         InviteStatus @default(PENDING)
  expiresAt      DateTime
  invitedById    String   @db.UniqueIdentifier
  acceptedAt     DateTime?
  createdAt      DateTime @default(now())

  invitedBy      User @relation("InvitedBy", fields: [invitedById], references: [id])

  @@map("OrgInvites")
  @@schema("platform")
}

model Session {
  id             String   @id @default(uuid()) @db.UniqueIdentifier
  userId         String   @db.UniqueIdentifier
  organizationId String?  @db.UniqueIdentifier
  token          String   @unique @db.NVarChar(500)
  refreshToken   String   @unique @db.NVarChar(500)
  userAgent      String?  @db.NVarChar(500)
  ipAddress      String?  @db.NVarChar(45)
  deviceType     String?  @db.NVarChar(50)
  deviceName     String?  @db.NVarChar(100)
  lastActiveAt   DateTime @default(now())
  expiresAt      DateTime
  revokedAt      DateTime?
  createdAt      DateTime @default(now())

  user           User @relation(fields: [userId], references: [id])

  @@map("Sessions")
  @@schema("platform")
}

model OAuthAccount {
  id             String   @id @default(uuid()) @db.UniqueIdentifier
  userId         String   @db.UniqueIdentifier
  provider       OAuthProvider
  providerUserId String   @db.NVarChar(255)
  email          String?  @db.NVarChar(255)
  accessToken    String?  @db.NVarChar(2000)
  refreshToken   String?  @db.NVarChar(2000)
  expiresAt      DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user           User @relation(fields: [userId], references: [id])

  @@unique([provider, providerUserId])
  @@map("OAuthAccounts")
  @@schema("platform")
}

model EmailVerification {
  id        String   @id @default(uuid()) @db.UniqueIdentifier
  userId    String   @db.UniqueIdentifier
  token     String   @unique @db.NVarChar(255)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  user      User @relation(fields: [userId], references: [id])

  @@map("EmailVerifications")
  @@schema("platform")
}

model PasswordReset {
  id        String   @id @default(uuid()) @db.UniqueIdentifier
  userId    String   @db.UniqueIdentifier
  token     String   @unique @db.NVarChar(255)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  user      User @relation(fields: [userId], references: [id])

  @@map("PasswordResets")
  @@schema("platform")
}

// ============================================================
// RBAC — ROLES, PERMISSIONS
// ============================================================

model Role {
  id             String   @id @default(uuid()) @db.UniqueIdentifier
  organizationId String?  @db.UniqueIdentifier  // null = system role
  name           String   @db.NVarChar(100)
  description    String?  @db.NVarChar(500)
  isSystem       Boolean  @default(false)
  isDefault      Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  memberships    OrgMembership[]
  permissions    RolePermission[]
  productAccess  RoleProductAccess[]

  @@unique([organizationId, name])
  @@map("Roles")
  @@schema("platform")
}

model Permission {
  id          String   @id @default(uuid()) @db.UniqueIdentifier
  resource    String   @db.NVarChar(100)    // 'organization', 'users', 'billing'
  action      String   @db.NVarChar(100)    // 'create', 'read', 'update', 'delete'
  scope       String   @db.NVarChar(50)     // 'own', 'org', 'global'
  description String?  @db.NVarChar(500)
  createdAt   DateTime @default(now())

  roles       RolePermission[]

  @@unique([resource, action, scope])
  @@map("Permissions")
  @@schema("platform")
}

model RolePermission {
  roleId       String @db.UniqueIdentifier
  permissionId String @db.UniqueIdentifier

  role         Role       @relation(fields: [roleId], references: [id])
  permission   Permission @relation(fields: [permissionId], references: [id])

  @@id([roleId, permissionId])
  @@map("RolePermissions")
  @@schema("platform")
}

model RoleProductAccess {
  roleId    String @db.UniqueIdentifier
  productId String @db.UniqueIdentifier

  role    Role    @relation(fields: [roleId], references: [id])
  product Product @relation(fields: [productId], references: [id])

  @@id([roleId, productId])
  @@map("RoleProductAccess")
  @@schema("platform")
}

// ============================================================
// PRODUCTS & SUBSCRIPTIONS
// ============================================================

model Product {
  id              String   @id @default(uuid()) @db.UniqueIdentifier
  slug            String   @unique @db.NVarChar(50)
  name            String   @db.NVarChar(100)
  description     String?  @db.NVarChar(1000)
  shortDescription String? @db.NVarChar(200)
  logoUrl         String?  @db.NVarChar(500)
  iconUrl         String?  @db.NVarChar(500)
  bannerUrl       String?  @db.NVarChar(500)
  baseUrl         String   @db.NVarChar(500)
  contractApiPath String   @db.NVarChar(100) @default("/api/platform")
  category        String   @db.NVarChar(100)
  tags            Json?
  isActive        Boolean  @default(true)
  isPublic        Boolean  @default(true)
  isBeta          Boolean  @default(false)
  sortOrder       Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  plans           ProductPlan[]
  subscriptions   Subscription[]
  roleAccess      RoleProductAccess[]

  @@map("Products")
  @@schema("platform")
}

model ProductPlan {
  id             String   @id @default(uuid()) @db.UniqueIdentifier
  productId      String   @db.UniqueIdentifier
  name           String   @db.NVarChar(100)
  slug           String   @db.NVarChar(100)
  description    String?  @db.NVarChar(500)
  monthlyPrice   Decimal  @db.Decimal(10, 2)
  annualPrice    Decimal? @db.Decimal(10, 2)
  currency       String   @db.NChar(3) @default("INR")
  trialDays      Int      @default(14)
  isActive       Boolean  @default(true)
  isFeatured     Boolean  @default(false)
  maxSeats       Int?
  features       Json     // array of feature strings
  limits         Json     // { contacts: 5000, storage_gb: 10 }
  metadata       Json?
  sortOrder      Int      @default(0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  product        Product       @relation(fields: [productId], references: [id])
  subscriptions  Subscription[]

  @@unique([productId, slug])
  @@map("ProductPlans")
  @@schema("platform")
}

model Subscription {
  id                  String   @id @default(uuid()) @db.UniqueIdentifier
  organizationId      String   @db.UniqueIdentifier
  productId           String   @db.UniqueIdentifier
  planId              String   @db.UniqueIdentifier
  status              SubscriptionStatus @default(TRIALING)
  seatCount           Int      @default(1)
  billingCycle        BillingCycle @default(MONTHLY)
  trialStartsAt       DateTime?
  trialEndsAt         DateTime?
  currentPeriodStart  DateTime
  currentPeriodEnd    DateTime
  cancelAtPeriodEnd   Boolean  @default(false)
  cancelledAt         DateTime?
  pausedAt            DateTime?
  pausedUntil         DateTime?
  metadata            Json?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  organization        Organization @relation(fields: [organizationId], references: [id])
  product             Product      @relation(fields: [productId], references: [id])
  plan                ProductPlan  @relation(fields: [planId], references: [id])
  usageRecords        UsageRecord[]

  @@unique([organizationId, productId])
  @@map("Subscriptions")
  @@schema("platform")
}

model UsageRecord {
  id             String   @id @default(uuid()) @db.UniqueIdentifier
  subscriptionId String   @db.UniqueIdentifier
  metric         String   @db.NVarChar(100)   // 'seats', 'contacts', 'api_calls'
  quantity       Decimal  @db.Decimal(14, 4)
  recordedAt     DateTime @default(now())

  subscription   Subscription @relation(fields: [subscriptionId], references: [id])

  @@map("UsageRecords")
  @@schema("billing")
}

// ============================================================
// BILLING
// ============================================================

model Invoice {
  id             String   @id @default(uuid()) @db.UniqueIdentifier
  organizationId String   @db.UniqueIdentifier
  invoiceNumber  String   @unique @db.NVarChar(50)
  status         InvoiceStatus @default(DRAFT)
  currency       String   @db.NChar(3)
  subtotal       Decimal  @db.Decimal(10, 2)
  taxAmount      Decimal  @db.Decimal(10, 2) @default(0)
  taxRate        Decimal  @db.Decimal(5, 2) @default(0)
  taxType        String?  @db.NVarChar(20)      // GST, VAT
  discountAmount Decimal  @db.Decimal(10, 2) @default(0)
  total          Decimal  @db.Decimal(10, 2)
  notes          String?  @db.NVarChar(2000)
  pdfUrl         String?  @db.NVarChar(500)
  dueAt          DateTime
  paidAt         DateTime?
  voidedAt       DateTime?
  periodStart    DateTime
  periodEnd      DateTime
  metadata       Json?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization   Organization @relation(fields: [organizationId], references: [id])
  lineItems      InvoiceLineItem[]
  payments       Payment[]

  @@map("Invoices")
  @@schema("billing")
}

model InvoiceLineItem {
  id          String   @id @default(uuid()) @db.UniqueIdentifier
  invoiceId   String   @db.UniqueIdentifier
  description String   @db.NVarChar(500)
  quantity    Decimal  @db.Decimal(10, 4)
  unitPrice   Decimal  @db.Decimal(10, 2)
  amount      Decimal  @db.Decimal(10, 2)
  metadata    Json?

  invoice     Invoice @relation(fields: [invoiceId], references: [id])

  @@map("InvoiceLineItems")
  @@schema("billing")
}

model Payment {
  id                  String   @id @default(uuid()) @db.UniqueIdentifier
  organizationId      String   @db.UniqueIdentifier
  invoiceId           String?  @db.UniqueIdentifier
  amount              Decimal  @db.Decimal(10, 2)
  currency            String   @db.NChar(3)
  status              PaymentStatus @default(PENDING)
  provider            PaymentProvider
  providerPaymentId   String?  @db.NVarChar(255)
  providerOrderId     String?  @db.NVarChar(255)
  paymentMethod       String?  @db.NVarChar(50)
  failureReason       String?  @db.NVarChar(500)
  refundedAmount      Decimal? @db.Decimal(10, 2)
  refundedAt          DateTime?
  metadata            Json?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  invoice             Invoice? @relation(fields: [invoiceId], references: [id])

  @@map("Payments")
  @@schema("billing")
}

model PaymentMethod {
  id             String   @id @default(uuid()) @db.UniqueIdentifier
  organizationId String   @db.UniqueIdentifier
  provider       PaymentProvider
  type           String   @db.NVarChar(50)   // 'card', 'upi', 'bank'
  last4          String?  @db.NChar(4)
  brand          String?  @db.NVarChar(50)
  expiryMonth    Int?
  expiryYear     Int?
  upiId          String?  @db.NVarChar(100)
  bankName       String?  @db.NVarChar(100)
  isDefault      Boolean  @default(false)
  providerTokenId String? @db.NVarChar(255)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization   Organization @relation(fields: [organizationId], references: [id])

  @@map("PaymentMethods")
  @@schema("billing")
}

// ============================================================
// NOTIFICATIONS
// ============================================================

model Notification {
  id             String   @id @default(uuid()) @db.UniqueIdentifier
  organizationId String   @db.UniqueIdentifier
  userId         String   @db.UniqueIdentifier
  type           String   @db.NVarChar(100)
  title          String   @db.NVarChar(255)
  body           String   @db.NVarChar(1000)
  actionUrl      String?  @db.NVarChar(500)
  isRead         Boolean  @default(false)
  readAt         DateTime?
  channel        NotificationChannel @default(IN_APP)
  metadata       Json?
  createdAt      DateTime @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id])
  user           User         @relation(fields: [userId], references: [id])

  @@map("Notifications")
  @@schema("platform")
}

// ============================================================
// AUDIT LOGS
// ============================================================

model AuditLog {
  id             String   @id @default(uuid()) @db.UniqueIdentifier
  organizationId String   @db.UniqueIdentifier
  actorId        String?  @db.UniqueIdentifier
  actorType      String   @db.NVarChar(50)  // 'user', 'api_key', 'system'
  actorEmail     String?  @db.NVarChar(255)
  action         String   @db.NVarChar(200)  // 'user.created', 'subscription.cancelled'
  resource       String   @db.NVarChar(100)  // 'User', 'Subscription'
  resourceId     String?  @db.NVarChar(255)
  ipAddress      String?  @db.NVarChar(45)
  userAgent      String?  @db.NVarChar(500)
  before         Json?    // State before change
  after          Json?    // State after change
  metadata       Json?
  severity       AuditSeverity @default(INFO)
  createdAt      DateTime @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id])

  @@map("AuditLogs")
  @@schema("audit")
}

// ============================================================
// DEVELOPER — API KEYS & WEBHOOKS
// ============================================================

model ApiKey {
  id             String   @id @default(uuid()) @db.UniqueIdentifier
  organizationId String   @db.UniqueIdentifier
  name           String   @db.NVarChar(100)
  keyHash        String   @unique @db.NVarChar(255)  // bcrypt hash of actual key
  keyPrefix      String   @db.NVarChar(10)            // e.g., "awx_"
  scopes         Json                                 // array of permission scopes
  lastUsedAt     DateTime?
  expiresAt      DateTime?
  isActive       Boolean  @default(true)
  createdById    String   @db.UniqueIdentifier
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization   Organization @relation(fields: [organizationId], references: [id])

  @@map("ApiKeys")
  @@schema("developer")
}

model Webhook {
  id             String   @id @default(uuid()) @db.UniqueIdentifier
  organizationId String   @db.UniqueIdentifier
  name           String   @db.NVarChar(100)
  url            String   @db.NVarChar(500)
  secret         String   @db.NVarChar(255)    // for HMAC signature verification
  events         Json                           // array of event types to subscribe
  isActive       Boolean  @default(true)
  lastTriggeredAt DateTime?
  failureCount   Int      @default(0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization   Organization  @relation(fields: [organizationId], references: [id])
  deliveries     WebhookDelivery[]

  @@map("Webhooks")
  @@schema("developer")
}

model WebhookDelivery {
  id           String   @id @default(uuid()) @db.UniqueIdentifier
  webhookId    String   @db.UniqueIdentifier
  eventType    String   @db.NVarChar(100)
  payload      Json
  statusCode   Int?
  response     String?  @db.NVarChar(2000)
  attempt      Int      @default(1)
  success      Boolean  @default(false)
  deliveredAt  DateTime?
  createdAt    DateTime @default(now())

  webhook      Webhook @relation(fields: [webhookId], references: [id])

  @@map("WebhookDeliveries")
  @@schema("developer")
}

// ============================================================
// FILES
// ============================================================

model FileRecord {
  id             String   @id @default(uuid()) @db.UniqueIdentifier
  organizationId String   @db.UniqueIdentifier
  uploadedById   String   @db.UniqueIdentifier
  filename       String   @db.NVarChar(255)
  originalName   String   @db.NVarChar(255)
  mimeType       String   @db.NVarChar(100)
  sizeBytes      BigInt
  blobUrl        String   @db.NVarChar(500)
  cdnUrl         String?  @db.NVarChar(500)
  folder         String?  @db.NVarChar(255)
  isPublic       Boolean  @default(false)
  metadata       Json?
  createdAt      DateTime @default(now())
  deletedAt      DateTime?

  organization   Organization @relation(fields: [organizationId], references: [id])

  @@map("Files")
  @@schema("files")
}

// ============================================================
// SAML / ENTERPRISE SSO
// ============================================================

model SamlConfig {
  id              String   @id @default(uuid()) @db.UniqueIdentifier
  organizationId  String   @unique @db.UniqueIdentifier
  entryPoint      String   @db.NVarChar(500)
  issuer          String   @db.NVarChar(500)
  cert            String   @db.NVarChar(5000)
  signatureAlgo   String   @db.NVarChar(50) @default("sha256")
  isActive        Boolean  @default(false)
  testedAt        DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  organization    Organization @relation(fields: [organizationId], references: [id])

  @@map("SamlConfigs")
  @@schema("platform")
}

// ============================================================
// ENUMS
// ============================================================

enum OrgStatus {
  ACTIVE
  SUSPENDED
  CANCELLED
  PENDING
}

enum OrgSize {
  MICRO
  SMALL
  MEDIUM
  LARGE
  ENTERPRISE
}

enum PlatformPlan {
  STARTER
  GROWTH
  BUSINESS
  ENTERPRISE
}

enum UserStatus {
  ACTIVE
  INACTIVE
  LOCKED
}

enum MemberStatus {
  ACTIVE
  INVITED
  SUSPENDED
}

enum InviteStatus {
  PENDING
  ACCEPTED
  EXPIRED
  CANCELLED
}

enum TwoFactorMethod {
  TOTP
  SMS
  EMAIL
}

enum OAuthProvider {
  GOOGLE
  MICROSOFT
  GITHUB
}

enum SubscriptionStatus {
  TRIALING
  ACTIVE
  PAST_DUE
  CANCELLED
  PAUSED
  INCOMPLETE
}

enum BillingCycle {
  MONTHLY
  ANNUAL
}

enum InvoiceStatus {
  DRAFT
  OPEN
  PAID
  VOID
  UNCOLLECTIBLE
}

enum PaymentStatus {
  PENDING
  PROCESSING
  SUCCEEDED
  FAILED
  REFUNDED
}

enum PaymentProvider {
  RAZORPAY
  STRIPE
  MANUAL
}

enum NotificationChannel {
  IN_APP
  EMAIL
  SMS
  PUSH
}

enum AuditSeverity {
  INFO
  WARNING
  CRITICAL
}
```

---

## 4. Table Definitions with DDL

### Critical Indexes (in addition to Prisma schema)

```sql
-- Users table
CREATE UNIQUE INDEX UX_Users_Email ON platform.Users(Email) WHERE DeletedAt IS NULL;
CREATE INDEX IX_Users_Status ON platform.Users(Status);
CREATE INDEX IX_Users_LastLoginAt ON platform.Users(LastLoginAt);

-- Organizations table
CREATE UNIQUE INDEX UX_Organizations_Slug ON platform.Organizations(Slug) WHERE DeletedAt IS NULL;
CREATE INDEX IX_Organizations_Status ON platform.Organizations(Status);
CREATE INDEX IX_Organizations_Plan ON platform.Organizations(Plan);

-- Sessions table
CREATE INDEX IX_Sessions_UserId ON platform.Sessions(UserId);
CREATE INDEX IX_Sessions_ExpiresAt ON platform.Sessions(ExpiresAt);
CREATE INDEX IX_Sessions_RevokedAt ON platform.Sessions(RevokedAt);

-- AuditLogs table (high-write, read for compliance)
CREATE INDEX IX_AuditLogs_OrganizationId ON audit.AuditLogs(OrganizationId);
CREATE INDEX IX_AuditLogs_ActorId ON audit.AuditLogs(ActorId);
CREATE INDEX IX_AuditLogs_CreatedAt ON audit.AuditLogs(CreatedAt);
CREATE INDEX IX_AuditLogs_Action ON audit.AuditLogs(Action);
CREATE INDEX IX_AuditLogs_Resource ON audit.AuditLogs(Resource, ResourceId);

-- Subscriptions
CREATE INDEX IX_Subscriptions_Status ON platform.Subscriptions(Status);
CREATE INDEX IX_Subscriptions_PeriodEnd ON platform.Subscriptions(CurrentPeriodEnd);

-- Notifications
CREATE INDEX IX_Notifications_UserId_IsRead ON platform.Notifications(UserId, IsRead);
CREATE INDEX IX_Notifications_CreatedAt ON platform.Notifications(CreatedAt);

-- Webhooks
CREATE INDEX IX_WebhookDeliveries_WebhookId ON developer.WebhookDeliveries(WebhookId);
CREATE INDEX IX_WebhookDeliveries_Success ON developer.WebhookDeliveries(Success);
```

---

## 5. Index Strategy

### 5.1 Index Decision Matrix

| Query Pattern | Index Type | Notes |
|---|---|---|
| Lookup by email | Unique filtered index | Filter `WHERE DeletedAt IS NULL` |
| Lookup by org ID | Non-clustered | On every tenant-scoped table |
| Range query on dates | Non-clustered | `CreatedAt`, `PeriodEnd` |
| Full-text search | Full-text index | Organization names, user names |
| Status filtering | Non-clustered | Composite with OrgId |

### 5.2 What NOT to Index

- Columns with very low cardinality (e.g., boolean flags unless queried frequently)
- Columns never used in WHERE/JOIN/ORDER BY
- NVARCHAR(MAX) / JSON columns directly (use computed columns if needed)

---

## 6. Stored Procedures

```sql
-- SP: GetOrganizationDashboard
-- Pre-aggregates dashboard data for performance
CREATE PROCEDURE platform.GetOrganizationDashboard
  @OrganizationId UNIQUEIDENTIFIER
AS
BEGIN
  SELECT
    (SELECT COUNT(*) FROM platform.OrgMemberships WHERE OrganizationId = @OrganizationId AND Status = 'ACTIVE') AS ActiveUsers,
    (SELECT COUNT(*) FROM platform.Subscriptions WHERE OrganizationId = @OrganizationId AND Status = 'ACTIVE') AS ActiveSubscriptions,
    (SELECT COALESCE(SUM(Total), 0) FROM billing.Invoices WHERE OrganizationId = @OrganizationId AND Status = 'PAID' AND CreatedAt >= DATEADD(MONTH, -1, GETUTCDATE())) AS LastMonthRevenue,
    (SELECT COUNT(*) FROM audit.AuditLogs WHERE OrganizationId = @OrganizationId AND CreatedAt >= DATEADD(DAY, -7, GETUTCDATE())) AS WeeklyAuditCount;
END;
```

---

## 7. Data Archival Strategy

### 7.1 Archival Rules

| Table | Archive After | Archive To | Delete After |
|---|---|---|---|
| AuditLogs | 1 year | Azure Blob (compressed JSON) | 7 years |
| Notifications | 90 days | Soft delete | 180 days |
| WebhookDeliveries | 30 days | Summary only | 90 days |
| Sessions (expired) | 7 days | Delete | - |
| InvoiceLineItems | Never | Keep forever | - |

---

## 8. Migration Strategy

### 8.1 Migration Rules

1. **Every migration is forward-only.** No down migrations in production.
2. **Non-destructive changes preferred.** Add column (nullable), populate, add constraint — not alter + break.
3. **Migrations run before code deploy.** Schema changes must be backwards-compatible with old code for at least 1 deploy cycle.
4. **Test migration on staging first.** Always.
5. **No data manipulation in schema migrations.** Data transforms go in separate seed/migration scripts.

### 8.2 Migration Workflow

```bash
# Create new migration
npx prisma migrate dev --name add_saml_config

# Apply to production (never use dev on production)
npx prisma migrate deploy

# Check migration status
npx prisma migrate status
```

---

## 9. Seed Data

```typescript
// prisma/seed.ts

// System Roles (seeded once)
const systemRoles = [
  { name: 'Owner', description: 'Full access to everything', isSystem: true },
  { name: 'Admin', description: 'Admin access except billing', isSystem: true },
  { name: 'Member', description: 'Standard member access', isSystem: true, isDefault: true },
  { name: 'Viewer', description: 'Read-only access', isSystem: true },
  { name: 'Billing Manager', description: 'Billing management only', isSystem: true },
];

// Core Products
const products = [
  { slug: 'crm', name: 'CRM', baseUrl: 'https://crm.algowix.com', category: 'Sales' },
  { slug: 'inventory', name: 'Inventory', baseUrl: 'https://inventory.algowix.com', category: 'Operations' },
  { slug: 'hrms', name: 'HRMS', baseUrl: 'https://hrms.algowix.com', category: 'HR', isActive: false },
];

// Platform Permissions (comprehensive)
const permissions = [
  { resource: 'organization', action: 'read', scope: 'org' },
  { resource: 'organization', action: 'update', scope: 'org' },
  { resource: 'users', action: 'read', scope: 'org' },
  { resource: 'users', action: 'invite', scope: 'org' },
  { resource: 'users', action: 'remove', scope: 'org' },
  { resource: 'roles', action: 'read', scope: 'org' },
  { resource: 'roles', action: 'create', scope: 'org' },
  { resource: 'billing', action: 'read', scope: 'org' },
  { resource: 'billing', action: 'manage', scope: 'org' },
  { resource: 'subscriptions', action: 'read', scope: 'org' },
  { resource: 'subscriptions', action: 'manage', scope: 'org' },
  { resource: 'audit_logs', action: 'read', scope: 'org' },
  { resource: 'api_keys', action: 'manage', scope: 'org' },
];
```

---

## 10. Query Optimization Patterns

### 10.1 Avoiding N+1 Queries (Prisma)

```typescript
// ❌ N+1 problem
const memberships = await prisma.orgMembership.findMany({ where: { organizationId } });
for (const m of memberships) {
  const user = await prisma.user.findUnique({ where: { id: m.userId } }); // N queries
}

// ✅ Single query with include
const memberships = await prisma.orgMembership.findMany({
  where: { organizationId },
  include: {
    user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
    role: { select: { id: true, name: true } },
  },
});
```

### 10.2 Cursor-Based Pagination

```typescript
// ✅ Cursor pagination for large datasets (audit logs, notifications)
const logs = await prisma.auditLog.findMany({
  where: { organizationId },
  take: 50,
  skip: cursor ? 1 : 0,
  cursor: cursor ? { id: cursor } : undefined,
  orderBy: { createdAt: 'desc' },
});
```

### 10.3 Select Only What You Need

```typescript
// ✅ Never select * — always project required fields
const users = await prisma.user.findMany({
  where: { ... },
  select: {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    // DO NOT include passwordHash, twoFactorSecret, etc.
  }
});
```

---

*Next: [06-Authentication.md — Auth Architecture, JWT Design, OAuth, SAML, 2FA & Session Management]*

---
**Document Control**  
Owner: Platform Architect + Database Lead  
Review: Before any schema change
