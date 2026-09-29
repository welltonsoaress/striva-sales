"use client";

import { useState } from "react";
import { flowQueryKey as queryKey } from "@/hooks/pipelines/flow-query-key";
import { PipelineAgentSetup } from "@/components/pipelines/PipelineAgentSetup";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/hooks/i18n/useT";
import { apiClient } from "@/lib/api/client";
import { EXPLICACAO_DO_PASSO, ROTULO_DO_PASSO } from "@/lib/leads/agent-mapping";
import type { LeadStage } from "@/lib/agent-engine/agent/lead-state";
import { Check, Warning } from "@/lib/ui/icons";

const SEM_DESTINO = "__sem_destino__";
type FlowStage = { id: string; name: string; is_won: boolean; is_lost: boolean; agent_stage_hint: LeadStage | null };
type EventStageIds = { appointment_pending: string | null; appointment_confirmed: string | null; human_handoff: string | null };
type ReconciliationPreview = {
  available: boolean;
  truncated: boolean;
  proposals: Array<{
    lead_id: string;
    lead_title: string;
    current_stage_name: string;
    suggested_stage_name: string;
    appointment_title: string;
    appointment_status: "pending" | "confirmed";
    appointment_starts_at: string;
  }>;
  ambiguous: Array<{
    lead_titles: string[];
    appointment_titles: string[];
    reason: "multiple_open_leads" | "multiple_active_appointments";
  }>;
};
type FlowData = { stages: FlowStage[]; stage_guidance: Record<string, { purpose: string }>; event_stage_ids: EventStageIds; reconciliation_preview?: ReconciliationPreview };
const url = (id: string) => `/api/v1/pipelines/${encodeURIComponent(id)}/flow-config`;

function padrao(stages: FlowStage[], current?: FlowData): FlowData {
  const stage_guidance = Object.fromEntries(stages.map((stage) => {
    const purpose = current?.stage_guidance[stage.id]?.purpose ?? (stage.agent_stage_hint
      ? `Mova para cá quando ${EXPLICACAO_DO_PASSO[stage.agent_stage_hint]}.`
      : "Etapa operada pela equipe. Mova para cá quando esta for a situação do negócio.");
    return [stage.id, { purpose }];
  }));
  return {
    stages,
    stage_guidance,
    event_stage_ids: current?.event_stage_ids ?? { appointment_pending: null, appointment_confirmed: null, human_handoff: null },
  };
}

function destinos(stages: FlowStage[], kind: keyof EventStageIds) {
  if (kind === "appointment_pending" || kind === "human_handoff") return stages.filter((s) => !s.is_won && !s.is_lost);
  return stages.filter((s) => !s.is_lost);
}

