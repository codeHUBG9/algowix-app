"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient, ApiClientError } from "../../../lib/api-client";

type Status = "verifying" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("verifying");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setError("Missing verification token.");
      return;
    }

    apiClient
      .post("/api/v1/auth/verify-email", { token })
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setError(err instanceof ApiClientError ? err.message : "Something went wrong");
      });
  }, [searchParams]);

  if (status === "verifying") {
    return <p className="text-center text-sm text-slate-500">Verifying your email...</p>;
  }

  if (status === "success") {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm font-medium text-slate-900">Email verified — your trial is now active.</p>
        <a href="/dashboard" className="text-sm font-medium text-slate-900 underline">
          Go to dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-center">
      <p className="text-sm text-red-600">{error}</p>
      <a href="/login" className="text-sm font-medium text-slate-900 underline">
        Back to sign in
      </a>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p className="text-center text-sm text-slate-500">Loading...</p>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
