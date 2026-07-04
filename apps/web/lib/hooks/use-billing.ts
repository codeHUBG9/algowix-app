"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CheckoutSession, CouponValidation, Invoice, PaymentMethod, UpcomingInvoicePreview, UsageSummary } from "@algowix/shared-types";
import { apiClient } from "../api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function useInvoices() {
  return useQuery({
    queryKey: ["billing", "invoices"],
    queryFn: () => apiClient.get<Invoice[]>("/api/v1/billing/invoices?limit=50"),
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ["billing", "invoices", id],
    queryFn: () => apiClient.get<Invoice>(`/api/v1/billing/invoices/${id}`),
    enabled: !!id,
  });
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: ["billing", "payment-methods"],
    queryFn: () => apiClient.get<PaymentMethod[]>("/api/v1/billing/payment-methods"),
  });
}

export function useUsage(productSlug: string | undefined) {
  return useQuery({
    queryKey: ["billing", "usage", productSlug],
    queryFn: () => apiClient.get<UsageSummary>(`/api/v1/billing/usage?product=${productSlug}`),
    enabled: !!productSlug,
  });
}

export function useUpcomingInvoice(productSlug: string | undefined) {
  return useQuery({
    queryKey: ["billing", "upcoming", productSlug],
    queryFn: () => apiClient.get<UpcomingInvoicePreview>(`/api/v1/billing/upcoming?product=${productSlug}`),
    enabled: !!productSlug,
  });
}

export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { productSlug: string; planSlug: string; billingCycle: "MONTHLY" | "ANNUAL"; couponCode?: string }) =>
      apiClient.post<CheckoutSession>("/api/v1/billing/checkout", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    },
  });
}

export function useValidateCoupon() {
  return useMutation({
    mutationFn: (input: { code: string; productSlug?: string }) => apiClient.post<CouponValidation>("/api/v1/billing/coupon/validate", input),
  });
}

export function useAddPaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      gatewayMethodId: string;
      type: "CARD" | "UPI" | "NETBANKING" | "SEPA" | "ACH";
      brand?: string;
      last4?: string;
      isDefault?: boolean;
    }) => apiClient.post<PaymentMethod>("/api/v1/billing/payment-methods", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing", "payment-methods"] }),
  });
}

export function useRemovePaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/billing/payment-methods/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing", "payment-methods"] }),
  });
}

export function useSetDefaultPaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch<PaymentMethod>(`/api/v1/billing/payment-methods/${id}/default`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing", "payment-methods"] }),
  });
}

// Dev-only affordance — stands in for a real Razorpay/Stripe checkout widget.
// No merchant account exists in this environment, so checkout always returns
// a MOCK order (see gateway/index.ts); this replays a signed webhook the same
// way the .http/E2E tests do (see /dev/billing/sign-mock-webhook), so the
// full order -> webhook -> invoice-paid flow is exercised from the UI too.
export function useSimulateMockPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { orderId: string; event: "payment.captured" | "payment.failed" }) => {
      const signRes = await fetch(`${API_URL}/api/v1/dev/billing/sign-mock-webhook`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const signBody = await signRes.json();
      const { rawBody, headers } = signBody.data as { rawBody: string; headers: Record<string, string> };

      const webhookRes = await fetch(`${API_URL}/webhooks/mock`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...headers },
        body: rawBody,
      });
      return webhookRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    },
  });
}
