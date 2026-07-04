"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Boxes, DollarSign, PackageX, Plus, TrendingUp } from "lucide-react";
import { PageHeader } from "../../../../components/ui/page-header";
import { StatsCard } from "../../../../components/ui/stats-card";
import { DataTable } from "../../../../components/ui/data-table";
import { ConfirmDialog } from "../../../../components/ui/confirm-dialog";
import { cn } from "../../../../lib/utils";
import { useDeleteInventoryItem, useInventoryItems, type InventoryItem } from "../../../../lib/hooks/use-inventory";
import { ItemSheet } from "./_components/item-sheet";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default function InventoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const { data: items, isLoading } = useInventoryItems({ lowStockOnly });
  const [sheetOpen, setSheetOpen] = useState(searchParams.get("new") === "1");
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const deleteItem = useDeleteInventoryItem();

  const stats = useMemo(() => {
    const all = items ?? [];
    const totalValue = all.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);
    const lowStock = all.filter((i) => i.quantity <= i.reorderPoint).length;
    const active = all.filter((i) => i.status === "ACTIVE").length;
    return { total: all.length, totalValue, lowStock, active };
  }, [items]);

  const columns = useMemo<ColumnDef<InventoryItem>[]>(
    () => [
      { accessorKey: "sku", header: "SKU" },
      { accessorKey: "name", header: "Name" },
      { accessorKey: "category", header: "Category", cell: ({ row }) => row.original.category ?? "—" },
      {
        accessorKey: "quantity",
        header: "Qty",
        cell: ({ row }) => (
          <span className={cn("font-medium", row.original.quantity <= row.original.reorderPoint ? "text-red-600" : "text-slate-700 dark:text-slate-300")}>
            {row.original.quantity}
          </span>
        ),
      },
      {
        accessorKey: "unitPrice",
        header: "Unit Price",
        cell: ({ row }) => currency.format(Number(row.original.unitPrice)),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              row.original.status === "ACTIVE"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                : row.original.status === "INACTIVE"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
            )}
          >
            {row.original.status}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-3 text-xs font-medium">
            <button onClick={() => router.push(`/dashboard/inventory/${row.original.id}`)} className="text-brand-600 hover:underline">
              View
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(row.original);
              }}
              className="text-red-600 hover:underline"
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    [router]
  );

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Track stock levels, movements, and reorder points across your organization."
        actions={
          <button
            onClick={() => setSheetOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus size={15} /> Add Item
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard title="Total Items" value={stats.total} icon={Boxes} gradient={0} />
        <StatsCard title="Stock Value" value={stats.totalValue} format={(n) => currency.format(n)} icon={DollarSign} gradient={1} />
        <StatsCard title="Low Stock" value={stats.lowStock} icon={PackageX} gradient={2} />
        <StatsCard title="Active SKUs" value={stats.active} icon={TrendingUp} gradient={3} />
      </div>

      <DataTable
        columns={columns}
        data={items ?? []}
        isLoading={isLoading}
        searchPlaceholder="Search SKU or name..."
        exportFilename="inventory.csv"
        emptyTitle="No inventory items yet"
        emptyDescription="Add your first item to start tracking stock."
        emptyAction={
          <button onClick={() => setSheetOpen(true)} className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">
            Add Item
          </button>
        }
        toolbar={
          <button
            onClick={() => setLowStockOnly((v) => !v)}
            className={cn(
              "rounded-md border px-3 py-2 text-sm font-medium",
              lowStockOnly ? "border-red-300 bg-red-50 text-red-700 dark:bg-red-950/40" : "border-border text-slate-600 hover:bg-surface-subtle"
            )}
          >
            Low stock only
          </button>
        }
      />

      <ItemSheet open={sheetOpen} onOpenChange={setSheetOpen} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.sku}?`}
        description="This permanently removes the item and its movement history."
        isLoading={deleteItem.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteItem.mutate(deleteTarget.id, {
            onSuccess: () => {
              toast.success("Item deleted");
              setDeleteTarget(null);
            },
            onError: () => toast.error("Failed to delete item"),
          });
        }}
      />
    </div>
  );
}
