"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { acceptInviteSchema, type AcceptInviteFormInput } from "@algowix/shared-types";
import { useValidateInvite, useAcceptInvite } from "../../../lib/hooks/use-invite-accept";
import { useCurrentSession } from "../../../lib/hooks/use-current-session";
import { ApiClientError } from "../../../lib/api-client";

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { data: invite, isLoading, error: validateError } = useValidateInvite(token);
  const { data: session } = useCurrentSession();
  const acceptInvite = useAcceptInvite(token);
  const [serverError, setServerError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AcceptInviteFormInput>({ resolver: zodResolver(acceptInviteSchema) });

  async function submitAccept(data: AcceptInviteFormInput) {
    setServerError(null);
    try {
      const result = await acceptInvite.mutateAsync(data);
      setAccepted(true);
      window.location.href = result.redirectTo;
    } catch (err) {
      setServerError(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  if (!token) {
    return <p className="text-center text-sm text-red-600">Missing invite token.</p>;
  }

  if (isLoading) {
    return <p className="text-center text-sm text-slate-500">Loading invite...</p>;
  }

  if (validateError || !invite) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-red-600">
          {validateError instanceof ApiClientError ? validateError.message : "This invite is invalid or has expired."}
        </p>
        <a href="/login" className="text-sm font-medium text-slate-900 underline">
          Back to sign in
        </a>
      </div>
    );
  }

  if (accepted) {
    return <p className="text-center text-sm text-slate-500">Redirecting...</p>;
  }

  const loggedInAsSameEmail = session?.auth.email?.toLowerCase() === invite.email.toLowerCase();
  const loggedInAsDifferentEmail = !!session?.auth.email && !loggedInAsSameEmail;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-base font-semibold">Join {invite.organizationName}</h2>
        <p className="mt-1 text-sm text-slate-500">
          You've been invited as <span className="font-medium">{invite.roleName}</span> for {invite.email}
        </p>
      </div>

      {loggedInAsDifferentEmail && (
        <p className="text-center text-sm text-red-600">
          You're signed in as {session?.auth.email}, but this invite was sent to {invite.email}. Sign out first, then
          reopen this link.
        </p>
      )}

      {!loggedInAsDifferentEmail && loggedInAsSameEmail && (
        <div className="text-center">
          {serverError && <p className="mb-3 text-sm text-red-600">{serverError}</p>}
          <button
            onClick={() => submitAccept({})}
            disabled={isSubmitting}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isSubmitting ? "Joining..." : `Accept and join ${invite.organizationName}`}
          </button>
        </div>
      )}

      {!loggedInAsDifferentEmail && !loggedInAsSameEmail && invite.userExists && (
        <div className="text-center text-sm text-slate-600">
          An account already exists for {invite.email}.{" "}
          <a href={`/login?email=${encodeURIComponent(invite.email)}`} className="font-medium text-slate-900 underline">
            Log in
          </a>{" "}
          then revisit this link to accept.
        </div>
      )}

      {!loggedInAsDifferentEmail && !loggedInAsSameEmail && !invite.userExists && (
        <form onSubmit={handleSubmit(submitAccept)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">First name</label>
              <input
                {...register("firstName")}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium">Last name</label>
              <input
                {...register("lastName")}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Password</label>
            <input
              type="password"
              {...register("password")}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>
          {serverError && <p className="text-sm text-red-600">{serverError}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isSubmitting ? "Creating account..." : "Create account and join"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<p className="text-center text-sm text-slate-500">Loading...</p>}>
      <AcceptInviteContent />
    </Suspense>
  );
}
