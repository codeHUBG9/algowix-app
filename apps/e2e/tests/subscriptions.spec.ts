import { test, expect } from "@playwright/test";
import { API_URL, fireMockPayment, registerViaUi, uniqueEmail } from "./helpers";

// 12-Subscriptions.md's business logic (proration math, seat limits, feature
// gating, lifecycle transitions) is what's under test here — driven via the
// API directly (page.request, so the browser session cookie carries auth),
// same mixed approach as tenant.spec.ts. The Overview tab in billing.spec.ts
// already covers the clickable subscribe/simulate-payment path.
test.describe("Subscriptions (12-Subscriptions.md)", () => {
  test("upgrade while trialing is a free plan swap, paying activates it, downgrade prorates a credit", async ({
    page,
    request,
  }) => {
    await registerViaUi(page, { email: uniqueEmail("subs-e2e"), organizationName: "Subscriptions E2E Org" });

    const listRes = await page.request.get(`${API_URL}/api/v1/subscriptions`);
    const [sub] = (await listRes.json()).data;
    expect(sub.status).toBe("TRIALING");
    expect(sub.planSlug).toBe("free");

    // Still trialing — upgrading is a free plan swap, no charge.
    const upgradeRes = await page.request.post(`${API_URL}/api/v1/subscriptions/${sub.id}/upgrade`, {
      data: { newPlanSlug: "growth" },
    });
    expect(upgradeRes.ok()).toBe(true);
    const upgradeBody = (await upgradeRes.json()).data;
    expect(upgradeBody.orderId).toBe("no-payment-required");

    const afterUpgrade = (await (await page.request.get(`${API_URL}/api/v1/subscriptions/${sub.id}`)).json()).data;
    expect(afterUpgrade.planSlug).toBe("growth");
    expect(afterUpgrade.status).toBe("TRIALING");

    const featureBefore = (
      await (await page.request.get(`${API_URL}/api/v1/subscriptions/feature-access?product=crm&feature=advanced_reporting`)).json()
    ).data;
    expect(featureBefore.allowed).toBe(true);

    // Pay to activate.
    const checkoutRes = await page.request.post(`${API_URL}/api/v1/billing/checkout`, {
      data: { productSlug: "crm", planSlug: "growth", billingCycle: "MONTHLY" },
    });
    const { orderId } = (await checkoutRes.json()).data;
    await fireMockPayment(request, { event: "payment.captured", orderId });

    const afterPay = (await (await page.request.get(`${API_URL}/api/v1/subscriptions/${sub.id}`)).json()).data;
    expect(afterPay.status).toBe("ACTIVE");

    // Downgrade to Free — proration nets negative (Free costs 0), so it's a
    // credit, not a charge, and takes effect immediately at no cost.
    const downgradeRes = await page.request.post(`${API_URL}/api/v1/subscriptions/${sub.id}/downgrade`, {
      data: { newPlanSlug: "free" },
    });
    expect(downgradeRes.ok()).toBe(true);
    const downgradeBody = (await downgradeRes.json()).data;
    expect(downgradeBody.orderId).toBe("no-payment-required");

    const afterDowngrade = (await (await page.request.get(`${API_URL}/api/v1/subscriptions/${sub.id}`)).json()).data;
    expect(afterDowngrade.planSlug).toBe("free");
    expect(afterDowngrade.status).toBe("ACTIVE");

    const featureAfter = (
      await (await page.request.get(`${API_URL}/api/v1/subscriptions/feature-access?product=crm&feature=advanced_reporting`)).json()
    ).data;
    expect(featureAfter.allowed).toBe(false);
    expect(featureAfter.reason).toBe("FEATURE_NOT_IN_PLAN");

    // Downgrading to the same plan again is rejected.
    const noopRes = await page.request.post(`${API_URL}/api/v1/subscriptions/${sub.id}/downgrade`, {
      data: { newPlanSlug: "free" },
    });
    expect(noopRes.status()).toBe(409);

    // History records both plan changes.
    const historyRes = await page.request.get(`${API_URL}/api/v1/subscriptions/${sub.id}/history`);
    const history = (await historyRes.json()).data as { action: string }[];
    expect(history.some((h) => h.action === "subscription.upgraded")).toBe(true);
    expect(history.some((h) => h.action === "subscription.downgraded")).toBe(true);
  });

  test("seat count is bounded by the plan's maxSeats, cancel is terminal", async ({ page }) => {
    await registerViaUi(page, { email: uniqueEmail("subs-seats-e2e"), organizationName: "Subscriptions Seats E2E Org" });

    const [sub] = (await (await page.request.get(`${API_URL}/api/v1/subscriptions`)).json()).data;
    expect(sub.maxSeats).toBe(2); // seeded Free plan

    const withinLimit = await page.request.post(`${API_URL}/api/v1/subscriptions/${sub.id}/seats`, { data: { seatCount: 2 } });
    expect(withinLimit.ok()).toBe(true);

    const overLimit = await page.request.post(`${API_URL}/api/v1/subscriptions/${sub.id}/seats`, { data: { seatCount: 999 } });
    expect(overLimit.status()).toBe(422);

    const cancelRes = await page.request.post(`${API_URL}/api/v1/subscriptions/${sub.id}/cancel`, { data: { immediately: true } });
    expect(cancelRes.ok()).toBe(true);
    expect((await cancelRes.json()).data.status).toBe("CANCELLED");

    // CANCELLED is terminal in this lifecycle — no reactivation path.
    const reactivateRes = await page.request.post(`${API_URL}/api/v1/subscriptions/${sub.id}/reactivate`);
    expect(reactivateRes.status()).toBe(409);
  });

  test("a subscription can't be created twice for the same product, and trial admin jobs are platform-key gated", async ({
    page,
  }) => {
    await registerViaUi(page, { email: uniqueEmail("subs-create-e2e"), organizationName: "Subscriptions Create E2E Org" });

    const duplicate = await page.request.post(`${API_URL}/api/v1/subscriptions`, {
      data: { productSlug: "crm", planSlug: "free" },
    });
    expect(duplicate.status()).toBe(409);

    const denied = await page.request.post(`${API_URL}/api/v1/admin/subscriptions/run-trial-expiry`, {
      headers: { "x-platform-key": "wrong-key" },
    });
    expect(denied.status()).toBe(401);

    const allowed = await page.request.post(`${API_URL}/api/v1/admin/subscriptions/send-trial-warnings`, {
      headers: { "x-platform-key": "dev-platform-admin-key-change-me" },
    });
    expect(allowed.ok()).toBe(true);
  });
});
