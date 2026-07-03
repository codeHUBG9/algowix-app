import { test, expect } from "@playwright/test";
import { registerViaUi, uniqueEmail } from "./helpers";

test.describe("Authentication (06-Authentication.md)", () => {
  test("register redirects to the dashboard with session info visible", async ({ page }) => {
    const email = uniqueEmail("auth-e2e");
    await registerViaUi(page, { email, organizationName: "Auth E2E Org" });

    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.getByText(email, { exact: false })).toBeVisible();
  });

  test("logout ends the session and /dashboard redirects to /login", async ({ page }) => {
    const email = uniqueEmail("auth-e2e-logout");
    await registerViaUi(page, { email, organizationName: "Auth E2E Logout Org" });

    await page.click('button:has-text("Sign out")');
    await page.waitForURL("**/login");

    await page.goto("/dashboard");
    await page.waitForURL("**/login");
  });

  test("wrong password is rejected with an error, not a redirect", async ({ page }) => {
    const email = uniqueEmail("auth-e2e-wrongpw");
    await registerViaUi(page, { email, organizationName: "Auth E2E WrongPw Org" });

    await page.click('button:has-text("Sign out")');
    await page.waitForURL("**/login");

    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "WrongPassword123");
    await page.click('button[type="submit"]');

    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
    expect(page.url()).toContain("/login");
  });

  test("correct login after logout reaches the dashboard", async ({ page }) => {
    const email = uniqueEmail("auth-e2e-relogin");
    const password = "Passw0rd123";
    await registerViaUi(page, { email, password, organizationName: "Auth E2E Relogin Org" });

    await page.click('button:has-text("Sign out")');
    await page.waitForURL("**/login");

    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    await page.waitForURL("**/dashboard");
    await expect(page.getByText("Welcome back")).toBeVisible();
  });
});
