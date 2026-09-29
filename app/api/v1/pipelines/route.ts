import { requireSupportWrite } from "@/lib/impersonate/support";
/**
 * GET /api/v1/pipelines — lista os funis da org ativa (nome + slug), RLS-scoped.
 * Existia só o handler interno (usado pelo MCP); expõe REST pro Select de
 * pipeline do CreateSourceDialog (feature Webhooks).
 *
 * POST /api/v1/pipelines — cria um funil COM as etapas com que ele nasce.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { ok, fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import {
  ETAPAS_INICIAIS,
  posicaoEntre,
  slugDeFunil,
  validarNomeDeFunil,
  type FunilEditavel,
} from "@/lib/pipelines/pipeline-editing";
import { PACOTES } from "@/lib/onboarding/pacotes-de-funil";
import { normalizarProposta, validarProposta, etapasParaGravar } from "@/lib/onboarding/proposta-de-funil";
import { EXPLICACAO_DO_PASSO } from "@/lib/leads/agent-mapping";
import { slugDeNome } from "@/lib/leads/stage-editing";
import { createClient } from "@/lib/supabase/server";
import { conflitoDoBanco, corpo, lerFunis } from "./_funis";
import { listPipelinesHandler } from "./_handler";
import { traduzir } from "@/lib/i18n/dicionario";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "pipelines" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);

  const supabase = await createClient();
  try {
    const { pipelines } = await listPipelinesHandler(supabase, {
      organization_id: authz.org.orgId,
      actor: { type: "user", id: authz.user.id },
      requestId,
    });
    return ok(pipelines, { requestId });
  } catch {
    return fail("internal_error", t("Falha ao listar funis."), 500, { requestId });
  }
}

// `.max(80)`: o nome é o título de uma linha da lista e o topo do quadro, não um
// parágrafo. O banco não limita, mas a tela quebra muito antes disso.
const bodySchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    description: z.string().max(280).nullable().optional(),
    template_id: z.string().max(40).optional(),
    stages: z.array(z.object({
      name: z.string().trim().min(1).max(80),
      passo: z.enum(["new", "contacted", "qualifying", "qualified", "negotiating", "won", "lost"]).nullable(),
      chave: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/).optional(),
      orientacao: z.string().trim().min(1).max(280).optional(),
    }).strict()).min(4).max(8).optional(),
    event_stage_keys: z.object({
      appointment_pending: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/).nullable(),
      appointment_confirmed: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/).nullable(),
      human_handoff: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/).nullable(),
    }).strict().optional(),
  })
  .strict();

/** As etapas com que o funil nasce, já com a régua de posição do board. */
function etapasIniciais(orgId: string, pipelineId: string) {
  return ETAPAS_INICIAIS.map((etapa, i) => ({
    organization_id: orgId,
    pipeline_id: pipelineId,
    name: etapa.name,
    slug: etapa.slug,
    position: (i + 1) * 1000,
    is_won: etapa.is_won,
    is_lost: etapa.is_lost,
  }));
}

