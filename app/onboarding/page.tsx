import { redirect } from "next/navigation";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { loadOnboardingState } from "@/app/actions/onboarding/_shared";
import { proximoPasso } from "@/lib/onboarding/passos";
import { env } from "@/lib/env";
import { progressoInicial } from "@/lib/onboarding/progresso-inicial";
import { commercialAccount } from "@/lib/billing/managed-ai-server";

export const dynamic = "force-dynamic";

/**
 * O roteador do wizard. A ORDEM não mora mais aqui: mora em
 * `lib/onboarding/passos.ts`, junto com os rótulos e o resumo final — eram três
 * listas independentes que discordavam, e a divergência aparecia como um passo
 * "Loja" fantasma no indicador de toda instalação pelo kit.
 */
export default async function OnboardingIndex() {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  // Sem organização o onboarding não tem o que mostrar — mas mandar para
  // `/login` fechava o círculo: quem entrasse de novo voltaria para cá. A saída
  // é a tela que CRIA a organização que falta.
  if (!activeOrg) redirect("/get-started");

  const { state, onboardedAt } = await loadOnboardingState(activeOrg.orgId);
  const account = await commercialAccount(activeOrg.orgId);
  const managed = account?.mode === 'platform';
  if (managed && state.ai?.activated_at) redirect('/app/inicio');
  if (!managed && (onboardedAt || state.dismissed_at)) {
    const progresso = progressoInicial(state);
    redirect(progresso.proxima?.href ?? "/app/inicio");
  }

  const passo = proximoPasso(state, { lojaLigada: env.NUVEMSHOP_ENABLED, managed });
  redirect(passo ? `/onboarding/${passo.segmento}` : "/onboarding/done");
}
