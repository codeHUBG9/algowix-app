import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const permissions = [
  { resource: "organization", action: "read", scope: "org" },
  { resource: "organization", action: "update", scope: "org" },
  { resource: "users", action: "read", scope: "org" },
  { resource: "users", action: "invite", scope: "org" },
  { resource: "users", action: "remove", scope: "org" },
  { resource: "roles", action: "read", scope: "org" },
  { resource: "roles", action: "create", scope: "org" },
  { resource: "billing", action: "read", scope: "org" },
  { resource: "billing", action: "manage", scope: "org" },
  { resource: "subscriptions", action: "read", scope: "org" },
  { resource: "subscriptions", action: "manage", scope: "org" },
  { resource: "audit_logs", action: "read", scope: "org" },
  { resource: "api_keys", action: "manage", scope: "org" },
] as const;

const systemRoles = [
  { name: "Owner", description: "Full access to everything", isDefault: false, allPermissions: true },
  { name: "Admin", description: "Admin access except billing", isDefault: false, allPermissions: false },
  { name: "Member", description: "Standard member access", isDefault: true, allPermissions: false },
  { name: "Viewer", description: "Read-only access", isDefault: false, allPermissions: false },
  { name: "Billing Manager", description: "Billing management only", isDefault: false, allPermissions: false },
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

    if (role.name === "Owner") {
      for (const permission of permissionRecords) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: roleRecord.id, permissionId: permission.id } },
          update: {},
          create: { roleId: roleRecord.id, permissionId: permission.id },
        });
      }
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
