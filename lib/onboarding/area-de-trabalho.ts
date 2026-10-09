import { createClient } from "@/lib/supabase/server";
import { listSelectableChannels } from "@/lib/channels/selectable";
import { loadOnboardingState } from "@/app/actions/onboarding/_shared";
import { logger } from "@/lib/logger";
import { progressoInicial } from "./progresso-inicial";

export async function carregarAreaDeTrabalho(organizationId: string) {
  const db = await createClient();
  const results = await Promise.allSettled([
    loadOnboardingState(organizationId),
    listSelectableChannels(db, organizationId),
    db.from("ai_agents").select("id, published_version_id").eq("organization_id", organizationId),
    db.from("crm_pipelines").select("id").eq("organization_id", organizationId),
    db
      .from("user_organizations")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("revoked_at", null)
      .not("accepted_at", "is", null),
    db
      .from("organization_ai_accounts")
      .select("mode")
      .eq("organization_id", organizationId)
      .maybeSingle(),
  ]);
  const [onboarding, canais, agentes, funis, equipe, conta] = results;
  const state = onboarding.status === "fulfilled" ? onboarding.value.state : {};
  const canaisLidos = canais.status === "fulfilled" ? canais.value : null;
  const agentesLidos =
    agentes.status === "fulfilled" && !agentes.value.error ? agentes.value.data : null;
  const funisLidos = funis.status === "fulfilled" && !funis.value.error ? funis.value.data : null;
  const equipeLida =
    equipe.status === "fulfilled" && !equipe.value.error ? equipe.value.count : null;
  const contaLida = conta.status === "fulfilled" && !conta.value.error ? conta.value.data : null;
  const incompleto =
    onboarding.status === "rejected" ||
    canaisLidos === null ||
    agentesLidos === null ||
    funisLidos === null ||
    equipeLida === null ||
    conta.status === "rejected" ||
    (conta.status === "fulfilled" && !!conta.value.error);
  if (incompleto) logger.warn("workspace_snapshot_incomplete", { organization_id: organizationId });
  return {
    progresso: progressoInicial(
      state,
      {
        negocio: onboarding.status === "fulfilled" && !!onboarding.value.onboardedAt,
        whatsapp: canaisLidos?.some((canal) => canal.status === "WORKING"),
        agente: agentesLidos?.some((agente) => !!agente.published_version_id),
        funil: !!funisLidos?.length,
      },
      { managed: contaLida?.mode === "platform" },
    ),
    incompleto,
    canais: canaisLidos?.length ?? null,
    canaisConectados: canaisLidos?.filter((canal) => canal.status === "WORKING").length ?? null,
    agentes: agentesLidos?.length ?? null,
    equipe: equipeLida,
  };
}
