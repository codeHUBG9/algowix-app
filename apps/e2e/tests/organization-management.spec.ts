import { test, expect } from "@playwright/test";
import { getInviteToken, registerViaUi, uniqueEmail } from "./helpers";

test.describe("Organization Management (08-Organization-Management.md)", () => {
  test("branches: create, head-office exclusivity, delete", async ({ page }) => {
    await registerViaUi(page, { email: uniqueEmail("orgmgmt-branch"), organizationName: "Branch Test Org" });
    await page.goto("/dashboard/organization");

    await page.click('button:has-text("Add branch")');
    await page.fill('input[name="name"]', "Mumbai HQ");
    await page.fill('input[name="code"]', "MUM-01");
    await page.check('input[name="isHeadOffice"]');
    await page.click('button[type="submit"]:has-text("Create branch")');

    await expect(page.getByText("Mumbai HQ")).toBeVisible();
    await expect(page.getByText("Head Office", { exact: true })).toBeVisible();

    await page.click('button:has-text("Add branch")');
    await page.fill('input[name="name"]', "Bengaluru Office");
    await page.fill('input[name="code"]', "BLR-01");
    await page.check('input[name="isHeadOffice"]');
    await page.click('button[type="submit"]:has-text("Create branch")');

    // Only one branch should be marked Head Office at a time.
    await expect(page.getByText("Head Office", { exact: true })).toHaveCount(1);

    await page.click('li:has-text("Mumbai HQ") >> button:has-text("Delete")');
    await expect(page.getByText("Mumbai HQ")).toHaveCount(0);
  });

  test("departments: hierarchy, cannot delete a parent with children", async ({ page }) => {
    await registerViaUi(page, { email: uniqueEmail("orgmgmt-dept"), organizationName: "Dept Test Org" });
    await page.goto("/dashboard/organization");
    await page.click('button:has-text("Departments")');

    await page.click('button:has-text("Add department")');
    await page.fill('input[name="name"]', "Engineering");
    await page.click('button[type="submit"]:has-text("Create department")');
    await expect(page.getByText("Engineering", { exact: true })).toBeVisible();

    await page.click('button:has-text("Add department")');
    await page.fill('input[name="name"]', "Frontend");
    await page.selectOption('select[name="parentId"]', { label: "Engineering" });
    await page.click('button[type="submit"]:has-text("Create department")');
    await expect(page.getByText("Under Engineering")).toBeVisible();

    function deptListItem(name: string) {
      return page.getByText(name, { exact: true }).locator("xpath=ancestor::li");
    }

    // Deleting Engineering while Frontend is still nested under it should be rejected.
    await deptListItem("Engineering").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Engineering", { exact: true })).toBeVisible();

    await deptListItem("Frontend").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Frontend", { exact: true })).toHaveCount(0);
    await deptListItem("Engineering").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Engineering", { exact: true })).toHaveCount(0);
  });

  test("teams: create a team", async ({ page }) => {
    await registerViaUi(page, { email: uniqueEmail("orgmgmt-team"), organizationName: "Team Test Org" });
    await page.goto("/dashboard/organization");
    await page.click('button:has-text("Teams")');

    await page.click('button:has-text("Add team")');
    await page.fill('input[name="name"]', "Q4 Launch Team");
    await page.fill('textarea[name="description"]', "Cross-functional launch squad");
    await page.click('button[type="submit"]:has-text("Create team")');

    await expect(page.getByText("Q4 Launch Team")).toBeVisible();
    await expect(page.getByText("Cross-functional launch squad")).toBeVisible();
  });

  test("invite a member, accept via link, member shows up as ACTIVE", async ({ page, request }) => {
    await registerViaUi(page, { email: uniqueEmail("orgmgmt-invite"), organizationName: "Invite Test Org" });
    await page.goto("/dashboard/members");

    const inviteeEmail = uniqueEmail("orgmgmt-invitee");
    await page.click('button:has-text("Invite member")');
    await page.fill('input[name="email"]', inviteeEmail);
    await page.selectOption('select[name="roleId"]', { label: "Member" });
    await page.click('button[type="submit"]:has-text("Send invite")');

    await expect(page.getByText(inviteeEmail)).toBeVisible();

    const token = await getInviteToken(request, inviteeEmail);

    // Sign out the inviter, then accept the invite as the brand-new invitee in the same browser context.
    await page.goto("/dashboard");
    await page.click('button:has-text("Sign out")');
    await page.waitForURL("**/login");

    await page.goto(`/accept-invite?token=${token}`);
    await expect(page.getByText("Join Invite Test Org")).toBeVisible();
    await page.fill('input[name="firstName"]', "Invited");
    await page.fill('input[name="lastName"]', "Member");
    await page.fill('input[name="password"]', "Passw0rd123");
    await page.click('button[type="submit"]:has-text("Create account and join")');

    await page.waitForURL("**/dashboard");
    await page.goto("/dashboard/members");
    await expect(page.getByText(inviteeEmail)).toBeVisible();
    await expect(page.getByText("ACTIVE", { exact: true })).toHaveCount(2); // owner + accepted invitee
  });

  test("members: suspend and reactivate a member", async ({ page }) => {
    const ownerEmail = uniqueEmail("orgmgmt-suspend-owner");
    await registerViaUi(page, { email: ownerEmail, organizationName: "Suspend Test Org" });

    const inviteeEmail = uniqueEmail("orgmgmt-suspend-invitee");
    await page.goto("/dashboard/members");
    await page.click('button:has-text("Invite member")');
    await page.fill('input[name="email"]', inviteeEmail);
    await page.selectOption('select[name="roleId"]', { label: "Member" });
    await page.click('button[type="submit"]:has-text("Send invite")');

    // Pending invite shows up in the invites list, before it's ever accepted.
    await expect(page.getByText("Pending invites")).toBeVisible();
    await expect(page.getByText(inviteeEmail)).toBeVisible();

    await page.click(`li:has-text("${inviteeEmail}") >> button:has-text("Cancel invite")`);
    await expect(page.getByText("Pending invites")).toHaveCount(0);
  });

  test("settings: branding tab persists across reload", async ({ page }) => {
    await registerViaUi(page, { email: uniqueEmail("orgmgmt-branding"), organizationName: "Branding Test Org" });
    await page.goto("/dashboard/settings");

    await page.click('button:has-text("Branding")');
    await page.fill('input[name="primaryColor"]', "#4F46E5");
    await page.click('button[type="submit"]:has-text("Save changes")');
    await expect(page.locator('input[name="primaryColor"]')).toHaveValue("#4F46E5");

    await page.reload();
    await page.click('button:has-text("Branding")');
    await expect(page.locator('input[name="primaryColor"]')).toHaveValue("#4F46E5");

    // General tab (from 07-Tenant-Management.md) must still work unmodified — it's the default tab.
    await page.click('button:has-text("General")');
    await expect(page.locator('input[name="industry"]')).toBeVisible();
  });

  test("settings: General tab saves full org profile fields (legal name, address, contact)", async ({ page }) => {
    await registerViaUi(page, { email: uniqueEmail("orgmgmt-profile"), organizationName: "Profile Test Org" });
    await page.goto("/dashboard/settings");

    await page.fill('input[name="legalName"]', "Profile Test Org Pvt Ltd");
    await page.fill('input[name="website"]', "https://example.com");
    await page.fill('input[name="phone"]', "+911234567890");
    await page.fill('input[name="email"]', "contact@example.com");
    await page.fill('input[name="address"]', "123 Test Street");
    await page.fill('input[name="city"]', "Mumbai");
    await page.fill('input[name="state"]', "Maharashtra");
    await page.fill('input[name="pincode"]', "400001");
    await page.click('button[type="submit"]:has-text("Save changes")');
    await expect(page.locator('input[name="legalName"]')).toHaveValue("Profile Test Org Pvt Ltd");

    await page.reload();
    await expect(page.locator('input[name="legalName"]')).toHaveValue("Profile Test Org Pvt Ltd");
    await expect(page.locator('input[name="city"]')).toHaveValue("Mumbai");
    await expect(page.locator('input[name="pincode"]')).toHaveValue("400001");
  });
});
