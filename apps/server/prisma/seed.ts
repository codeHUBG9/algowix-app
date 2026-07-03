import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const permissions = [
  { resource: "organization", action: "read", scope: "org" },
  { resource: "organization", action: "update", scope: "org" },
  { resource: "users", action: "read", scope: "org" },
  { resource: "users", action: "invite", scope: "org" },
  { resource: "users", action: "update", scope: "org" },
  { resource: "users", action: "remove", scope: "org" },
  { resource: "roles", action: "read", scope: "org" },
  { resource: "roles", action: "create", scope: "org" },
  { resource: "billing", action: "read", scope: "org" },
  { resource: "billing", action: "manage", scope: "org" },
  { resource: "subscriptions", action: "read", scope: "org" },
  { resource: "subscriptions", action: "manage", scope: "org" },
  { resource: "audit_logs", action: "read", scope: "org" },
  { resource: "api_keys", action: "manage", scope: "org" },
  { resource: "branches", action: "read", scope: "org" },
  { resource: "branches", action: "create", scope: "org" },
  { resource: "branches", action: "update", scope: "org" },
  { resource: "branches", action: "delete", scope: "org" },
  { resource: "departments", action: "read", scope: "org" },
  { resource: "departments", action: "create", scope: "org" },
  { resource: "departments", action: "update", scope: "org" },
  { resource: "departments", action: "delete", scope: "org" },
  { resource: "teams", action: "read", scope: "org" },
  { resource: "teams", action: "create", scope: "org" },
  { resource: "teams", action: "update", scope: "org" },
  { resource: "teams", action: "delete", scope: "org" },
  { resource: "teams", action: "manage_members", scope: "org" },
] as const;

const READ_ONLY_ORG_ACCESS = [
  "organization.read",
  "users.read",
  "roles.read",
  "branches.read",
  "departments.read",
  "teams.read",
];

const systemRoles = [
  { name: "Owner", description: "Full access to everything", isDefault: false, permissions: "all" as const },
  {
    name: "Admin",
    description: "Admin access except billing",
    isDefault: false,
    permissions: permissions
      .filter((p) => p.resource !== "billing")
      .map((p) => `${p.resource}.${p.action}`),
  },
  {
    name: "Member",
    description: "Standard member access",
    isDefault: true,
    permissions: READ_ONLY_ORG_ACCESS,
  },
  {
    name: "Viewer",
    description: "Read-only access",
    isDefault: false,
    permissions: READ_ONLY_ORG_ACCESS,
  },
  {
    name: "Billing Manager",
    description: "Billing management only",
    isDefault: false,
    permissions: ["organization.read", "billing.read", "billing.manage", "subscriptions.read", "subscriptions.manage"],
  },
];

async function main() {
  console.log("Seeding permissions...");
  const permissionRecords = await Promise.all(
    permissions.map((p) =>
      prisma.permission.upsert({
        where: { resource_action_scope: p },
        update: {},
        create: p,
      })
    )
  );

  console.log("Seeding system roles...");
  for (const role of systemRoles) {
    const existing = await prisma.role.findFirst({
      where: { name: role.name, isSystem: true, organizationId: null },
    });
    const roleRecord =
      existing ??
      (await prisma.role.create({
        data: {
          name: role.name,
          description: role.description,
          isSystem: true,
          isDefault: role.isDefault,
          organizationId: null,
        },
      }));

    const grantedPermissions =
      role.permissions === "all"
        ? permissionRecords
        : permissionRecords.filter((p) => role.permissions.includes(`${p.resource}.${p.action}`));

    for (const permission of grantedPermissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: roleRecord.id, permissionId: permission.id } },
        update: {},
        create: { roleId: roleRecord.id, permissionId: permission.id },
      });
    }
  }

  console.log("Seeding CRM product + Free plan...");
  const crm = await prisma.product.upsert({
    where: { slug: "crm" },
    update: {},
    create: {
      slug: "crm",
      name: "CRM",
      description: "Sales pipeline, contacts, and deal management",
      baseUrl: "https://crm.algowix.com",
      category: "Sales",
    },
  });

  await prisma.productPlan.upsert({
    where: { productId_slug: { productId: crm.id, slug: "free" } },
    update: {},
    create: {
      productId: crm.id,
      name: "Free",
      slug: "free",
      monthlyPrice: 0,
      trialDays: 14,
      features: JSON.stringify(["2 users", "1,000 contacts"]),
      limits: JSON.stringify({ contacts: 1000, users: 2 }),
    },
  });

  console.log("Seeding Inventory product (inactive placeholder)...");
  await prisma.product.upsert({
    where: { slug: "inventory" },
    update: {},
    create: {
      slug: "inventory",
      name: "Inventory",
      description: "Stock, SKUs, and warehouse management",
      baseUrl: "https://inventory.algowix.com",
      category: "Operations",
      isActive: false,
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