export function FlowConfigSection({ pipelineId }: { pipelineId: string }) {
  const t = useT();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<FlowData | null>(null);
  const query = useQuery({
    queryKey: queryKey(pipelineId),
    queryFn: () => apiClient.get<{ data: FlowData }>(url(pipelineId)).then((r) => r.data),
  });
  const base = query.data ? padrao(query.data.stages, query.data) : null;
  // As etapas vêm sempre da leitura atual; os textos ainda não salvos sobrevivem ao refetch.
  const config = base && draft ? {
    ...base,
    stage_guidance: Object.fromEntries(base.stages.map((stage) => [stage.id, draft.stage_guidance[stage.id] ?? base.stage_guidance[stage.id]!])),
    event_stage_ids: draft.event_stage_ids,
  } : base;
  const save = useMutation({
    mutationFn: (body: Omit<FlowData, "stages">) => apiClient.put<{ data: FlowData }>(url(pipelineId), body).then((r) => r.data),
    onSuccess: async () => {
      setDraft(null);
      await qc.invalidateQueries({ queryKey: queryKey(pipelineId) });
      toast.success(t("Fluxo do funil salvo."));
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : t("Não consegui salvar o fluxo.")),
  });

  function updatePurpose(stageId: string, purpose: string) {
    if (!config) return;
    setDraft({ ...config, stage_guidance: { ...config.stage_guidance, [stageId]: { purpose } } });
  }

  function updateDestination(key: keyof EventStageIds, value: string) {
    if (!config) return;
    setDraft({ ...config, event_stage_ids: { ...config.event_stage_ids, [key]: value === SEM_DESTINO ? null : value } });
  }

  if (query.isPending) return <Card className="p-4 text-sm text-muted-foreground">{t("Carregando as regras deste funil…")}</Card>;
  if (query.isError || !config) return <Card className="p-4 text-sm text-destructive">{t("Não consegui carregar as regras. Atualize a página para tentar novamente.")}</Card>;

  const nomeDaEtapa = (id: string | null) => config.stages.find((s) => s.id === id)?.name ?? null;
  const confirmadoGanha = !!config.event_stage_ids.appointment_confirmed && config.stages.find((s) => s.id === config.event_stage_ids.appointment_confirmed)?.is_won;

  function destinoField(key: keyof EventStageIds, title: string, help: string) {
    const allowed = destinos(config!.stages, key);
    const selected = config!.event_stage_ids[key];
    const selectedExists = !selected || allowed.some((stage) => stage.id === selected);
    return (
      <div className="space-y-2 rounded-md border p-3">
        <Label htmlFor={`event-${pipelineId}-${key}`}>{title}</Label>
        <p className="text-xs text-muted-foreground">{help}</p>
        <Select value={selected ?? SEM_DESTINO} onValueChange={(value) => updateDestination(key, value)}>
          <SelectTrigger id={`event-${pipelineId}-${key}`}><SelectValue placeholder={t("Não mover automaticamente")} /></SelectTrigger>
          <SelectContent>
            {!selectedExists && selected && <SelectItem value={selected} disabled>{t("Destino indisponível")}</SelectItem>}
            <SelectItem value={SEM_DESTINO}>{t("Não mover automaticamente")}</SelectItem>
            {allowed.map((stage) => <SelectItem key={stage.id} value={stage.id}>{stage.name}{stage.is_won ? ` — ${t("encerra como ganho")}` : ""}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{selectedExists && selected ? `${t("Configurado para")} ${nomeDaEtapa(selected) ?? t("uma etapa ativa")}.` : t("Sem destino: este acontecimento deixa a movimentação manual.")}</p>
        {!selectedExists && <p className="text-xs text-amber-700">{t("O destino salvo não existe mais. Escolha uma etapa ativa ou deixe sem movimentação.")}</p>}
      </div>
    );
  }

  return (
    <section className="space-y-4 rounded-lg border border-primary/20 bg-primary/[0.02] p-4" aria-labelledby={`flow-${pipelineId}`}>
      <header className="space-y-1">
        <h3 id={`flow-${pipelineId}`} className="text-sm font-semibold">{t("O que faz o lead avançar")}</h3>
        <p className="text-xs text-muted-foreground">{t("Descreva cada etapa e escolha quais acontecimentos do sistema movem o card. Sem destino, o movimento fica manual.")}</p>
      </header>

      <PipelineAgentSetup pipelineId={pipelineId} />

      <div className="grid gap-3 lg:grid-cols-3">
        {config.stages.map((stage) => (
          <div key={stage.id} className="space-y-2 rounded-md border bg-background p-3">
            <Label htmlFor={`purpose-${stage.id}`}>{stage.name}</Label>
            <p className="text-xs text-muted-foreground">{stage.agent_stage_hint ? `${t("Passo do agente:")} ${t(ROTULO_DO_PASSO[stage.agent_stage_hint])}.` : t("Sem passo associado do agente; a equipe pode mover manualmente.")}</p>
            <Textarea id={`purpose-${stage.id}`} maxLength={280} rows={3} value={config.stage_guidance[stage.id]?.purpose ?? ""} onChange={(e) => updatePurpose(stage.id, e.target.value)} />
            <p className="text-right text-[11px] text-muted-foreground">{config.stage_guidance[stage.id]?.purpose.length ?? 0}/280</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {destinoField("appointment_pending", t("Agendamento solicitado"), t("Quando a agenda recebe uma solicitação, enviar para esta etapa aberta."))}
        {destinoField("appointment_confirmed", t("Agendamento confirmado"), t("Quando a agenda confirma, enviar para a etapa escolhida. Etapa de ganho também encerra o lead."))}
        {destinoField("human_handoff", t("Atendimento transferido para uma pessoa"), t("Ao ocorrer um handoff, enviar para a etapa escolhida; a atribuição do responsável continua sendo a configuração de equipe."))}
      </div>

      {confirmadoGanha && (
        <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
          <Warning size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>{t("A etapa escolhida para agendamento confirmado está marcada como ganho. Confirmar pela agenda encerrará a oportunidade como ganha.")}</span>
        </p>
      )}

      {query.data?.reconciliation_preview && (
        <ReconciliationPanel pipelineId={pipelineId} preview={query.data.reconciliation_preview} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{nomeDaEtapa(config.event_stage_ids.appointment_confirmed) ? `${t("Agenda confirmada leva para:")} ${nomeDaEtapa(config.event_stage_ids.appointment_confirmed)}.` : t("A confirmação de agenda não move o lead até você escolher um destino.")}</p>
        <Button disabled={save.isPending || config.stages.some((s) => !config.stage_guidance[s.id]?.purpose.trim())} onClick={() => save.mutate({ stage_guidance: config.stage_guidance, event_stage_ids: config.event_stage_ids })}>
          <Check size={16} className="mr-2" aria-hidden />{save.isPending ? t("Salvando…") : t("Salvar regras do funil")}
        </Button>
      </div>
    </section>
  );
}

function ReconciliationPanel({ preview, pipelineId }: { preview: ReconciliationPreview; pipelineId: string }) {
  const t = useT();
  if (!preview.available) {
    return <p className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-muted-foreground">{t("Não foi possível conferir os negócios antigos agora. As regras do funil continuam disponíveis; atualize a tela para tentar a revisão novamente.")}</p>;
  }
  if (preview.proposals.length === 0 && preview.ambiguous.length === 0 && !preview.truncated) return null;

  return (
    <section className="space-y-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-4" aria-labelledby={`revisao-${pipelineId}`}>
      <header className="space-y-1">
        <h4 id={`revisao-${pipelineId}`} className="text-sm font-semibold">{t("Oportunidades antigas para revisar")}</h4>
        <p className="text-xs text-muted-foreground">{t("Esta é apenas uma sugestão baseada em compromissos já existentes. Nada foi movido, nenhum agendamento será repetido e nenhuma automação foi disparada. Revise o caso antes de mover o card no quadro.")}</p>
      </header>
      {preview.proposals.map((proposal) => (
        <article key={proposal.lead_id} className="flex flex-col gap-2 rounded-md border bg-background p-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1 text-sm">
            <p className="font-medium">{proposal.lead_title}: {proposal.current_stage_name} → {proposal.suggested_stage_name}</p>
            <p className="text-xs text-muted-foreground">{proposal.appointment_title} · {proposal.appointment_status === "confirmed" ? t("confirmado") : t("solicitado")} · {new Date(proposal.appointment_starts_at).toLocaleString()}</p>
          </div>
          <Button asChild variant="outline" size="sm"><Link href={`/app/pipelines/${encodeURIComponent(pipelineId)}?lead=${encodeURIComponent(proposal.lead_id)}`}>{t("Revisar no quadro")}</Link></Button>
        </article>
      ))}
      {preview.ambiguous.map((item, index) => (
        <div key={`${item.reason}-${index}`} className="rounded-md border bg-background p-3 text-sm">
          <p className="font-medium">{item.reason === "multiple_open_leads" ? t("Mais de uma oportunidade aberta para o contato") : t("Mais de um compromisso ativo para o contato")}</p>
          <p className="text-xs text-muted-foreground">{t("O sistema não sugere uma movimentação para evitar escolher o negócio ou agendamento errado.")}</p>
          <p className="mt-1 text-xs">{t("Oportunidades:")} {item.lead_titles.join(", ")} · {t("Compromissos:")} {item.appointment_titles.join(", ")}</p>
        </div>
      ))}
      {preview.truncated && <p className="text-xs text-muted-foreground">{t("A lista é parcial. Contatos cuja consulta ficou incompleta não recebem sugestão; revise os demais negócios no quadro.")}</p>}
    </section>
  );
}
