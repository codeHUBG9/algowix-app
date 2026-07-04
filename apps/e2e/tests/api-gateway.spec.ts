import { test, expect } from "@playwright/test";
import { API_URL, getSessionOrgId, registerViaUi, uniqueEmail } from "./helpers";

test.describe("API Gateway (10-API-Gateway.md)", () => {
  test("create an API key via Settings UI, use it to authenticate, then revoke it", async ({ page }) => {
    await registerViaUi(page, { email: uniqueEmail("api-gw"), organizationName: "Api Gateway Org" });
    const orgId = await getSessionOrgId(page.request);

    await page.goto("/dashboard/settings");
    await page.click('button:has-text("API Keys")');

    await page.fill('input[placeholder="Key name (e.g. CI pipeline)"]', "CI pipeline");
    await page.locator('label:has-text("organization.read") input[type="checkbox"]').check();
    await page.click('button:has-text("Create key")');

    await expect(page.getByText("Copy your API key now")).toBeVisible();
    const rawKey = await page.locator("code").textContent();
    expect(rawKey).toMatch(/^awx_live_/);

    await page.click('button:has-text("Done")');
    await expect(page.getByText("CI pipeline")).toBeVisible();
    await expect(page.getByText("organization.read").first()).toBeVisible();

    // The key authenticates a permission-gated route with no session cookie at all.
    const authed = await page.request.get(`${API_URL}/api/v1/organizations/${orgId}`, {
      headers: { Authorization: `ApiKey ${rawKey}` },
    });
    expect(authed.status()).toBe(200);

    // A scope it was never granted (organization.update) is rejected.
    const forbidden = await page.request.put(`${API_URL}/api/v1/organizations/${orgId}`, {
      headers: { Authorization: `ApiKey ${rawKey}` },
      data: { name: "Should be forbidden" },
    });
    expect(forbidden.status()).toBe(403);

    // A garbage key is rejected outright.
    const garbage = await page.request.get(`${API_URL}/api/v1/organizations/${orgId}`, {
      headers: { Authorization: "ApiKey awx_live_not_a_real_key" },
    });
    expect(garbage.status()).toBe(401);

    await page.click('button:has-text("Revoke")');
    await page.click('button:has-text("Confirm")');
    await expect(page.getByText("Revoked")).toBeVisible();

    const afterRevoke = await page.request.get(`${API_URL}/api/v1/organizations/${orgId}`, {
      headers: { Authorization: `ApiKey ${rawKey}` },
    });
    expect(afterRevoke.status()).toBe(401);
  });

  test("response caching: product catalog and JWKS carry Cache-Control", async ({ page }) => {
    await registerViaUi(page, { email: uniqueEmail("api-gw-cache"), organizationName: "Cache Test Org" });

    const products = await page.request.get(`${API_URL}/api/v1/products`);
    expect(products.headers()["cache-control"]).toContain("max-age=300");

    const jwks = await page.request.get(`${API_URL}/.well-known/jwks.json`);
    expect(jwks.headers()["cache-control"]).toContain("max-age=900");
  });

  test("developer docs: swagger UI is reachable in non-production", async ({ page }) => {
    const res = await page.request.get(`${API_URL}/api/docs/`);
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain("swagger-ui");
  });
});
