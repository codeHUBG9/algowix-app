"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { useRecordMovement, type MovementType } from "../../../../../lib/hooks/use-inventory";

export function MovementWidget({ itemId }: { itemId: string }) {
  const [type, setType] = useState<MovementType>("IN");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const record = useRecordMovement(itemId);

  function submit() {
    if (quantity <= 0) return;
    record.mutate(
      { type, quantity, reason: reason || undefined },
      {
        onSuccess: () => {
          toast.success(`Stock ${type === "OUT" ? "decreased" : "increased"} by ${quantity}`);
          setQuantity(1);
          setReason("");
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to record movement"),
      }
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-card">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Quick adjustment</p>
      <div className="flex items-center gap-2">
        <div className="flex overflow-hidden rounded-lg border border-border">
          <button
            onClick={() => setType("IN")}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium ${type === "IN" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950" : "text-slate-500"}`}
          >
            <Plus size={13} /> In
          </button>
          <button
            onClick={() => setType("OUT")}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium ${type === "OUT" ? "bg-red-100 text-red-700 dark:bg-red-950" : "text-slate-500"}`}
          >
            <Minus size={13} /> Out
          </button>
          <button
            onClick={() => setType("ADJUSTMENT")}
            className={`px-3 py-1.5 text-sm font-medium ${type === "ADJUSTMENT" ? "bg-brand-100 text-brand-700 dark:bg-brand-950" : "text-slate-500"}`}
          >
            Adjust
          </button>
        </div>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="w-20 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand-400"
        />
      </div>
      <input
        placeholder="Reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-400"
      />
      <button
        onClick={submit}
        disabled={record.isPending}
        className="w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        Record movement
      </button>
    </div>
  );
}
