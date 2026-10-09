"use client";
import { useCallback, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminTenantsFilters } from "@/hooks/useAdminTenants";
import { useT } from "@/hooks/i18n/useT";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TenantsFiltersProps {
  filters: AdminTenantsFilters;
  onChange: (filters: AdminTenantsFilters) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TenantsFilters({ filters, onChange }: TenantsFiltersProps) {
  const t = useT();
  const [inputValue, setInputValue] = useState(filters.q ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback(
    (value: string) => {
      setInputValue(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange({ ...filters, q: value || undefined });
      }, 300);
    },
    [filters, onChange],
  );

  const handleStatus = useCallback(
    (value: string) => {
      onChange({
        ...filters,
        status: value === "all" ? undefined : (value as AdminTenantsFilters["status"]),
      });
    },
    [filters, onChange],
  );

  return (
    <div className="flex flex-col flex-wrap gap-3 sm:flex-row sm:items-center">
      <Input
        placeholder={t("Buscar por nome, slug ou CNPJ...")}
        value={inputValue}
        onChange={(e) => handleSearch(e.target.value)}
        className="sm:w-80"
        aria-label={t("Buscar empresas")}
      />
      <Select value={filters.status ?? "all"} onValueChange={handleStatus}>
        <SelectTrigger className="sm:w-44" aria-label={t("Filtrar por status")}>
          <SelectValue placeholder={t("Status")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("Todos os status")}</SelectItem>
          <SelectItem value="active">{t("Ativo")}</SelectItem>
          <SelectItem value="onboarding">{t("Onboarding")}</SelectItem>
          <SelectItem value="suspended">{t("Suspenso")}</SelectItem>
          <SelectItem value="redacted">{t("Redigido")}</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={filters.commercial_state ?? "all"}
        onValueChange={(value) =>
          onChange({
            ...filters,
            commercial_state:
              value === "all" ? undefined : (value as AdminTenantsFilters["commercial_state"]),
          })
        }
      >
        <SelectTrigger className="sm:w-48" aria-label={t("Situação comercial")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("Todas as situações comerciais")}</SelectItem>
          {[
            ["pending", t("Preparando atendimento")],
            ["trial", t("Em teste")],
            ["active", t("Assinatura ativa")],
            ["expired", t("Período encerrado")],
            ["suspended", t("Suspensa")],
            ["legacy", t("IA legada")],
          ].map(([value, label]) => (
            <SelectItem key={value} value={value!}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.origin ?? "all"}
        onValueChange={(value) =>
          onChange({
            ...filters,
            origin: value === "all" ? undefined : (value as AdminTenantsFilters["origin"]),
          })
        }
      >
        <SelectTrigger className="sm:w-44" aria-label={t("Origem do cadastro")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("Todas as origens")}</SelectItem>
          <SelectItem value="self_service">{t("Cadastro pelo site")}</SelectItem>
          <SelectItem value="manual">{t("Inclusão manual")}</SelectItem>
          <SelectItem value="unknown">{t("Origem não identificada")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