export async function POST(req: NextRequest): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_pipelines" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const orgId = authz.org.orgId;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return fail("unprocessable_entity", t("Dê um nome ao funil — é o que aparece na lista."), 422, {
      requestId,
      details: parsed.error.flatten(),
    });
  }
  const name = parsed.data.name.trim();
  const description = parsed.data.description?.trim() || null;
  const pacote = parsed.data.template_id ? PACOTES.find((p) => p.id === parsed.data.template_id) : null;
  if (parsed.data.template_id && !pacote) {
    return fail("unprocessable_entity", t("Esse modelo de funil não está disponível. Escolha um modelo da lista."), 422, { requestId });
  }
  if (parsed.data.stages && !pacote) {
    return fail("unprocessable_entity", t("As etapas personalizadas precisam partir de um modelo selecionado."), 422, { requestId });
  }

  const proposta = pacote
    ? normalizarProposta({
        nome: name,
        etapas: parsed.data.stages?.map(({ name: stageName, ...etapa }) => ({ nome: stageName, ...etapa })) ?? pacote.proposta.etapas,
      })
    : null;
  if (proposta) {
    const passos = (parsed.data.stages ?? pacote!.proposta.etapas.map(({ nome: stageName, ...etapa }) => ({ name: stageName, ...etapa }))).flatMap((etapa) => etapa.passo ? [etapa.passo] : []);
    if (new Set(passos).size !== passos.length) {
      return fail("unprocessable_entity", t("Cada etapa pode representar um passo diferente do agente. Remova a associação repetida."), 422, { requestId });
    }
    const validacao = validarProposta(proposta);
    if (!validacao.ok) return fail("unprocessable_entity", t(validacao.erros.join(" ")), 422, { requestId });
    if (proposta.etapas.length !== (parsed.data.stages ?? pacote!.proposta.etapas.map(({ nome: stageName, ...etapa }) => ({ name: stageName, ...etapa }))).length) {
      return fail("unprocessable_entity", t("Há nomes ou passos repetidos nas etapas. Ajuste antes de criar o funil."), 422, { requestId });
    }
    const chavesPermitidas = new Set(pacote!.proposta.etapas.flatMap((e) => e.chave ? [e.chave] : []));
    const chavesEnviadas = proposta.etapas.flatMap((e) => e.chave ? [e.chave] : []);
    if (chavesEnviadas.some((chave) => !chavesPermitidas.has(chave) && !chave.startsWith("custom_")) || new Set(chavesEnviadas).size !== chavesEnviadas.length) {
      return fail("unprocessable_entity", t("Uma ligação interna do modelo mudou. Selecione o modelo novamente."), 422, { requestId });
    }
    const destinos = parsed.data.event_stage_keys ?? {
      appointment_pending: pacote!.destinosDeAgendamento?.pending ?? null,
      appointment_confirmed: pacote!.destinosDeAgendamento?.confirmed ?? null,
      human_handoff: null,
    };
    const chaves = new Set(chavesEnviadas);
    if ([destinos.appointment_pending, destinos.appointment_confirmed, destinos.human_handoff].some((chave) => chave !== null && !chaves.has(chave))) {
      return fail("unprocessable_entity", t("Escolha uma etapa existente para cada acontecimento da agenda, ou deixe sem movimentação."), 422, { requestId });
    }
    const etapaSolicitada = proposta.etapas.find((etapa) => etapa.chave === destinos.appointment_pending);
    const etapaConfirmada = proposta.etapas.find((etapa) => etapa.chave === destinos.appointment_confirmed);
    const etapaHandoff = proposta.etapas.find((etapa) => etapa.chave === destinos.human_handoff);
    if (etapaSolicitada && (etapaSolicitada.passo === "won" || etapaSolicitada.passo === "lost")) {
      return fail("unprocessable_entity", t("Uma solicitação de horário precisa ir para uma etapa em andamento."), 422, { requestId });
    }
    if (etapaConfirmada?.passo === "lost") {
      return fail("unprocessable_entity", t("Um agendamento confirmado não pode levar a uma etapa de perda."), 422, { requestId });
    }
    if (etapaHandoff && (etapaHandoff.passo === "won" || etapaHandoff.passo === "lost")) {
      return fail("unprocessable_entity", t("Uma transferência para uma pessoa precisa ir para uma etapa em andamento."), 422, { requestId });
    }
  }

  const supabase = await createClient();

  let funis: FunilEditavel[];
  try {
    funis = await lerFunis(supabase, orgId);
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }

  // ⚠️ VALIDAR ANTES DE TOCAR O BANCO. O índice único é a rede de segurança, não
  // a primeira linha: um 23505 cru não diz QUAL funil já tem esse nome.
  const veredito = validarNomeDeFunil(name, funis, null);
  if (!veredito.ok) return fail("unprocessable_entity", veredito.erro, 422, { requestId });

  const row = {
    organization_id: orgId,
    name,
    description,
    // Arquivados entram na conta do slug: `uniq_crm_pipelines_org_slug` não é parcial.
    slug: slugDeFunil(name, funis.map((f) => f.slug)),
    // No fim da lista: funil novo aparecendo no meio seria a tela decidindo por
    // quem criou. `lerFunis` vem ordenado.
    position: posicaoEntre(funis[funis.length - 1]?.position ?? null, null),
    // ⚠️ O PRIMEIRO FUNIL DA ORGANIZAÇÃO NASCE PADRÃO. Numa instalação onde o
    // gatilho de seed não rodou, a org fica sem padrão nenhum — e todo lead
    // criado sem funil escolhido não teria para onde ir. `uniq_..._org_default`
    // é parcial, então só os ativos disputam esse lugar.
    is_default: funis.filter((f) => !f.is_archived).length === 0,
  };

  const { data: criado, error } = await supabase
    .from("crm_pipelines")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    const conflito = conflitoDoBanco(error as { code?: string }, name, requestId);
    if (conflito) return conflito;
    return fail("internal_error", error.message, 500, { requestId });
  }
  const pipelineId = (criado as { id: string }).id;

  const etapasDoTemplate = proposta && pacote
    ? etapasParaGravar(proposta, slugDeNome).map((etapa, i) => ({
        organization_id: orgId,
        pipeline_id: pipelineId,
        name: etapa.nome,
        slug: etapa.slug,
        position: etapa.position,
        is_won: etapa.is_won,
        is_lost: etapa.is_lost,
        agent_stage_hint: etapa.agent_stage_hint,
        chave: proposta.etapas[i]?.chave,
        orientacao: proposta.etapas[i]?.orientacao ?? (etapa.agent_stage_hint ? EXPLICACAO_DO_PASSO[etapa.agent_stage_hint] : "Movida manualmente pela equipe quando esta etapa representar a situação do negócio."),
      }))
    : etapasIniciais(orgId, pipelineId);

  const etapasParaInserir = etapasDoTemplate as Array<{
    organization_id: string;
    pipeline_id: string;
    name: string;
    slug: string;
    position: number;
    is_won: boolean;
    is_lost: boolean;
    agent_stage_hint?: string | null;
    chave?: string;
    orientacao?: string;
  }>;
  const { data: etapasCriadas, error: etapasErr } = await supabase
    .from("crm_stages")
    .insert(etapasParaInserir.map(({ chave: _chave, orientacao: _orientacao, ...etapa }) => etapa))
    .select("id, name, agent_stage_hint");

  // ⚠️ COMPENSAÇÃO, PORQUE SÃO DUAS ESCRITAS SEM TRANSAÇÃO. Um funil sem etapa é
  // quadro morto: o board abre sem coluna nenhuma, não recebe negócio, e quem
  // criou não tem como saber que aquilo nasceu quebrado. O funil recém-criado
  // ainda não tem negócio, então `crm_leads_pipeline_id_fkey ON DELETE RESTRICT`
  // não atrapalha o desfazimento. A alternativa correta-por-construção seria uma
  // função SQL transacional — que custaria migration + apêndice no baseline para
  // um caso que estas três linhas cobrem.
  if (etapasErr) {
    await supabase
      .from("crm_pipelines")
      .delete()
      .eq("id", pipelineId)
      .eq("organization_id", orgId);
    return fail(
      "internal_error",
      `Não consegui criar as etapas de «${name}». Nada foi salvo — tente de novo.`,
      500,
      { requestId, details: { erro: etapasErr.message } },
    );
  }

  if (proposta && pacote) {
    const etapasInseridas = (etapasCriadas ?? []) as Array<{ id: string; name: string; agent_stage_hint: string | null }>;
    const porNome = new Map(etapasInseridas.map((etapa) => [etapa.name, etapa]));
    const orientacao: Record<string, { purpose: string }> = {};
    proposta.etapas.forEach((etapa) => {
      const criada = porNome.get(etapa.nome);
      if (criada) {
        const purpose = etapa.orientacao ?? (etapa.passo ? EXPLICACAO_DO_PASSO[etapa.passo] : "Movida manualmente pela equipe quando esta etapa representar a situação do negócio.");
        orientacao[criada.id] = { purpose };
      }
    });
    const eventStageIds: Record<string, string | null> = { appointment_pending: null, appointment_confirmed: null, human_handoff: null };
    const destinos = parsed.data.event_stage_keys ?? {
      appointment_pending: pacote.destinosDeAgendamento?.pending ?? null,
      appointment_confirmed: pacote.destinosDeAgendamento?.confirmed ?? null,
      human_handoff: null,
    };
    for (const [evento, chave] of Object.entries(destinos)) {
      const indice = chave ? proposta.etapas.findIndex((etapa) => etapa.chave === chave) : -1;
      const etapa = indice >= 0 ? proposta.etapas[indice] : null;
      const criada = etapa ? porNome.get(etapa.nome) : null;
      if (evento === "appointment_pending") eventStageIds.appointment_pending = criada?.id ?? null;
      if (evento === "appointment_confirmed") eventStageIds.appointment_confirmed = criada?.id ?? null;
      if (evento === "human_handoff") eventStageIds.human_handoff = criada?.id ?? null;
    }
    const { error: configErr } = await supabase
      .from("crm_pipelines")
      .update({ settings: { flow: { stage_guidance: orientacao, event_stage_ids: eventStageIds, template_id: pacote.id } } })
      .eq("id", pipelineId)
      .eq("organization_id", orgId);
    if (configErr) {
      await supabase.from("crm_pipelines").delete().eq("id", pipelineId).eq("organization_id", orgId);
      return fail("internal_error", t("Criei as etapas, mas não consegui guardar o fluxo do modelo. Nada foi salvo; tente de novo."), 500, { requestId });
    }
  }

  void audit({
    action: "pipeline.created",
    actorUserId: authz.user.id,
    organizationId: orgId,
    resourceType: "crm_pipeline",
    resourceId: pipelineId,
    requestId,
    metadata: { name, slug: row.slug, is_default: row.is_default, template_id: pacote?.id ?? null },
  });

  // Relê em vez de espelhar o que foi pedido: a tela mostra o que o banco tem.
  try {
    const depois = await lerFunis(supabase, orgId);
    return ok(corpo(depois), { status: 201, requestId });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
