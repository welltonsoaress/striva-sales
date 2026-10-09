"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { apiClient } from "@/lib/api/client";

// Contratação, suporte, exportação e segurança permanecem acessíveis após o teste.
const recoveryPaths = ["/app/settings/billing", "/app/ajuda", "/app/lgpd/requests", "/app/settings/security", "/app/settings/profile"];

export function SubscriptionAccessGate({ required, paywall, children }: {
  required: boolean; paywall: React.ReactNode; children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [blocked, setBlocked] = useState(required);
  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const result = await apiClient.get<{ data: { paywall_required: boolean } }>("/api/v1/billing/access");
        // O client conserva o envelope canônico. Resposta ausente/malformada
        // nunca transforma um bloqueio confirmado em acesso operacional.
        if (active && typeof result.data?.paywall_required === "boolean")
          setBlocked(result.data.paywall_required);
      } catch { /* Uma falha de consulta nunca libera um bloqueio confirmado. */ }
    };
    void check();
    const timer = setInterval(() => void check(), 60_000);
    return () => { active = false; clearInterval(timer); };
  }, [pathname]);
  const recovery = recoveryPaths.some(path => pathname === path || pathname.startsWith(path + "/"));
  return blocked && !recovery ? paywall : children;
}
