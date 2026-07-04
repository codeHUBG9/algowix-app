"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateOrganizationSchema, type UpdateOrganizationFormInput } from "@algowix/shared-types";
import { useCurrentSession } from "../../../../lib/hooks/use-current-session";
import { useTenant, useTenantMembers, useUpdateTenant, useCancelTenant } from "../../../../lib/hooks/use-tenant";
import { ApiClientError } from "../../../../lib/api-client";
import { BrandingTab } from "./_components/branding-tab";
import { SecurityTab } from "./_components/security-tab";
import { NotificationsTab } from "./_components/notifications-tab";
import { ApiKeysTab } from "./_components/api-keys-tab";
import { RolesTab } from "./_components/roles-tab";

const TABS = ["General", "Branding", "Security", "Notifications", "API Keys", "Roles"] as const;
type Tab = (typeof TABS)[number];

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  TRIALING: "bg-amber-100 text-amber-800",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  SUSPENDED: "bg-red-100 text-red-800",
  CANCELLED: "bg-slate-200 text-slate-600",
  PURGED: "bg-slate-200 text-slate-500",
};

export default function SettingsPage() {
  const { data: session } = useCurrentSession();
  const { data: tenant, isLoading } = useTenant();
  const { data: members } = useTenantMembers();
  const updateTenant = useUpdateTenant();
  const cancelTenant = useCancelTenant();
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [tab, setTab] = useState<Tab>("General");

  const canEdit = session?.auth.permissions.includes("organization.update") ?? false;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateOrganizationFormInput>({ resolver: zodResolver(updateOrganizationSchema) });

  useEffect(() => {
    if (tenant) {
      reset({
        name: tenant.name,
        legalName: tenant.legalName ?? "",
        industry: tenant.industry ?? "",
        size: (tenant.size as UpdateOrganizationFormInput["size"]) ?? "",
        foundedYear: tenant.foundedYear ?? "",
        website: tenant.website ?? "",
        phone: tenant.phone ?? "",
        email: tenant.email ?? "",
        address: tenant.address ?? "",
        city: tenant.city ?? "",
        state: tenant.state ?? "",
        pincode: tenant.pincode ?? "",
        timezone: tenant.timezone,
        currency: tenant.currency,
        logoUrl: tenant.logoUrl ?? "",
      });
    }
  }, [tenant, reset]);

  async function onSubmit(data: UpdateOrganizationFormInput) {
    setServerError(null);
    const payload = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== "" && value !== undefined)
    );
    try {
      await updateTenant.mutateAsync(payload);
    } catch (err) {
      setServerError(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  async function onCancel() {
    setServerError(null);
    try {
      await cancelTenant.mutateAsync();
      setConfirmingCancel(false);
    } catch (err) {
      setServerError(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  if (isLoading || !tenant) return <p className="text-sm text-slate-500">Loading...</p>;

  const statusStyle = STATUS_STYLES[tenant.status] ?? "bg-slate-100 text-slate-700";

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Organization settings</h1>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle}`}>{tenant.status}</span>
        </div>
        <p className="text-sm text-slate-500">
          {tenant.slug} · {tenant.plan} plan
        </p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Branding" && <BrandingTab />}
      {tab === "Security" && <SecurityTab />}
      {tab === "Notifications" && <NotificationsTab />}
      {tab === "API Keys" && <ApiKeysTab />}
      {tab === "Roles" && <RolesTab />}

      {tab === "General" && (
        <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
        <fieldset disabled={!canEdit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Organization name</label>
            <input
              {...register("name")}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Legal name</label>
              <input
                {...register("legalName")}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Founded year</label>
              <input
                type="number"
                {...register("foundedYear")}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
              />
              {errors.foundedYear && <p className="mt-1 text-xs text-red-600">{errors.foundedYear.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Website</label>
              <input
                {...register("website")}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
              />
              {errors.website && <p className="mt-1 text-xs text-red-600">{errors.website.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium">Phone</label>
              <input
                {...register("phone")}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Contact email</label>
            <input
              {...register("email")}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium">Address</label>
            <input
              {...register("address")}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium">City</label>
              <input
                {...register("city")}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">State</label>
              <input
                {...register("state")}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Pincode</label>
              <input
                {...register("pincode")}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Industry</label>
              <input
                {...register("industry")}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Company size</label>
              <select
                {...register("size")}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
              >
                <option value="">Select...</option>
                <option value="MICRO">1–10</option>
                <option value="SMALL">11–50</option>
                <option value="MEDIUM">51–250</option>
                <option value="LARGE">251–1000</option>
                <option value="ENTERPRISE">1000+</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Timezone</label>
              <input
                {...register("timezone")}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Currency</label>
              <input
                {...register("currency")}
                maxLength={3}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase disabled:bg-slate-50"
              />
              {errors.currency && <p className="mt-1 text-xs text-red-600">{errors.currency.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Logo URL</label>
            <input
              {...register("logoUrl")}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
            />
            {errors.logoUrl && <p className="mt-1 text-xs text-red-600">{errors.logoUrl.message}</p>}
          </div>
        </fieldset>

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        {canEdit ? (
          <button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save changes"}
          </button>
        ) : (
          <p className="text-xs text-slate-500">Only Owners and Admins can edit organization settings.</p>
        )}
      </form>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-medium text-slate-700">Members</h2>
        <ul className="mt-3 divide-y divide-slate-100">
          {members?.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {m.user.firstName} {m.user.lastName}
                {m.user.id === session?.auth.userId ? " (you)" : ""}{" "}
                <span className="text-slate-400">· {m.user.email}</span>
              </span>
              <span className="text-slate-500">{m.role.name}</span>
            </li>
          ))}
        </ul>
      </div>

      {canEdit && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5">
          <h2 className="text-sm font-medium text-red-800">Cancel account</h2>
          <p className="mt-1 text-sm text-red-700">
            This cancels your subscription and schedules your data for deletion after a 60-day retention period.
          </p>
          {!confirmingCancel ? (
            <button
              onClick={() => setConfirmingCancel(true)}
              className="mt-3 text-sm font-medium text-red-700 underline"
            >
              Cancel account
            </button>
          ) : (
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={onCancel}
                disabled={cancelTenant.isPending}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {cancelTenant.isPending ? "Cancelling..." : "Yes, cancel"}
              </button>
              <button onClick={() => setConfirmingCancel(false)} className="text-sm text-slate-600">
                Never mind
              </button>
            </div>
          )}
        </div>
      )}
        </>
      )}
    </div>
  );
}
