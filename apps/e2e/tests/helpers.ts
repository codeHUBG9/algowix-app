import type { APIRequestContext, Page } from "@playwright/test";

export const API_URL = "http://localhost:4000";

export function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export interface RegisterOptions {
  email: string;
  password?: string;
  organizationName: string;
  firstName?: string;
  lastName?: string;
}

/** Fills and submits the real register form, then waits for the dashboard redirect. */
export async function registerViaUi(page: Page, opts: RegisterOptions): Promise<void> {
  const password = opts.password ?? "Passw0rd123";
  await page.goto("/register");
  await page.fill('input[name="firstName"]', opts.firstName ?? "E2E");
  await page.fill('input[name="lastName"]', opts.lastName ?? "Test");
  await page.fill('input[name="organizationName"]', opts.organizationName);
  await page.fill('input[name="email"]', opts.email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard");
}

/**
 * No email provider is wired up yet (06-Authentication.md defers it), so this
 * dev/test-only endpoint (see apps/server/src/modules/auth/auth.router.ts,
 * only registered outside production) stands in for "click the link in the
 * email" — same mechanism the .http request collections use.
 */
export async function getVerificationToken(request: APIRequestContext, email: string): Promise<string> {
  const res = await request.get(`${API_URL}/api/v1/auth/test/verification-token`, { params: { email } });
  if (!res.ok()) {
    throw new Error(`verification-token lookup failed: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  return body.data.token as string;
}

export async function verifyEmail(request: APIRequestContext, token: string): Promise<void> {
  const res = await request.post(`${API_URL}/api/v1/auth/verify-email`, { data: { token } });
  if (!res.ok()) {
    throw new Error(`verify-email failed: ${res.status()} ${await res.text()}`);
  }
}

/** Registers via UI, then verifies the email via the API so the org reaches TRIALING. */
export async function registerAndVerify(page: Page, request: APIRequestContext, opts: RegisterOptions): Promise<void> {
  await registerViaUi(page, opts);
  const token = await getVerificationToken(request, opts.email);
  await verifyEmail(request, token);
}
