"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiClient } from "@/lib/api/client";
import { useT } from "@/hooks/i18n/useT";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Agent = {
  id: string; name: string; kind: string; is_active: boolean; paused_at: string | null;
  versao_publicada: { pipeline_ids: string[] } | null;
};

/** A permissão efetiva vem da versão publicada, nunca do mapeamento das etapas. */
export function PipelineAgentSetup({ pipelineId }: { pipelineId: string }) {
  const t = useT();
  const [selected, setSelected] = useState("");
  const agents = useQuery({
    queryKey: ["pipeline-agent-setup", pipelineId],
    queryFn: () => apiClient.get<{ data: Agent[] }>("/api/v1/ai/agents").then((r) => r.data),
  });
  const available = (agents.data ?? []).filter((agent) => agent.kind === "mcp_agent");
  const authorized = available.filter((agent) => agent.is_active && !agent.paused_at && agent.versao_publicada?.pipeline_ids?.includes(pipelineId));
  return <section className="space-y-3 rounded-md border p-3">
    <h3 className="text-sm font-medium">{t("Agente responsável pelo funil")}</h3>
    {agents.isPending ? <p>{t("Carregando agentes…")}</p> : agents.isError ?
      <Button variant="outline" onClick={() => void agents.refetch()}>{t("Tentar carregar agentes novamente")}</Button> : <>
      <p className="text-sm">{authorized.length ? `${t("Permissão publicada:")} ${authorized.map((agent) => agent.name).join(", ")}` : t("Depende de configuração: nenhum agente ativo tem permissão publicada para este funil.")}</p>
      <p className="text-xs text-muted-foreground">{t("Escolha o agente, marque este funil em Organiza o sistema, salve o rascunho e publique. Um administrador precisa concluir essa etapa. As associações das colunas, sozinhas, não liberam o agente.")}</p>
      {available.length ? <>
        <Label htmlFor={`agent-for-${pipelineId}`}>{t("Selecionar agente")}</Label>
        <select id={`agent-for-${pipelineId}`} className="w-full rounded-md border bg-background p-2 text-sm" value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">{t("Selecione um agente")}</option>
          {available.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
        </select>
        {available.some((agent) => agent.id === selected) && <Button asChild variant="outline"><Link href={`/app/ai/agents/${encodeURIComponent(selected)}?pipeline=${encodeURIComponent(pipelineId)}#funil-${encodeURIComponent(pipelineId)}`}>{t("Associar e revisar publicação")}</Link></Button>}
      </> : <Button asChild variant="outline"><Link href="/app/ai/agents">{t("Configurar um agente")}</Link></Button>}
    </>}
  </section>;
}
