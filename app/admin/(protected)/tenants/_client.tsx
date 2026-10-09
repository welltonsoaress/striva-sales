"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "@/lib/ui/icons";
import { TenantsFilters } from "@/components/admin/tenants/TenantsFilters";
import { TenantsTable, TenantsTableSkeleton } from "@/components/admin/tenants/TenantsTable";
import { useAdminTenants, type AdminTenantsFilters } from "@/hooks/useAdminTenants";
import { useT } from "@/hooks/i18n/useT";

export function TenantsClient() {
  const t = useT();
  const params = useSearchParams();
  const [filters, setFilters] = useState<AdminTenantsFilters>({
    commercial_state: z
      .enum(["pending", "trial", "active", "expired", "suspended", "legacy"])
      .optional()
      .catch(undefined)
      .parse(params.get("commercial_state") ?? undefined),
  });

  const { data, isLoading, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useAdminTenants(filters);

  const rows = data?.pages.flatMap((p) => p.data ?? []) ?? [];
  const total = data?.pages[0]?.meta?.total;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{t("Empresas")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading
              ? t("Carregando...")
              : total === undefined
                ? t("Total indisponível.")
                : `${total} empresa${total !== 1 ? "s" : ""} · ${rows.length} exibidas`}
          </p>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link href="/admin/tenants/new">
            <Plus size={16} aria-hidden />
            {t("Nova empresa")}
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <TenantsFilters filters={filters} onChange={setFilters} />

      {/* Table */}
      {isError ? (
        <div role="alert" className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
          <p>{t("Não foi possível consultar as empresas.")}</p>
          <Button type="button" variant="outline" className="mt-3" onClick={() => void refetch()}>
            {t("Tentar novamente")}
          </Button>
        </div>
      ) : isLoading ? (
        <TenantsTableSkeleton />
      ) : (
        <TenantsTable
          data={rows}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={() => void fetchNextPage()}
        />
      )}
    </div>
  );
}
