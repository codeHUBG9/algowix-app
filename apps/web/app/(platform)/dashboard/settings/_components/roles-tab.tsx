"use client";

import { useState } from "react";
import {
  useRbacRoles,
  usePermissionCatalog,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  type RbacRole,
} from "../../../../../lib/hooks/use-roles";
import { useProducts } from "../../../../../lib/hooks/use-products";
import { ApiClientError } from "../../../../../lib/api-client";

interface RoleFormState {
  name: string;
  description: string;
  permissionIds: string[];
  productAccess: string[];
}

const EMPTY_FORM: RoleFormState = { name: "", description: "", permissionIds: [], productAccess: [] };

export function RolesTab() {
  const { data: roles, isLoading } = useRbacRoles();
  const { data: catalog } = usePermissionCatalog();
  const { data: products } = useProducts();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<RoleFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  function startCreate() {
    setForm(EMPTY_FORM);
    setError(null);
    setEditingId("new");
  }

  function startEdit(role: RbacRole) {
    setForm({
      name: role.name,
      description: role.description ?? "",
      permissionIds: role.permissions.map((p) => p.id),
      productAccess: role.productAccess.map((p) => p.slug),
    });
    setError(null);
    setEditingId(role.id);
  }

  function togglePermission(id: string) {
    setForm((f) => ({
      ...f,
      permissionIds: f.permissionIds.includes(id) ? f.permissionIds.filter((p) => p !== id) : [...f.permissionIds, id],
    }));
  }

  function toggleProduct(slug: string) {
    setForm((f) => ({
      ...f,
      productAccess: f.productAccess.includes(slug) ? f.productAccess.filter((p) => p !== slug) : [...f.productAccess, slug],
    }));
  }

  async function onSave() {
    setError(null);
    if (!form.name.trim() || form.permissionIds.length === 0) {
      setError("Name and at least one permission are required");
      return;
    }
    try {
      if (editingId === "new") {
        await createRole.mutateAsync({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          permissionIds: form.permissionIds,
          productAccess: form.productAccess,
        });
      } else if (editingId) {
        await updateRole.mutateAsync({
          id: editingId,
          input: {
            name: form.name.trim(),
            description: form.description.trim() || undefined,
            permissionIds: form.permissionIds,
            productAccess: form.productAccess,
          },
        });
      }
      setEditingId(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  async function onDelete(id: string) {
    setError(null);
    try {
      await deleteRole.mutateAsync(id);
      setConfirmingDeleteId(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  const isSaving = createRole.isPending || updateRole.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-700">Roles</h2>
        {editingId === null && (
          <button
            onClick={startCreate}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
          >
            Create custom role
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {editingId !== null && (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-medium">{editingId === "new" ? "New custom role" : "Edit role"}</h3>
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input
                name="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Description</label>
              <input
                name="description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Permissions</label>
              <div className="mt-2 space-y-3">
                {catalog?.map((group) => (
                  <div key={group.category}>
                    <p className="text-xs font-semibold uppercase text-slate-400">{group.category}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      {group.permissions.map((p) => (
                        <label key={p.id} className="flex items-center gap-1.5 text-xs text-slate-600">
                          <input
                            type="checkbox"
                            checked={form.permissionIds.includes(p.id)}
                            onChange={() => togglePermission(p.id)}
                          />
                          {p.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium">Product access</label>
              <p className="text-xs text-slate-400">Leave unchecked to allow every subscribed product.</p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                {products?.map((product) => (
                  <label key={product.id} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={form.productAccess.includes(product.slug)}
                      onChange={() => toggleProduct(product.slug)}
                    />
                    {product.name}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onSave}
                disabled={isSaving}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save role"}
              </button>
              <button onClick={() => setEditingId(null)} className="text-sm text-slate-600">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {roles?.map((role) => (
              <li key={role.id} className="py-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{role.name}</span>
                    {role.isSystem && (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">System</span>
                    )}
                    {role.description && <p className="text-xs text-slate-500">{role.description}</p>}
                  </div>
                  {!role.isSystem && (
                    <div className="flex items-center gap-3">
                      <button onClick={() => startEdit(role)} className="text-xs font-medium text-slate-600 underline">
                        Edit
                      </button>
                      {confirmingDeleteId === role.id ? (
                        <>
                          <button
                            onClick={() => onDelete(role.id)}
                            disabled={deleteRole.isPending}
                            className="text-xs font-medium text-red-600"
                          >
                            Confirm delete
                          </button>
                          <button onClick={() => setConfirmingDeleteId(null)} className="text-xs text-slate-500">
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmingDeleteId(role.id)}
                          className="text-xs font-medium text-red-600 underline"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {role.permissions.length} permission{role.permissions.length === 1 ? "" : "s"}
                  {role.memberCount !== undefined && ` · ${role.memberCount} member${role.memberCount === 1 ? "" : "s"}`}
                  {role.productAccess.length > 0 && ` · limited to ${role.productAccess.map((p) => p.name).join(", ")}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
