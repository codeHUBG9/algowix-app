// 13-RBAC.md §8 — groups the live Permission table into the categories the
// permissions-assignment UI renders (§8's example groups: Organization
// Management, User Management, Billing, Products). Read from the DB rather
// than hardcoded so a newly seeded permission shows up automatically, with a
// sensible fallback category/label for anything this map hasn't named yet.
const CATEGORY_BY_RESOURCE: Record<string, string> = {
  organization: "Organization Management",
  users: "User Management",
  roles: "Roles & Permissions",
  billing: "Billing",
  subscriptions: "Subscriptions",
  audit_logs: "Audit Logs",
  api_keys: "Developer & API Keys",
  branches: "Branches",
  departments: "Departments",
  teams: "Teams",
};

const ACTION_LABELS: Record<string, string> = {
  read: "View",
  create: "Create",
  update: "Edit",
  delete: "Delete",
  remove: "Remove",
  invite: "Invite",
  manage: "Manage",
  assign: "Assign",
  manage_members: "Manage members",
};

function titleCase(resource: string): string {
  return resource
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function categoryFor(resource: string): string {
  return CATEGORY_BY_RESOURCE[resource] ?? titleCase(resource);
}

export function labelFor(resource: string, action: string): string {
  const actionLabel = ACTION_LABELS[action] ?? titleCase(action);
  return `${actionLabel} ${titleCase(resource).toLowerCase()}`;
}
