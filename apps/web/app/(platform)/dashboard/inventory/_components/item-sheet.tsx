"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SheetForm } from "../../../../../components/ui/sheet-form";
import { ItemFormFields } from "./item-form-fields";
import {
  useCreateInventoryItem,
  useUpdateInventoryItem,
  type InventoryItem,
  type InventoryItemInput,
} from "../../../../../lib/hooks/use-inventory";

const EMPTY: InventoryItemInput = {
  sku: "",
  name: "",
  description: "",
  category: "",
  quantity: 0,
  reorderPoint: 10,
  unitCost: 0,
  unitPrice: 0,
  location: "",
  status: "ACTIVE",
};

export function ItemSheet({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: InventoryItem;
}) {
  const [form, setForm] = useState<InventoryItemInput>(EMPTY);
  const create = useCreateInventoryItem();
  const update = useUpdateInventoryItem(item?.id ?? "");
  const isEdit = !!item;
  const mutation = isEdit ? update : create;

  useEffect(() => {
    if (open) {
      setForm(
        item
          ? {
              sku: item.sku,
              name: item.name,
              description: item.description ?? "",
              category: item.category ?? "",
              quantity: item.quantity,
              reorderPoint: item.reorderPoint,
              unitCost: Number(item.unitCost),
              unitPrice: Number(item.unitPrice),
              location: item.location ?? "",
              status: item.status,
            }
          : EMPTY
      );
    }
  }, [open, item]);

  function handleSubmit() {
    mutation.mutate(form, {
      onSuccess: () => {
        toast.success(isEdit ? "Item updated" : "Item created");
        onOpenChange(false);
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      },
    });
  }

  return (
    <SheetForm
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit item" : "Add inventory item"}
      description={isEdit ? `Update ${item?.sku}` : "Add a new SKU to your inventory"}
      onSubmit={handleSubmit}
      isLoading={mutation.isPending}
      submitLabel={isEdit ? "Save changes" : "Create item"}
    >
      <ItemFormFields value={form} onChange={setForm} />
    </SheetForm>
  );
}
