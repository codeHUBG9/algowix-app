"use client";

import { useRouter } from "next/navigation";
import { useCurrentSession } from "../../../lib/hooks/use-current-session";
import { apiClient } from "../../../lib/api-client";

export default function DashboardPage() {
  const router = useRouter();
  const { data, isLoading, isError } = useCurrentSession();

  async function handleLogout() {
    await apiClient.post("/api/v1/auth/logout");
    router.push("/login");
    router.refresh();
  }

  if (isLoading) return <p className="text-sm text-slate-500">Loading...</p>;

  if (isError || !data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600">Your session has expired.</p>
        <a href="/login" className="text-sm font-medium text-slate-900 underline">
          Sign in again
        </a>
      </div>
    );
  }

  const { auth } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Welcome back</h1>
        <p className="text-sm text-slate-500">
          Signed in as {auth.email} · {auth.role} · {auth.orgSlug}
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-medium text-slate-700">Products</h2>
        <p className="mt-1 text-sm text-slate-500">
          No products connected yet. The Product Catalog ships in a later phase (09-Product-Integration).
        </p>
      </div>

      <button onClick={handleLogout} className="text-sm font-medium text-red-600 underline">
        Sign out
      </button>
    </div>
  );
}
