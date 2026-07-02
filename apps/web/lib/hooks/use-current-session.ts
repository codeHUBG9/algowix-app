"use client";

import { useQuery } from "@tanstack/react-query";
import type { AccessTokenPayload } from "@algowix/shared-types";
import { apiClient } from "../api-client";

export function useCurrentSession() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiClient.get<{ auth: AccessTokenPayload }>("/api/v1/auth/me"),
    retry: false,
  });
}
