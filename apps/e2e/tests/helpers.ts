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

/**
 * Dev/test-only, same rationale as getVerificationToken — no email provider
 * is wired up, so invite links are only logged to server stdout. See
 * GET /api/v1/invites/test/token in invite-accept.router.ts.
 */
export async function getInviteToken(request: APIRequestContext, email: string): Promise<string> {
  const res = await request.get(`${API_URL}/api/v1/invites/test/token`, { params: { email } });
  if (!res.ok()) {
    throw new Error(`invite test-token lookup failed: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  return body.data.token as string;
}

/** Reads the logged-in user's organizationId — use `page.request` so the browser's session cookie is sent. */
export async function getSessionOrgId(pageRequest: APIRequestContext): Promise<string> {
  const res = await pageRequest.get(`${API_URL}/api/v1/auth/me`);
  if (!res.ok()) {
    throw new Error(`auth/me failed: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  return body.data.auth.organizationId as string;
}

/**
 * 13-RBAC.md §4 gates custom roles behind a Growth+ Organization.plan, but no
 * real flow mutates that field yet (upgrading the org's own plan, as opposed
 * to a per-product Subscription's plan, isn't built) — same dev/test-only
 * backdoor rationale as getVerificationToken/getInviteToken above. Because
 * `plan` is baked into the JWT at login, the caller must sign out and back in
 * afterward for the change to take effect (see login-after-logout pattern in
 * auth.spec.ts).
 */
export async function setOrgPlan(request: APIRequestContext, organizationId: string, plan: string): Promise<void> {
  const res = await request.post(`${API_URL}/api/v1/dev/set-org-plan`, { data: { organizationId, plan } });
  if (!res.ok()) {
    throw new Error(`set-org-plan failed: ${res.status()} ${await res.text()}`);
  }
}

/** Looks up a Permission row's id by its "resource.action" key, for tests that POST /api/v1/roles directly. */
export async function getPermissionId(pageRequest: APIRequestContext, key: string): Promise<string> {
  const res = await pageRequest.get(`${API_URL}/api/v1/permissions`);
  if (!res.ok()) {
    throw new Error(`permissions list failed: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  const permissions = body.data as { id: string; key: string }[];
  const match = permissions.find((p) => p.key === key);
  if (!match) throw new Error(`Permission "${key}" not found`);
  return match.id;
}

/**
 * 09-Product-Integration.md §4 — .http files can't compute an HMAC, and
 * neither should a test reimplement the signing algorithm; this hits the
 * same dev/test-only helper (POST /api/v1/dev/sign-internal-key) the .http
 * collections use, so both surfaces exercise the identical signing path.
 */
export async function signInternalPayload(
  request: APIRequestContext,
  payload: unknown
): Promise<{ bodyStr: string; signature: string; timestamp: string }> {
  const res = await request.post(`${API_URL}/api/v1/dev/sign-internal-key`, { data: { payload } });
  if (!res.ok()) {
    throw new Error(`sign-internal-key failed: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  return body.data;
}

/**
 * 11-Billing.md — no real Razorpay/Stripe merchant account exists in this
 * environment, so checkout always returns a MOCK gateway order (see
 * modules/billing/gateway/index.ts). This fires the equivalent of the real
 * gateway's webhook: sign via the dev-only helper (same rationale as
 * signInternalPayload above — a test shouldn't reimplement the HMAC scheme),
 * then POST the exact signed bytes to /webhooks/mock.
 */
export async function fireMockPayment(
  request: APIRequestContext,
  input: { event: "payment.captured" | "payment.failed"; orderId: string; failureReason?: string }
): Promise<void> {
  const signRes = await request.post(`${API_URL}/api/v1/dev/billing/sign-mock-webhook`, { data: input });
  if (!signRes.ok()) {
    throw new Error(`sign-mock-webhook failed: ${signRes.status()} ${await signRes.text()}`);
  }
  const { rawBody, headers } = (await signRes.json()).data as { rawBody: string; headers: Record<string, string> };

  const res = await request.post(`${API_URL}/webhooks/mock`, {
    headers: { "Content-Type": "application/json", ...headers },
    data: rawBody,
  });
  if (!res.ok()) {
    throw new Error(`webhooks/mock failed: ${res.status()} ${await res.text()}`);
  }
}
