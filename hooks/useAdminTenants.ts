"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdminTenantRow {
  id: string;
  slug: string;
  display_name: string;
  legal_name: string | null;
  cnpj: string | null;
  status: string;
  onboarded_at: string | null;
  suspended_at: string | null;
  created_at: string;
  signup_origin?: string | null;
  ai_account?: {
    mode: string;
    state: string;
    access_until: string | null;
    monthly_remaining: number;
    extra_remaining: number;
  } | null;
  user_count: Array<{ count: number }> | null;
  conversations_count: Array<{ count: number }> | null;
}

export interface AdminTenantsFilters {
  commercial_state?: "pending" | "trial" | "active" | "expired" | "suspended" | "legacy";
  origin?: "self_service" | "manual" | "unknown";
  q?: string;
  status?: "active" | "suspended" | "onboarding" | "redacted";
}

interface ListResponse {
  data: AdminTenantRow[];
  meta?: { cursor?: string | null; has_more?: boolean; total?: number | null };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAdminTenants(filters: AdminTenantsFilters = {}) {
  return useInfiniteQuery({
    queryKey: ["admin", "tenants", filters] as const,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const qs = new URLSearchParams();
      if (filters.q) qs.set("q", filters.q);
      if (filters.status) qs.set("status", filters.status);
      if (filters.commercial_state) qs.set("commercial_state", filters.commercial_state);
      if (filters.origin) qs.set("origin", filters.origin);
      if (pageParam) qs.set("cursor", pageParam);
      qs.set("limit", "30");
      return apiClient.get<ListResponse>(`/api/v1/admin/tenants?${qs.toString()}`);
    },
    getNextPageParam: (last) =>
      last.meta?.has_more && last.meta.cursor ? last.meta.cursor : undefined,
    staleTime: 30_000,
  });
}
