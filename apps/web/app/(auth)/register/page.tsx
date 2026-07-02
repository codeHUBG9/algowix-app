"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterFormInput } from "@algowix/shared-types";
import { apiClient, ApiClientError } from "../../../lib/api-client";

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInput>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(data: RegisterFormInput) {
    setServerError(null);
    try {
      await apiClient.post("/api/v1/auth/register", data);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setServerError(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">First name</label>
          <input {...register("firstName")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">Last name</label>
          <input {...register("lastName")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Organization name</label>
        <input {...register("organizationName")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        {errors.organizationName && <p className="mt-1 text-xs text-red-600">{errors.organizationName.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium">Email</label>
        <input type="email" {...register("email")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium">Password</label>
        <input type="password" {...register("password")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-slate-900 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isSubmitting ? "Creating account..." : "Start free trial"}
      </button>

      <p className="text-center text-sm text-slate-500">
        Already have an account? <a href="/login" className="font-medium text-slate-900">Sign in</a>
      </p>
    </form>
  );
}
