"use client";

import { useState } from "react";
import { useProducts, useLaunchProduct, type Product } from "../../../../lib/hooks/use-products";
import { ApiClientError } from "../../../../lib/api-client";

const STATUS_STYLES: Record<string, string> = {
  TRIALING: "bg-amber-100 text-amber-800",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  PAST_DUE: "bg-red-100 text-red-800",
  CANCELLED: "bg-slate-200 text-slate-600",
  PAUSED: "bg-slate-200 text-slate-600",
  INCOMPLETE: "bg-slate-100 text-slate-700",
};

function SubscriptionBadge({ subscription }: { subscription: Product["subscription"] }) {
  if (!subscription) {
    return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Not subscribed</span>;
  }
  const style = STATUS_STYLES[subscription.status] ?? "bg-slate-100 text-slate-700";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>{subscription.status}</span>;
}

function ProductCard({ product }: { product: Product }) {
  const [expanded, setExpanded] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const launchProduct = useLaunchProduct();

  const canLaunch = product.subscription && ["TRIALING", "ACTIVE"].includes(product.subscription.status);

  async function onLaunch() {
    setLaunchError(null);
    try {
      const { url } = await launchProduct.mutateAsync(product.slug);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setLaunchError(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {product.logoUrl ? (
            <img src={product.logoUrl} alt="" className="h-10 w-10 rounded-md object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-sm font-semibold text-slate-500">
              {product.name.slice(0, 1)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">{product.name}</h2>
              {product.isBeta && (
                <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                  BETA
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">{product.category}</p>
          </div>
        </div>
        <SubscriptionBadge subscription={product.subscription} />
      </div>

      {product.shortDescription && <p className="mt-3 text-sm text-slate-600">{product.shortDescription}</p>}

      {product.subscription?.tenantUrl && (
        <a
          href={product.subscription.tenantUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-sm font-medium text-slate-900 underline"
        >
          Open {product.name}
        </a>
      )}

      {canLaunch && (
        <div className="mt-3">
          <button
            onClick={onLaunch}
            disabled={launchProduct.isPending}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {launchProduct.isPending ? "Launching..." : `Launch ${product.name}`}
          </button>
          {launchError && <p className="mt-1 text-xs text-red-600">{launchError}</p>}
        </div>
      )}

      <button
        onClick={() => setExpanded((e) => !e)}
        className="mt-3 text-xs font-medium text-slate-500 hover:text-slate-700"
      >
        {expanded ? "Hide plans" : `View plans (${product.plans.length})`}
      </button>

      {expanded && (
        <ul className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          {product.plans.map((plan) => (
            <li key={plan.id} className="flex items-center justify-between text-sm">
              <span>
                {plan.name}
                {plan.maxSeats ? <span className="text-slate-400"> · up to {plan.maxSeats} seats</span> : null}
              </span>
              <span className="font-medium">
                {plan.monthlyPrice === "0" ? "Free" : `${plan.currency} ${plan.monthlyPrice}/mo`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ProductsPage() {
  const { data: products, isLoading } = useProducts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Products</h1>
        <p className="text-sm text-slate-500">Browse and manage the AlgoWix products available to your organization.</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {products?.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
