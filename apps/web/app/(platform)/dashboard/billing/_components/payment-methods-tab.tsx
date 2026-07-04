"use client";

import { useState } from "react";
import { usePaymentMethods, useAddPaymentMethod, useRemovePaymentMethod, useSetDefaultPaymentMethod } from "../../../../../lib/hooks/use-billing";
import { ApiClientError } from "../../../../../lib/api-client";

export function PaymentMethodsTab() {
  const { data: methods, isLoading } = usePaymentMethods();
  const addMethod = useAddPaymentMethod();
  const removeMethod = useRemovePaymentMethod();
  const setDefault = useSetDefaultPaymentMethod();

  const [last4, setLast4] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Dev-only "add card" affordance — no real Razorpay/Stripe checkout widget
  // is embedded here (no merchant account in this environment), so this
  // registers a fake gateway method id rather than tokenizing a real card.
  async function onAdd() {
    setError(null);
    if (!/^\d{4}$/.test(last4)) {
      setError("Enter the last 4 digits of a (fake) card");
      return;
    }
    try {
      await addMethod.mutateAsync({
        gatewayMethodId: `mock_pm_${Date.now()}`,
        type: "CARD",
        brand: "Visa",
        last4,
        isDefault: methods?.length === 0,
      });
      setLast4("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  async function onRemove(id: string) {
    try {
      await removeMethod.mutateAsync(id);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-medium text-slate-700">Add payment method</h2>
        <div className="mt-3 flex gap-2">
          <input
            value={last4}
            onChange={(e) => setLast4(e.target.value)}
            placeholder="Card last 4 digits (dev mock)"
            maxLength={4}
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={onAdd}
            disabled={addMethod.isPending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {addMethod.isPending ? "Adding..." : "Add"}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-medium text-slate-700">Payment methods</h2>
        {isLoading ? (
          <p className="mt-3 text-sm text-slate-500">Loading...</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {methods?.map((method) => (
              <li key={method.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {method.brand} •••• {method.last4}
                  {method.isDefault && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Default</span>}
                </span>
                <div className="flex items-center gap-3">
                  {!method.isDefault && (
                    <button
                      onClick={() => setDefault.mutate(method.id)}
                      disabled={setDefault.isPending}
                      className="text-xs font-medium text-slate-600 underline"
                    >
                      Make default
                    </button>
                  )}
                  {removingId === method.id ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => onRemove(method.id)} disabled={removeMethod.isPending} className="text-xs font-medium text-red-600">
                        Confirm
                      </button>
                      <button onClick={() => setRemovingId(null)} className="text-xs text-slate-500">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setRemovingId(method.id)} className="text-xs font-medium text-red-600 underline">
                      Remove
                    </button>
                  )}
                </div>
              </li>
            ))}
            {methods?.length === 0 && <p className="py-2 text-sm text-slate-500">No payment methods yet.</p>}
          </ul>
        )}
      </div>
    </div>
  );
}
