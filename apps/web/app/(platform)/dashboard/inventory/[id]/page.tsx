"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDownCircle, ArrowUpCircle, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { PageHeader } from "../../../../../components/ui/page-header";
import { EmptyState } from "../../../../../components/ui/empty-state";
import { ConfirmDialog } from "../../../../../components/ui/confirm-dialog";
import { LoadingScreen } from "../../../../../components/ui/loading-screen";
import { useDeleteInventoryItem, useInventoryItem } from "../../../../../lib/hooks/use-inventory";
import { ItemSheet } from "../_components/item-sheet";
import { MovementWidget } from "../_components/movement-widget";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

export default function InventoryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: item, isLoading } = useInventoryItem(params.id);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteItem = useDeleteInventoryItem();

  if (isLoading) return <LoadingScreen />;
  if (!item) return <EmptyState title="Item not found" />;

  return (
    <div>
      <PageHeader
        title={item.name}
        description={`SKU ${item.sku}`}
        breadcrumb={[{ label: "Inventory", href: "/dashboard/inventory" }, { label: item.sku }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-slate-600 hover:bg-surface-subtle dark:text-slate-300"
            >
              <Pencil size={14} /> Edit
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
            <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Item details</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-400">Category</dt>
                <dd className="text-slate-700 dark:text-slate-300">{item.category ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Location</dt>
                <dd className="text-slate-700 dark:text-slate-300">{item.location ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Quantity</dt>
                <dd className={item.quantity <= item.reorderPoint ? "font-semibold text-red-600" : "text-slate-700 dark:text-slate-300"}>
                  {item.quantity} {item.quantity <= item.reorderPoint && "(low stock)"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Reorder Point</dt>
                <dd className="text-slate-700 dark:text-slate-300">{item.reorderPoint}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Unit Cost</dt>
                <dd className="text-slate-700 dark:text-slate-300">{currency.format(Number(item.unitCost))}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Unit Price</dt>
                <dd className="text-slate-700 dark:text-slate-300">{currency.format(Number(item.unitPrice))}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Status</dt>
                <dd className="text-slate-700 dark:text-slate-300">{item.status}</dd>
              </div>
            </dl>
            {item.description && (
              <div className="mt-4 border-t border-border pt-4">
                <dt className="mb-1 text-sm text-slate-400">Description</dt>
                <dd className="text-sm text-slate-700 dark:text-slate-300">{item.description}</dd>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
            <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Movement history</h2>
            {item.movements.length === 0 ? (
              <EmptyState icon={RefreshCw} title="No movements yet" description="Stock adjustments will appear here." />
            ) : (
              <ul className="space-y-3">
                {item.movements.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 text-sm">
                    {m.type === "OUT" ? (
                      <ArrowDownCircle size={18} className="text-red-500" />
                    ) : (
                      <ArrowUpCircle size={18} className="text-emerald-500" />
                    )}
                    <div className="flex-1">
                      <p className="text-slate-700 dark:text-slate-300">
                        {m.type === "OUT" ? "Removed" : m.type === "IN" ? "Added" : "Adjusted"} {m.quantity} units
                        {m.reason && <span className="text-slate-400"> — {m.reason}</span>}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">{new Date(m.createdAt).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <MovementWidget itemId={item.id} />
        </div>
      </div>

      <ItemSheet open={editOpen} onOpenChange={setEditOpen} item={item} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${item.sku}?`}
        description="This permanently removes the item and its movement history."
        isLoading={deleteItem.isPending}
        onConfirm={() => {
          deleteItem.mutate(item.id, {
            onSuccess: () => {
              toast.success("Item deleted");
              router.push("/dashboard/inventory");
            },
            onError: () => toast.error("Failed to delete item"),
          });
        }}
      />
    </div>
  );
}
