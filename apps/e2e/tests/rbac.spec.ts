import { test, expect } from "@playwright/test";
import {
  API_URL,
  getInviteToken,
  getPermissionId,
  getSessionOrgId,
  setOrgPlan,
  uniqueEmail,
  registerViaUi,
} from "./helpers";

async function upgradeToGrowthAndRelogin(page: import("@playwright/test").Page, email: string, password: string) {
  const orgId = await getSessionOrgId(page.request);
  await setOrgPlan(page.request, orgId, "GROWTH");

  // plan is baked into the JWT at login — sign out/in to pick up the upgrade.
  await page.click('button:has-text("Sign out")');
  await page.waitForURL("**/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard");
}

test.describe("RBAC (13-RBAC.md)", () => {
  test("system roles are seeded and listed; permission catalog is grouped", async ({ page }) => {
    await registerViaUi(page, { email: uniqueEmail("rbac-list"), organizationName: "RBAC List Org" });
    await page.goto("/dashboard/settings");
    await page.click('button:has-text("Roles")');

    for (const name of ["Owner", "Admin", "Member", "Viewer", "Billing Manager"]) {
      await expect(page.getByText(name, { exact: true })).toBeVisible();
    }
    await expect(page.getByText("System").first()).toBeVisible();

    const catalog = await page.request.get(`${API_URL}/api/v1/permissions/catalog`);
    expect(catalog.ok()).toBeTruthy();
    const body = await catalog.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.some((g: { category: string }) => g.category === "Organization Management")).toBe(true);
  });

  test("custom role creation is rejected on the default Starter plan", async ({ page }) => {
    await registerViaUi(page, { email: uniqueEmail("rbac-gate"), organizationName: "RBAC Gate Org" });
    await page.goto("/dashboard/settings");
    await page.click('button:has-text("Roles")');

    await page.click('button:has-text("Create custom role")');
    await page.fill('input[name="name"]', "Support Rep");
    await page.locator('label:has-text("View organization") input[type="checkbox"]').check();
    await page.click('button:has-text("Save role")');

    await expect(page.getByText(/growth plan/i)).toBeVisible();
  });

  test("on a Growth+ plan, a custom role can be created, edited, and deleted", async ({ page }) => {
    const email = uniqueEmail("rbac-crud");
    const password = "Passw0rd123";
    await registerViaUi(page, { email, password, organizationName: "RBAC CRUD Org" });
    await upgradeToGrowthAndRelogin(page, email, password);

    await page.goto("/dashboard/settings");
    await page.click('button:has-text("Roles")');

    await page.click('button:has-text("Create custom role")');
    await page.fill('input[name="name"]', "Support Rep");
    await page.locator('label:has-text("View organization") input[type="checkbox"]').check();
    await page.locator('label:has-text("View users") input[type="checkbox"]').check();
    await page.click('button:has-text("Save role")');

    await expect(page.getByText("Support Rep")).toBeVisible();
    await expect(page.getByText("2 permissions")).toBeVisible();

    await page.click('li:has-text("Support Rep") >> button:has-text("Edit")');
    await page.locator('label:has-text("Invite users") input[type="checkbox"]').check();
    await page.click('button:has-text("Save role")');
    await expect(page.getByText("3 permissions")).toBeVisible();

    await page.click('li:has-text("Support Rep") >> button:has-text("Delete")');
    await page.click('li:has-text("Support Rep") >> button:has-text("Confirm delete")');
    await expect(page.getByText("Support Rep")).toHaveCount(0);
  });

  test("a custom role cannot grant more permissions than its creator has", async ({ page, request }) => {
    const ownerEmail = uniqueEmail("rbac-exceed-owner");
    const ownerPassword = "Passw0rd123";
    await registerViaUi(page, { email: ownerEmail, password: ownerPassword, organizationName: "RBAC Exceed Org" });
    await upgradeToGrowthAndRelogin(page, ownerEmail, ownerPassword);

    // Invite an Admin — Admin has every permission except billing.*, the only
    // actor besides Owner that can even reach POST /roles (roles.create).
    const adminEmail = uniqueEmail("rbac-exceed-admin");
    await page.goto("/dashboard/members");
    await page.click('button:has-text("Invite member")');
    await page.fill('input[name="email"]', adminEmail);
    await page.selectOption('select[name="roleId"]', { label: "Admin" });
    await page.click('button[type="submit"]:has-text("Send invite")');
    await expect(page.getByText(adminEmail)).toBeVisible();

    const token = await getInviteToken(request, adminEmail);
    // "Sign out" only renders on /dashboard itself, not /dashboard/members.
    await page.goto("/dashboard");
    await page.click('button:has-text("Sign out")');
    await page.waitForURL("**/login");
    await page.goto(`/accept-invite?token=${token}`);
    await page.fill('input[name="firstName"]', "RBAC");
    await page.fill('input[name="lastName"]', "Admin");
    await page.fill('input[name="password"]', "Passw0rd123");
    await page.click('button[type="submit"]:has-text("Create account and join")');
    await page.waitForURL("**/dashboard");

    await page.goto("/dashboard/settings");
    await page.click('button:has-text("Roles")');
    await page.click('button:has-text("Create custom role")');
    await page.fill('input[name="name"]', "Escalated");
    await page.locator('label:has-text("View organization") input[type="checkbox"]').check();
    await page.locator('label:has-text("Manage billing") input[type="checkbox"]').check();
    await page.click('button:has-text("Save role")');

    await expect(page.getByText(/exceeds your own role/i)).toBeVisible();
  });

  test("product launch: succeeds for a subscribed product, 404s for one without an active listing", async ({ page }) => {
    await registerViaUi(page, { email: uniqueEmail("rbac-launch"), organizationName: "RBAC Launch Org" });

    // Every new org auto-subscribes to CRM's free plan (TRIALING) — 09-Product-Integration.md.
    const launchRes = await page.request.get(`${API_URL}/api/v1/products/crm/launch`);
    expect(launchRes.ok()).toBeTruthy();
    const body = await launchRes.json();
    expect(body.data.url).toContain("crm.algowix.com?token=");

    // Inventory is seeded isActive: false — not a real listing to launch.
    const inventoryRes = await page.request.get(`${API_URL}/api/v1/products/inventory/launch`);
    expect(inventoryRes.status()).toBe(404);
  });

  test("product-level access control: a role restricted to another product cannot launch outside its allow-list", async ({
    page,
    request,
  }) => {
    const ownerEmail = uniqueEmail("rbac-access-owner");
    const ownerPassword = "Passw0rd123";
    await registerViaUi(page, { email: ownerEmail, password: ownerPassword, organizationName: "RBAC Access Org" });
    await upgradeToGrowthAndRelogin(page, ownerEmail, ownerPassword);

    const orgReadId = await getPermissionId(page.request, "organization.read");

    // Restrict this role to Inventory only (excludes CRM, the org's only real
    // subscription) — proves Level 1 access control independent of subscription status.
    const createRes = await page.request.post(`${API_URL}/api/v1/roles`, {
      data: { name: "Inventory Only", permissionIds: [orgReadId], productAccess: ["inventory"] },
    });
    expect(createRes.ok()).toBeTruthy();

    const memberEmail = uniqueEmail("rbac-access-member");
    await page.goto("/dashboard/members");
    await page.click('button:has-text("Invite member")');
    await page.fill('input[name="email"]', memberEmail);
    await page.selectOption('select[name="roleId"]', { label: "Inventory Only" });
    await page.click('button[type="submit"]:has-text("Send invite")');
    await expect(page.getByText(memberEmail)).toBeVisible();

    const token = await getInviteToken(request, memberEmail);
    // "Sign out" only renders on /dashboard itself, not /dashboard/members.
    await page.goto("/dashboard");
    await page.click('button:has-text("Sign out")');
    await page.waitForURL("**/login");
    await page.goto(`/accept-invite?token=${token}`);
    await page.fill('input[name="firstName"]', "Restricted");
    await page.fill('input[name="lastName"]', "Member");
    await page.fill('input[name="password"]', "Passw0rd123");
    await page.click('button[type="submit"]:has-text("Create account and join")');
    await page.waitForURL("**/dashboard");

    const launchRes = await page.request.get(`${API_URL}/api/v1/products/crm/launch`);
    expect(launchRes.status()).toBe(403);
  });

  test("changing a member's role, and the org's only Owner can't be demoted", async ({ page, request }) => {
    const ownerEmail = uniqueEmail("rbac-rolechange-owner");
    await registerViaUi(page, { email: ownerEmail, organizationName: "RBAC Role Change Org" });

    const memberEmail = uniqueEmail("rbac-rolechange-member");
    await page.goto("/dashboard/members");
    await page.click('button:has-text("Invite member")');
    await page.fill('input[name="email"]', memberEmail);
    await page.selectOption('select[name="roleId"]', { label: "Member" });
    await page.click('button[type="submit"]:has-text("Send invite")');
    await expect(page.getByText(memberEmail)).toBeVisible();

    const token = await getInviteToken(request, memberEmail);
    const acceptRes = await request.post(`${API_URL}/api/v1/invites/${token}/accept`, {
      data: { password: "Passw0rd123", firstName: "Role", lastName: "Change" },
    });
    expect(acceptRes.ok()).toBeTruthy();

    const rolesRes = await page.request.get(`${API_URL}/api/v1/roles`);
    const roles = (await rolesRes.json()).data as { id: string; name: string }[];
    const adminRoleId = roles.find((r) => r.name === "Admin")!.id;

    await page.goto("/dashboard/members");
    await page.selectOption(`li:has-text("${memberEmail}") select`, { label: "Admin" });
    await page.reload();
    await expect(page.locator(`li:has-text("${memberEmail}") select`)).toHaveValue(adminRoleId);

    // The Owner is still the org's only Owner — changing their own role away
    // from Owner must be rejected (409), same guard as suspend/remove.
    const orgId = await getSessionOrgId(page.request);
    const selfRes = await page.request.get(`${API_URL}/api/v1/auth/me`);
    const selfUserId = (await selfRes.json()).data.auth.userId as string;

    const demoteRes = await page.request.patch(`${API_URL}/api/v1/organizations/${orgId}/members/${selfUserId}/role`, {
      data: { roleId: adminRoleId },
    });
    expect(demoteRes.status()).toBe(409);
  });
});
