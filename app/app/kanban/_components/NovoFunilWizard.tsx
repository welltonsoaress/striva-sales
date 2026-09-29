"use client";

import Link from "next/link";
import { PipelineAgentSetup } from "@/components/pipelines/PipelineAgentSetup";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/hooks/i18n/useT";
import { LEAD_STAGES, type LeadStage } from "@/lib/agent-engine/agent/lead-state";
import { ROTULO_DO_PASSO, EXPLICACAO_DO_PASSO } from "@/lib/leads/agent-mapping";
import { MAX_ETAPAS, MIN_ETAPAS, validarProposta, type EtapaProposta } from "@/lib/onboarding/proposta-de-funil";
import { PACOTES } from "@/lib/onboarding/pacotes-de-funil";
import type { CriarFunilInput } from "@/lib/pipelines/template-input";
import { Plus, Trash } from "@/lib/ui/icons";

const MANUAL = "__manual__";
export type { CriarFunilInput } from "@/lib/pipelines/template-input";
const SEM_DESTINO = "__sem_destino__";
type ChavesDeDestino = { appointment_pending: string | null; appointment_confirmed: string | null; human_handoff: string | null };
export type NovaEtapaDeFunil = EtapaProposta;

export function NovoFunilWizard({
  open,
  onOpenChange,
  disabled,
  onCreate,
  error,
  createdPipeline,
}: {
  error?: string | null;
  createdPipeline?: { id: string; name: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
  onCreate: (input: CriarFunilInput) => void;
}) {
  const t = useT();
  const [modelo, setModelo] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [etapas, setEtapas] = useState<NovaEtapaDeFunil[]>([]);
  const [destinosAgenda, setDestinosAgenda] = useState<ChavesDeDestino>({ appointment_pending: null, appointment_confirmed: null, human_handoff: null });
  const [erroEtapas, setErroEtapas] = useState<string | null>(null);

  function escolherModelo(id: string) {
    setModelo(id);
    setErroEtapas(null);
    if (id === "basico") {
      setNome("");
      setEtapas([]);
      setDestinosAgenda({ appointment_pending: null, appointment_confirmed: null, human_handoff: null });
      return;
    }
    const pacote = PACOTES.find((item) => item.id === id);
    if (!pacote) return;
    setNome(t(pacote.proposta.nome));
    setEtapas(pacote.proposta.etapas.map((stage) => ({
      ...stage,
      nome: t(stage.nome),
      orientacao: stage.orientacao ? t(stage.orientacao) : undefined,
    })));
    setDestinosAgenda({
      appointment_pending: pacote.destinosDeAgendamento?.pending ?? null,
      appointment_confirmed: pacote.destinosDeAgendamento?.confirmed ?? null,
      human_handoff: null,
    });
  }

  const proposta = useMemo(() => ({ nome: nome.trim(), etapas }), [nome, etapas]);
  const validacao = modelo && modelo !== "basico" ? validarProposta(proposta) : { ok: true as const, proposta };
  const podeCriar = !!modelo && !!nome.trim() && !disabled && validacao.ok && etapas.every((etapa) => etapa.nome.trim() && etapa.orientacao?.trim());

  function atualizarEtapa(i: number, patch: Partial<NovaEtapaDeFunil>) {
    setEtapas((atual) => atual.map((etapa, indice) => indice === i ? { ...etapa, ...patch } : etapa));
    setErroEtapas(null);
  }

  function criar() {
    if (!modelo || !podeCriar) return;
    if (modelo === "basico") {
      onCreate({ name: nome.trim() });
      return;
    }
    const pacote = PACOTES.find((item) => item.id === modelo);
    if (!pacote) return;
    const checagem = validarProposta(proposta);
    if (!checagem.ok) {
      setErroEtapas(checagem.erros.join(" "));
      return;
    }
    onCreate({
      name: nome.trim(),
      template_id: modelo,
      stages: etapas.map(({ nome: stageName, ...etapa }) => ({ name: stageName, ...etapa })),
      event_stage_keys: destinosAgenda,
    });
  }

  function fechar(next: boolean) {
    if (disabled) return;
    if (!next) {
      setModelo(null);
      setNome("");
      setEtapas([]);
      setDestinosAgenda({ appointment_pending: null, appointment_confirmed: null, human_handoff: null });
      setErroEtapas(null);
    }
    onOpenChange(next);
  }

  const selectedPackage = PACOTES.find((item) => item.id === modelo);
  const eventosComDestino = [
    {
      key: "appointment_pending" as const,
      label: t("Solicitação de horário"),
      description: t("Quando um horário for solicitado, mover para esta etapa aberta."),
    },
    {
      key: "appointment_confirmed" as const,
      label: t("Agendamento confirmado"),
      description: t("Quando a agenda confirmar, mover para a etapa escolhida."),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={fechar}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Criar funil para o seu negócio")}</DialogTitle>
          <DialogDescription>{t("Escolha um modelo e revise as etapas. Depois de criar, libere o funil para o agente e publique a configuração dele.")}</DialogDescription>
        </DialogHeader>

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {createdPipeline ? <div className="space-y-4">
          <p>{t("Funil criado:")} <strong>{createdPipeline.name}</strong></p>
          <PipelineAgentSetup pipelineId={createdPipeline.id} />
          <Button asChild variant="outline"><Link href={`/app/pipelines/${encodeURIComponent(createdPipeline.id)}`}>{t("Abrir quadro")}</Link></Button>
        </div> : !modelo ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {PACOTES.map((pacote) => (
              <button key={pacote.id} type="button" onClick={() => escolherModelo(pacote.id)} className="rounded-lg border p-4 text-left transition hover:border-primary hover:bg-muted/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring">
                <span className="font-medium">{t(pacote.comoSeApresenta)}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{t(pacote.descricao)}</span>
                <span className="mt-3 block text-xs leading-relaxed text-muted-foreground">{pacote.proposta.etapas.map((etapa) => etapa.nome).join(" → ")}</span>
              </button>
            ))}
            <button type="button" onClick={() => escolherModelo("basico")} className="rounded-lg border border-dashed p-4 text-left transition hover:border-primary hover:bg-muted/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring">
              <span className="font-medium">{t("Básico personalizável")}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{t("Comece com as quatro etapas atuais e associe os passos depois.")}</span>
              <span className="mt-3 block text-xs text-muted-foreground">{t("Novo → Em andamento → Ganho → Perdido")}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{t(selectedPackage?.comoSeApresenta ?? "Básico personalizável")}</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => setModelo(null)} disabled={disabled}>{t("Trocar modelo")}</Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nome-novo-funil">{t("Nome do funil")}</Label>
              <Input id="nome-novo-funil" data-testid="nome-do-novo-funil" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} autoFocus />
            </div>

            {modelo === "basico" ? (
              <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">{t("O funil começa com quatro etapas básicas. Depois de criar, você poderá renomear, reordenar e associar cada etapa ao agente e aos acontecimentos do sistema.")}</p>
            ) : (
              <>
                {selectedPackage && <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  <h3 className="font-medium">{t("Ações sugeridas para completar o fluxo")}</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                    {selectedPackage.sugestoes.map((sugestao) => <li key={sugestao}>{t(sugestao)}</li>)}
                  </ul>
                </div>}
                {selectedPackage && (
                  <div className="space-y-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
                    <div>
                      <h3 className="text-sm font-medium">{t("Acontecimentos que movem este lead")}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{t("Revise os destinos da agenda e da transferência antes de criar. Deixe sem destino se preferir movimentar manualmente.")}</p>
                    </div>
                    {eventosComDestino.map(({ key, label, description }) => {
                      const destino = destinosAgenda[key];
                      const etapaDestino = etapas.find((etapa) => etapa.chave === destino);
                      return (
                        <div key={key} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.8fr)] sm:items-center">
                          <div>
                            <Label htmlFor={`destino-${key}`}>{t(label)}</Label>
                            <p className="text-xs text-muted-foreground">{t(description)}</p>
                          </div>
                          <Select value={destino ?? SEM_DESTINO} onValueChange={(value) => setDestinosAgenda((atual) => ({ ...atual, [key]: value === SEM_DESTINO ? null : value }))}>
                            <SelectTrigger id={`destino-${key}`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value={SEM_DESTINO}>{t("Não mover automaticamente")}</SelectItem>
                              {etapas.filter((etapa) => etapa.chave && (key !== "appointment_pending" || (etapa.passo !== "won" && etapa.passo !== "lost")) && (key !== "appointment_confirmed" || etapa.passo !== "lost")).map((etapa) => (
                                <SelectItem key={etapa.chave} value={etapa.chave!}>{t(etapa.nome)}{etapa.passo === "won" ? ` — ${t("encerra como ganho")}` : ""}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {key === "appointment_confirmed" && etapaDestino?.passo === "won" && <p className="text-xs text-amber-800 sm:col-start-2">{t("Este destino encerra o lead como ganho quando o agendamento for confirmado.")}</p>}
                        </div>
                      );
                    })}
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.8fr)] sm:items-center">
                      <div>
                        <Label htmlFor="destino-human-handoff">{t("Atendimento transferido para uma pessoa")}</Label>
                        <p className="text-xs text-muted-foreground">{t("Escolha para onde mover quando o agente transferir o atendimento. Sem destino, a equipe move manualmente.")}</p>
                      </div>
                      <Select value={destinosAgenda.human_handoff ?? SEM_DESTINO} onValueChange={(value) => setDestinosAgenda((atual) => ({ ...atual, human_handoff: value === SEM_DESTINO ? null : value }))}>
                        <SelectTrigger id="destino-human-handoff"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SEM_DESTINO}>{t("Não mover automaticamente")}</SelectItem>
                          {etapas.filter((etapa) => etapa.chave && etapa.passo !== "won" && etapa.passo !== "lost").map((etapa) => <SelectItem key={etapa.chave} value={etapa.chave!}>{t(etapa.nome)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">{t("Etapas e regras de avanço")}</h3>
                  {etapas.map((etapa, i) => {
                    const usados = new Set(etapas.filter((_, indice) => indice !== i).flatMap((outra) => outra.passo ? [outra.passo] : []));
                    return (
                      <div key={etapa.chave ?? i} className="grid gap-3 rounded-md border p-3 md:grid-cols-[minmax(0,1fr)_13rem_auto]">
                        <div className="space-y-2">
                          <Label htmlFor={`stage-name-${i}`}>{t("Etapa")} {i + 1}</Label>
                          <Input id={`stage-name-${i}`} value={etapa.nome} maxLength={80} onChange={(e) => atualizarEtapa(i, { nome: e.target.value })} />
                          <p className="text-xs text-muted-foreground">{etapa.passo ? `${t("O agente pode mover para cá quando")} ${t(EXPLICACAO_DO_PASSO[etapa.passo])}.` : t("Esta etapa será movimentada manualmente pela equipe.")}</p>
                          <Label htmlFor={`stage-purpose-${i}`}>{t("Quando o negócio deve entrar aqui")}</Label>
                          <Textarea id={`stage-purpose-${i}`} rows={2} maxLength={280} value={etapa.orientacao ?? ""} placeholder={t("Descreva uma situação fácil de reconhecer.")} onChange={(e) => atualizarEtapa(i, { orientacao: e.target.value })} />
                          {!etapa.orientacao?.trim() && <p className="text-xs text-amber-700">{t("Escreva quando o negócio deve chegar nesta etapa.")}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`stage-role-${i}`}>{t("O que faz o agente")}</Label>
                          <Select value={etapa.passo ?? MANUAL} onValueChange={(value) => atualizarEtapa(i, { passo: value === MANUAL ? null : value as LeadStage })}>
                            <SelectTrigger id={`stage-role-${i}`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value={MANUAL}>{t("Só movimento manual")}</SelectItem>
                              {LEAD_STAGES.filter((passo) => !usados.has(passo)).map((passo) => <SelectItem key={passo} value={passo}>{t(ROTULO_DO_PASSO[passo])}{passo === "won" ? ` — ${t("encerra como ganho")}` : passo === "lost" ? ` — ${t("encerra como perdido")}` : ""}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button type="button" variant="ghost" size="icon" aria-label={`${t("Remover etapa")} ${i + 1}`} onClick={() => {
                          const chave = etapa.chave;
                          setEtapas((atual) => atual.filter((_, indice) => indice !== i));
                          if (chave) setDestinosAgenda((atual) => ({ appointment_pending: atual.appointment_pending === chave ? null : atual.appointment_pending, appointment_confirmed: atual.appointment_confirmed === chave ? null : atual.appointment_confirmed, human_handoff: atual.human_handoff === chave ? null : atual.human_handoff }));
                        }} disabled={etapas.length <= MIN_ETAPAS}>
                          <Trash size={16} aria-hidden />
                        </Button>
                      </div>
                    );
                  })}
                  <Button type="button" variant="outline" size="sm" onClick={() => setEtapas((atual) => {
                    const novas = [...atual];
                    const corte = novas.findIndex((etapa) => etapa.passo === "won" || etapa.passo === "lost");
                    novas.splice(corte < 0 ? novas.length : corte, 0, { nome: "", passo: null, chave: `custom_${Date.now().toString(36)}_${atual.length}` });
                    return novas;
                  })} disabled={etapas.length >= MAX_ETAPAS}>
                    <Plus size={16} className="mr-2" aria-hidden />{t("Adicionar etapa")}
                  </Button>
                  {erroEtapas && <p role="alert" className="text-sm text-destructive">{t(erroEtapas)}</p>}
                  {!validacao.ok && <p className="text-sm text-amber-700">{t(validacao.erros.join(" "))}</p>}
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => fechar(false)} disabled={disabled}>{createdPipeline ? t("Concluir") : t("Cancelar")}</Button>
          {modelo && !createdPipeline && <Button type="button" data-testid="confirmar-novo-funil" onClick={criar} disabled={!podeCriar}>{disabled ? t("Criando…") : t("Criar funil")}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
