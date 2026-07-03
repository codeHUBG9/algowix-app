import { test, expect } from "@playwright/test";
import { getVerificationToken, registerViaUi, uniqueEmail, verifyEmail } from "./helpers";

test.describe("Tenant lifecycle (07-Tenant-Management.md)", () => {
  test("PENDING -> settings edit persists -> verify email -> TRIALING -> cancel -> blocked screens", async ({
    page,
    request,
  }) => {
    const email = uniqueEmail("tenant-e2e");
    await registerViaUi(page, { email, organizationName: "Tenant E2E Org" });

    // Fresh org: no trial banner yet, dashboard renders normally.
    await expect(page.getByText("Your account is")).toHaveCount(0);
    await expect(page.getByText("left in your trial")).toHaveCount(0);

    await page.goto("/dashboard/settings");
    await expect(page.getByText("PENDING")).toBeVisible();

    await page.fill('input[name="industry"]', "Software");
    await page.selectOption('select[name="size"]', "SMALL");
    await page.click('button[type="submit"]:has-text("Save changes")');
    await expect(page.locator('input[name="industry"]')).toHaveValue("Software");

    // Reload to prove the save round-tripped through the API, not just local form state.
    await page.reload();
    await expect(page.locator('input[name="industry"]')).toHaveValue("Software");

    const token = await getVerificationToken(request, email);
    await verifyEmail(request, token);

    await page.goto("/dashboard");
    await expect(page.getByText("left in your trial")).toBeVisible();

    await page.goto("/dashboard/settings");
    await expect(page.getByText("TRIALING")).toBeVisible();
    await expect(page.getByText("(you)")).toBeVisible();

    await page.click('button:has-text("Cancel account")');
    await page.click('button:has-text("Yes, cancel")');

    // The cancel mutation writes CANCELLED straight into the tenant query cache,
    // so TenantStatusGate (wrapping this very page) takes over immediately —
    // the settings form never gets a chance to re-render its own status badge.
    await expect(page.getByRole("heading", { name: "Your account is cancelled" })).toBeVisible();

    // A cancelled tenant is locked out of everywhere the tenant-status gate covers,
    // including on a cold load that has to hit the API and get a real 403 back.
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Your account is cancelled" })).toBeVisible();

    await page.goto("/dashboard/settings");
    await expect(page.getByRole("heading", { name: "Your account is cancelled" })).toBeVisible();
  });

  test("second registration cannot see the first org's members (cross-tenant isolation)", async ({
    page,
    request,
  }) => {
    const emailA = uniqueEmail("tenant-e2e-iso-a");
    await registerViaUi(page, { email: emailA, organizationName: "Isolation Org A" });

    const tokenA = await getVerificationToken(request, emailA);
    await verifyEmail(request, tokenA);

    await page.click('button:has-text("Sign out")');
    await page.waitForURL("**/login");

    const emailB = uniqueEmail("tenant-e2e-iso-b");
    await registerViaUi(page, { email: emailB, organizationName: "Isolation Org B" });

    await page.goto("/dashboard/settings");
    await expect(page.getByText(emailB, { exact: false })).toBeVisible();
    await expect(page.getByText(emailA, { exact: false })).toHaveCount(0);
  });
});
