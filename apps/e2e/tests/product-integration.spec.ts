import { test, expect } from "@playwright/test";
import { API_URL, getSessionOrgId, registerViaUi, signInternalPayload, uniqueEmail } from "./helpers";

const PLATFORM_ADMIN_KEY = "dev-platform-admin-key-change-me";

test.describe("Product Integration (09-Product-Integration.md)", () => {
  test("products page shows CRM auto-subscribed as TRIALING, plans expand", async ({ page }) => {
    await registerViaUi(page, { email: uniqueEmail("product-int"), organizationName: "Product Integration Org" });
    await page.goto("/dashboard/products");

    await expect(page.getByText("CRM")).toBeVisible();
    await expect(page.getByText("TRIALING")).toBeVisible();

    await page.click('button:has-text("View plans")');
    await expect(page.getByText("Free").first()).toBeVisible();
  });

  test("public catalog omits subscription status when unauthenticated", async ({ page, request }) => {
    await registerViaUi(page, { email: uniqueEmail("product-int-pub"), organizationName: "Public Catalog Org" });

    const authed = await page.request.get(`${API_URL}/api/v1/products`);
    const authedBody = await authed.json();
    const crmAuthed = authedBody.data.find((p: { slug: string }) => p.slug === "crm");
    expect(crmAuthed.subscription.status).toBe("TRIALING");

    // `request` is a separate context with no session cookie.
    const anon = await request.get(`${API_URL}/api/v1/products`);
    const anonBody = await anon.json();
    const crmAnon = anonBody.data.find((p: { slug: string }) => p.slug === "crm");
    expect(crmAnon.subscription).toBeNull();
  });

  test("unknown or inactive product slugs 404 from the public route", async ({ page }) => {
    await registerViaUi(page, { email: uniqueEmail("product-int-404"), organizationName: "404 Test Org" });

    const missing = await page.request.get(`${API_URL}/api/v1/products/does-not-exist`);
    expect(missing.status()).toBe(404);

    // Inventory is seeded isActive: false — not visible via the public route.
    const inactive = await page.request.get(`${API_URL}/api/v1/products/inventory`);
    expect(inactive.status()).toBe(404);
  });

  test("internal HMAC push: valid signature succeeds, missing/tampered signature rejected", async ({
    page,
    request,
  }) => {
    await registerViaUi(page, { email: uniqueEmail("product-int-hmac"), organizationName: "HMAC Test Org" });
    const orgId = await getSessionOrgId(page.request);
    const meRes = await page.request.get(`${API_URL}/api/v1/auth/me`);
    const userId = (await meRes.json()).data.auth.userId as string;

    const payload = {
      organizationId: orgId,
      userId,
      type: "deal.won",
      title: "Deal Won",
      body: "Pushed by a product via the signed contract API",
    };
    const { bodyStr, signature, timestamp } = await signInternalPayload(request, payload);

    const ok = await request.post(`${API_URL}/api/internal/notifications`, {
      data: bodyStr,
      headers: {
        "content-type": "application/json",
        "platform-internal-key": signature,
        "platform-internal-timestamp": timestamp,
      },
    });
    expect(ok.status()).toBe(201);

    const missingHeaders = await request.post(`${API_URL}/api/internal/notifications`, {
      data: bodyStr,
      headers: { "content-type": "application/json" },
    });
    expect(missingHeaders.status()).toBe(401);

    const tampered = await request.post(`${API_URL}/api/internal/notifications`, {
      data: bodyStr,
      headers: {
        "content-type": "application/json",
        "platform-internal-key": "0".repeat(64),
        "platform-internal-timestamp": timestamp,
      },
    });
    expect(tampered.status()).toBe(401);
  });

  test("admin: health-check trigger records a failure against CRM's non-responsive contract API", async ({
    request,
  }) => {
    const wrongKey = await request.get(`${API_URL}/api/v1/admin/products`, {
      headers: { "x-platform-key": "not-the-real-key" },
    });
    expect(wrongKey.status()).toBe(401);

    const check = await request.post(`${API_URL}/api/v1/admin/products/crm/health-check`, {
      headers: { "x-platform-key": PLATFORM_ADMIN_KEY },
    });
    expect(check.status()).toBe(200);
    const body = await check.json();
    expect(body.data.healthStatus).toBe("down");
    expect(body.data.consecutiveFailures).toBeGreaterThan(0);
  });
});
