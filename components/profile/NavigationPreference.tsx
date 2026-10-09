"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useT } from "@/lib/i18n/IdiomaProvider";
import { apiClient } from "@/lib/api/client";
import { showApiError } from "@/components/feedback/ApiErrorToast";
import { Button } from "@/components/ui/button";

export function NavigationPreference() {
  const t = useT(), router = useRouter();
  const { activeOrg, user } = useAuth();
  const [busy, setBusy] = useState(false);
  if (!activeOrg || user.support) return null;
  const simplified = activeOrg.interface_settings?.preset === "simplificada";
  return <section className="space-y-3 rounded-lg border p-5">
    <h2 className="font-semibold">{t("Sua navegação")}</h2>
    <p className="text-sm text-muted-foreground">{t("O modo simples reúne as tarefas do dia a dia. O modo completo mostra todas as áreas que seu perfil pode acessar.")}</p>
    <Button variant="outline" disabled={busy} onClick={async () => {
      setBusy(true);
      try {
        await apiClient.patch("/api/v1/profile/interface", { preset: simplified ? "completa" : "simplificada" });
        router.refresh();
      } catch (error) { showApiError(error); } finally { setBusy(false); }
    }}>{t(busy ? "Salvando…" : simplified ? "Mostrar todas as áreas" : "Usar navegação simples")}</Button>
  </section>;
}
