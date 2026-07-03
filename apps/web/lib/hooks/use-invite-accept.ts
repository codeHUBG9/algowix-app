"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import type { InviteValidation, AcceptInviteFormInput } from "@algowix/shared-types";
import { apiClient } from "../api-client";

export function useValidateInvite(token: string | null) {
  return useQuery({
    queryKey: ["invite", token],
    queryFn: () => apiClient.get<InviteValidation>(`/api/v1/invites/${token}`),
    enabled: !!token,
    retry: false,
  });
}

export function useAcceptInvite(token: string | null) {
  return useMutation({
    mutationFn: (input: AcceptInviteFormInput) =>
      apiClient.post<{ organization: { id: string; slug: string; name: string }; redirectTo: string }>(
        `/api/v1/invites/${token}/accept`,
        input
      ),
  });
}
