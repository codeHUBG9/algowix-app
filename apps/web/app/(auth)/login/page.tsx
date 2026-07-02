"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormInput } from "@algowix/shared-types";
import { apiClient, ApiClientError } from "../../../lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginFormInput) {
    setServerError(null);
    try {
      await apiClient.post("/api/v1/auth/login", data);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setServerError(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>

      <p className="text-center text-sm text-slate-500">
        Don&apos;t have an account? <a href="/register" className="font-medium text-slate-900">Start free trial</a>
      </p>
    </form>
  );
}
