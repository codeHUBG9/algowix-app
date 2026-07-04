"use client";

import { useState } from "react";
import { useProducts, type Product } from "../../../../../lib/hooks/use-products";
import { useUsage, useCheckout, useSimulateMockPayment } from "../../../../../lib/hooks/use-billing";
import {
  useSubscriptions,
  useUpgradeSubscription,
  useDowngradeSubscription,
  useCancelSubscription,
  useReactivateSubscription,
} from "../../../../../lib/hooks/use-subscriptions";
import { ApiClientError } from "../../../../../lib/api-client";
import type { Subscription } from "@algowix/shared-types";

const STATUS_STYLES: Record<string, string> = {
  TRIALING: "bg-amber-100 text-amber-800",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  PAST_DUE: "bg-red-100 text-red-800",
  SUSPENDED: "bg-red-200 text-red-900",
  CANCELLED: "bg-slate-200 text-slate-600",
  INCOMPLETE: "bg-slate-100 text-slate-700",
};

interface PendingPayment {
  orderId: string;
  productSlug: string;
}

function ProductBillingCard({
  product,
  subscription,
  pending,
  setPending,
}: {
  product: Product;
  subscription: Subscription | undefined;
  pending: PendingPayment | null;
  setPending: (p: PendingPayment | null) => void;
}) {
  const { data: usage } = useUsage(subscription ? product.slug : undefined);

  const [planSlug, setPlanSlug] = useState(product.plans[0]?.slug ?? "");
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");
  const [couponCode, setCouponCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const checkout = useCheckout();
  const upgrade = useUpgradeSubscription();
  const downgrade = useDowngradeSubscription();
  const cancel = useCancelSubscription();
  const reactivate = useReactivateSubscription();
  const simulate = useSimulateMockPayment();

  const currentPlan = product.plans.find((p) => p.id === subscription?.planId);
  const selectedPlan = product.plans.find((p) => p.slug === planSlug);
  const isPending = checkout.isPending || upgrade.isPending || downgrade.isPending;

  async function onChangePlan() {
    setError(null);
    if (!selectedPlan) return;
    try {
      let result: { orderId: string } | null = null;
      if (!subscription || subscription.status === "TRIALING" || subscription.status === "INCOMPLETE") {
        result = await checkout.mutateAsync({ productSlug: product.slug, planSlug, billingCycle, couponCode: couponCode || undefined });
      } else if (subscription.status === "ACTIVE") {
        const higher = Number(selectedPlan.monthlyPrice) > Number(currentPlan?.monthlyPrice ?? 0);
        result = higher
          ? await upgrade.mutateAsync({ id: subscription.id, newPlanSlug: planSlug })
          : await downgrade.mutateAsync({ id: subscription.id, newPlanSlug: planSlug });
      }
      if (result && result.orderId !== "no-payment-required") {
        setPending({ orderId: result.orderId, productSlug: product.slug });
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  async function onCancel() {
    if (!subscription) return;
    try {
      await cancel.mutateAsync({ id: subscription.id, immediately: true });
      setConfirmingCancel(false);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  async function onReactivate() {
    if (!subscription) return;
    try {
      const result = (await reactivate.mutateAsync(subscription.id)) as unknown as { orderId?: string };
      if (result.orderId && result.orderId !== "no-payment-required") {
        setPending({ orderId: result.orderId, productSlug: product.slug });
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  const statusStyle = subscription ? STATUS_STYLES[subscription.status] ?? "bg-slate-100 text-slate-700" : "bg-slate-100 text-slate-500";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">{product.name}</h2>
          <p className="text-xs text-slate-500">{currentPlan ? `${currentPlan.name} plan` : "Not subscribed"}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle}`}>{subscription?.status ?? "NONE"}</span>
      </div>

      {usage && (
        <p className="mt-2 text-xs text-slate-500">
          Seats: {usage.seatsUsed}
          {usage.seatLimit !== null ? ` / ${usage.seatLimit}` : ""}
        </p>
      )}

      {pending?.productSlug === product.slug && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-medium text-amber-900">
            Payment pending (order {pending.orderId}) — no real gateway configured, so use the dev actions below to
            simulate the gateway webhook.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => simulate.mutate({ orderId: pending.orderId, event: "payment.captured" }, { onSuccess: () => setPending(null) })}
              disabled={simulate.isPending}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              Dev: simulate payment success
            </button>
            <button
              onClick={() => simulate.mutate({ orderId: pending.orderId, event: "payment.failed" }, { onSuccess: () => setPending(null) })}
              disabled={simulate.isPending}
              className="rounded-md bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50"
            >
              Dev: simulate failure
            </button>
          </div>
        </div>
      )}

      {subscription?.status !== "CANCELLED" && (
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
          <div className="flex gap-2">
            <select
              value={planSlug}
              onChange={(e) => setPlanSlug(e.target.value)}
              className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs"
            >
              {product.plans.map((plan) => (
                <option key={plan.id} value={plan.slug}>
                  {plan.name} — {plan.monthlyPrice === "0" ? "Free" : `${plan.currency} ${plan.monthlyPrice}/mo`}
                </option>
              ))}
            </select>
            <select
              value={billingCycle}
              onChange={(e) => setBillingCycle(e.target.value as "MONTHLY" | "ANNUAL")}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-xs"
            >
              <option value="MONTHLY">Monthly</option>
              <option value="ANNUAL">Annual</option>
            </select>
          </div>
          {(!subscription || subscription.status === "TRIALING" || subscription.status === "INCOMPLETE") && (
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Coupon code (optional)"
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
            />
          )}
          <button
            onClick={onChangePlan}
            disabled={isPending || planSlug === currentPlan?.slug}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {isPending ? "Processing..." : subscription ? "Change plan" : "Subscribe"}
          </button>
        </div>
      )}

      {(subscription?.status === "PAST_DUE" || subscription?.status === "SUSPENDED") && (
        <button onClick={onReactivate} disabled={reactivate.isPending} className="mt-2 text-xs font-medium text-emerald-700 underline">
          {reactivate.isPending ? "Reactivating..." : "Reactivate"}
        </button>
      )}

      {subscription && subscription.status !== "CANCELLED" && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          {!confirmingCancel ? (
            <button onClick={() => setConfirmingCancel(true)} className="text-xs font-medium text-red-600 underline">
              Cancel subscription
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={onCancel} disabled={cancel.isPending} className="text-xs font-medium text-red-600">
                Confirm cancel
              </button>
              <button onClick={() => setConfirmingCancel(false)} className="text-xs text-slate-500">
                Never mind
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function OverviewTab() {
  const { data: products, isLoading } = useProducts();
  const { data: subscriptions } = useSubscriptions();
  const [pending, setPending] = useState<PendingPayment | null>(null);

  if (isLoading) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {products?.map((product) => (
        <ProductBillingCard
          key={product.id}
          product={product}
          subscription={subscriptions?.find((s) => s.productSlug === product.slug)}
          pending={pending}
          setPending={setPending}
        />
      ))}
    </div>
  );
}
