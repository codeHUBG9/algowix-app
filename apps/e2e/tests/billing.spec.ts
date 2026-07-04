import { test, expect } from "@playwright/test";
import { API_URL, fireMockPayment, registerViaUi, uniqueEmail } from "./helpers";

test.describe("Billing (11-Billing.md)", () => {
  test("checkout Growth plan with a coupon, simulate payment, see it paid, download the PDF, manage payment methods", async ({
    page,
  }) => {
    await registerViaUi(page, { email: uniqueEmail("billing-e2e"), organizationName: "Billing E2E Org" });

    await page.goto("/dashboard/billing");
    await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();

    // Overview: CRM starts on the auto-provisioned Free trial.
    await expect(page.getByText("TRIALING")).toBeVisible();

    // Every org auto-subscribes to CRM's Free plan at registration (TRIALING),
    // so the button reads "Change plan" here, not "Subscribe".
    await page.locator("select").first().selectOption("growth");
    await page.fill('input[placeholder="Coupon code (optional)"]', "LAUNCH50");
    await page.click('button:has-text("Change plan")');

    await expect(page.getByText(/Payment pending/)).toBeVisible();
    await page.click('button:has-text("Dev: simulate payment success")');

    await expect(page.getByText("ACTIVE")).toBeVisible();

    await page.click('button:has-text("Invoices")');
    await expect(page.getByText(/AWX-\d{4}-\d{6}/)).toBeVisible();
    await expect(page.getByText("PAID")).toBeVisible();

    const [download] = await Promise.all([page.waitForEvent("download"), page.click("text=Download")]);
    expect(download.url()).toContain("/api/v1/billing/invoices/");

    await page.click('button:has-text("Payment Methods")');
    await page.fill('input[placeholder="Card last 4 digits (dev mock)"]', "4242");
    await page.click('button:has-text("Add")');
    await expect(page.getByText("Visa •••• 4242")).toBeVisible();
    await expect(page.getByText("Default")).toBeVisible();

    await page.click('button:has-text("Remove")');
    await page.click('button:has-text("Confirm")');
    await expect(page.getByText("Visa •••• 4242")).toHaveCount(0);
    await expect(page.getByText("No payment methods yet.")).toBeVisible();
  });

  test("payment failure moves a TRIALING subscription to INCOMPLETE, not ACTIVE", async ({ page, request }) => {
    await registerViaUi(page, { email: uniqueEmail("billing-fail-e2e"), organizationName: "Billing Fail E2E Org" });

    const checkoutRes = await page.request.post(`${API_URL}/api/v1/billing/checkout`, {
      data: { productSlug: "crm", planSlug: "growth", billingCycle: "MONTHLY" },
    });
    expect(checkoutRes.ok()).toBe(true);
    const { orderId } = (await checkoutRes.json()).data;

    await fireMockPayment(request, { event: "payment.failed", orderId, failureReason: "Card declined" });

    const subsRes = await page.request.get(`${API_URL}/api/v1/subscriptions`);
    const [sub] = (await subsRes.json()).data;
    expect(sub.status).toBe("INCOMPLETE");
  });

  test("admin dunning and credit endpoints are gated by the platform key", async ({ page }) => {
    await registerViaUi(page, { email: uniqueEmail("billing-admin-e2e"), organizationName: "Billing Admin E2E Org" });

    const denied = await page.request.post(`${API_URL}/api/v1/admin/billing/run-dunning`, {
      headers: { "x-platform-key": "wrong-key" },
    });
    expect(denied.status()).toBe(401);

    const allowed = await page.request.post(`${API_URL}/api/v1/admin/billing/run-dunning`, {
      headers: { "x-platform-key": "dev-platform-admin-key-change-me" },
    });
    expect(allowed.ok()).toBe(true);
  });
});
