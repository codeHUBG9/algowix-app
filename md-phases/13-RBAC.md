# AlgoWix Platform — 13 RBAC (Role-Based Access Control)

**Document Version:** 1.0.0  
**Status:** Approved

---

## 1. RBAC Overview

AlgoWix Platform implements **Organization-Scoped RBAC** with:
- **System Roles** (predefined, not modifiable)
- **Custom Roles** (organization-specific)
- **Permission-based** authorization (not just role-based)
- **Product-level access control**
- **Resource + Action + Scope** permission model

---

## 2. Permission Model

### Permission Structure

```
Resource.Action.Scope

Examples:
  organization.read.own
  organization.update.own
  users.invite.org
  users.remove.org
  billing.read.org
  billing.manage.org
  subscriptions.manage.org
  audit_logs.read.org
  api_keys.manage.org
  roles.create.org
  roles.assign.org
```

### Scope Types

| Scope | Meaning |
|---|---|
| `own` | Can only affect own record |
| `org` | Can affect all records in their organization |
| `global` | Platform-wide (AlgoWix staff only) |

---

## 3. System Roles

System roles are seeded at platform initialization and cannot be modified by organizations:

```typescript
const SYSTEM_ROLES = [
  {
    name: 'Owner',
    description: 'Full control over the organization. Cannot be removed.',
    permissions: ['*'],    // All permissions
    isSystem: true,
  },
  {
    name: 'Admin',
    description: 'Full admin access except billing ownership transfer.',
    permissions: [
      'organization.read.org', 'organization.update.org',
      'users.*', 'roles.*', 'subscriptions.read.org',
      'billing.read.org', 'audit_logs.read.org', 'api_keys.manage.org'
    ],
    isSystem: true,
  },
  {
    name: 'Billing Manager',
    description: 'Can manage billing and subscriptions.',
    permissions: ['billing.*', 'subscriptions.*', 'organization.read.org'],
    isSystem: true,
  },
  {
    name: 'Member',
    description: 'Standard member. Can view org info and use products.',
    permissions: ['organization.read.org', 'profile.manage.own'],
    isSystem: true,
    isDefault: true,
  },
  {
    name: 'Viewer',
    description: 'Read-only access across the platform.',
    permissions: ['organization.read.org', 'users.read.org'],
    isSystem: true,
  },
];
```

---

## 4. Custom Roles

Organizations on Growth+ plans can create custom roles:

```typescript
// POST /api/v1/roles
interface CreateRoleDto {
  name: string;
  description?: string;
  permissionIds: string[];     // Permission IDs from the permissions catalog
  productAccess: string[];     // Product slugs this role can access
}
```

### Role Constraints

- Custom role name must be unique within the organization
- Cannot have more permissions than the creator's own role
- Cannot assign `global` scope permissions
- Owner role cannot be modified or deleted

---

## 5. Product-Level Access Control

Product access is controlled at two levels:

**Level 1 — Platform Level:** Can this user access the product at all?
```typescript
// Stored in RoleProductAccess table
// Admin assigns: "Members can access CRM, but not Payroll"
```

**Level 2 — Product Level:** What can this user do within the product?
```typescript
// Passed in product launch token:
productPermissions: ['contacts.read', 'deals.manage', 'reports.read']
// Each product defines its own permission set
// Platform passes permissions from role definition
```

---

## 6. Permission Check Implementation

### Middleware

```typescript
// middleware/check-permission.ts
export function requirePermission(permission: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { userId, organizationId, permissions } = req.auth;
    
    // Check cache first
    const cacheKey = `permissions:${userId}:${organizationId}`;
    let userPermissions = await cache.get(cacheKey);
    
    if (!userPermissions) {
      userPermissions = await rbacService.getUserPermissions(userId, organizationId);
      await cache.set(cacheKey, userPermissions, 300); // 5 min cache
    }
    
    // Check wildcard or exact match
    const hasPermission = userPermissions.includes('*') || 
                          userPermissions.includes(permission) ||
                          userPermissions.includes(permission.replace('.org', '.*'));
    
    if (!hasPermission) {
      return next(new ForbiddenError(`Missing permission: ${permission}`));
    }
    
    next();
  };
}

// Usage in router:
router.post('/organizations/:id/invite',
  authenticate,
  requirePermission('users.invite.org'),
  inviteController.sendInvite
);
```

---

## 7. RBAC API Reference

```
GET    /api/v1/roles              → List org roles (system + custom)
POST   /api/v1/roles              → Create custom role
GET    /api/v1/roles/:id          → Get role details + permissions
PUT    /api/v1/roles/:id          → Update custom role
DELETE /api/v1/roles/:id          → Delete custom role (reassign users first)

GET    /api/v1/permissions        → List all available permissions
GET    /api/v1/permissions/catalog → Grouped permissions catalog for UI

PATCH  /api/v1/organizations/:id/members/:userId/role
Body: { roleId }
→ Change user's role (requires roles.assign.org permission)
```

---

## 8. UI: Permissions Assignment Interface

The permissions assignment UI shows permissions grouped by category:

```
Organization Management:
  ☑ View organization details
  ☑ Edit organization settings
  ☐ Delete organization

User Management:
  ☑ View all users
  ☑ Invite users
  ☐ Remove users
  ☐ Suspend users
  ☐ Manage roles

Billing:
  ☑ View invoices
  ☐ Manage payment methods
  ☐ Change subscription

Products:
  ☑ CRM — Access
  ☑ Inventory — Access
  ☐ HRMS — Access
```

---

*Next: [14-Notifications.md — Notification System, Email, In-App, Push]*

---
**Document Control**  
Owner: Platform Architect + Security Lead
