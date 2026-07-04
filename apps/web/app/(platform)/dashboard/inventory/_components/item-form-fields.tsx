"use client";

import type { InventoryItemInput } from "../../../../../lib/hooks/use-inventory";

const STATUSES: InventoryItemInput["status"][] = ["ACTIVE", "INACTIVE", "DISCONTINUED"];

const inputClasses =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100";
const labelClasses = "mb-1 block text-xs font-medium text-slate-500";

export function ItemFormFields({
  value,
  onChange,
}: {
  value: InventoryItemInput;
  onChange: (next: InventoryItemInput) => void;
}) {
  function set<K extends keyof InventoryItemInput>(key: K, v: InventoryItemInput[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="item-sku" className={labelClasses}>
            SKU *
          </label>
          <input id="item-sku" required className={inputClasses} value={value.sku} onChange={(e) => set("sku", e.target.value)} />
        </div>
        <div>
          <label htmlFor="item-status" className={labelClasses}>
            Status
          </label>
          <select
            id="item-status"
            className={inputClasses}
            value={value.status}
            onChange={(e) => set("status", e.target.value as InventoryItemInput["status"])}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="item-name" className={labelClasses}>
          Name *
        </label>
        <input id="item-name" required className={inputClasses} value={value.name} onChange={(e) => set("name", e.target.value)} />
      </div>

      <div>
        <label htmlFor="item-description" className={labelClasses}>
          Description
        </label>
        <textarea
          id="item-description"
          className={inputClasses}
          rows={2}
          value={value.description ?? ""}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="item-category" className={labelClasses}>
            Category
          </label>
          <input id="item-category" className={inputClasses} value={value.category ?? ""} onChange={(e) => set("category", e.target.value)} />
        </div>
        <div>
          <label htmlFor="item-location" className={labelClasses}>
            Location
          </label>
          <input id="item-location" className={inputClasses} value={value.location ?? ""} onChange={(e) => set("location", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="item-quantity" className={labelClasses}>
            Quantity
          </label>
          <input
            id="item-quantity"
            type="number"
            min={0}
            className={inputClasses}
            value={value.quantity}
            onChange={(e) => set("quantity", Number(e.target.value))}
          />
        </div>
        <div>
          <label htmlFor="item-reorder-point" className={labelClasses}>
            Reorder Point
          </label>
          <input
            id="item-reorder-point"
            type="number"
            min={0}
            className={inputClasses}
            value={value.reorderPoint}
            onChange={(e) => set("reorderPoint", Number(e.target.value))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="item-unit-cost" className={labelClasses}>
            Unit Cost
          </label>
          <input
            id="item-unit-cost"
            type="number"
            min={0}
            step="0.01"
            className={inputClasses}
            value={value.unitCost}
            onChange={(e) => set("unitCost", Number(e.target.value))}
          />
        </div>
        <div>
          <label htmlFor="item-unit-price" className={labelClasses}>
            Unit Price
          </label>
          <input
            id="item-unit-price"
            type="number"
            min={0}
            step="0.01"
            className={inputClasses}
            value={value.unitPrice}
            onChange={(e) => set("unitPrice", Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
