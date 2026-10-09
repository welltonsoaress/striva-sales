import { redirect } from "next/navigation";

import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { loadOnboardingState } from "@/app/actions/onboarding/_shared";
import { Stepper } from "./_components/Stepper";
import { OutrasOrganizacoes } from "./_components/OutrasOrganizacoes";
import { SkipToEnd } from "./_components/SkipToEnd";
import { LogotipoDoProduto } from "@/components/branding/MarcaDoProduto";
import { branding, marcaEhADoProduto } from "@/lib/branding";
import { passosVisiveis } from "@/lib/onboarding/passos";
import { env } from "@/lib/env";
import { commercialAccount } from "@/lib/billing/managed-ai-server";
import { IdiomaProvider } from "@/lib/i18n/IdiomaProvider";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  // Acompanhamento observa a organização incompleta no shell com saída explícita.
  if (user.support) redirect("/app/inbox");
  // Sem organização o onboarding não tem o que mostrar — mas mandar para
  // `/login` fechava o círculo: quem entrasse de novo voltaria para cá. A saída
  // é a tela que CRIA a organização que falta.
  if (!activeOrg) redirect("/get-started");
  if (activeOrg.role !== "admin") redirect("/app/inicio");

  const { state } = await loadOnboardingState(activeOrg.orgId);

  // Os passos que ESTA instalação oferece, com o que já foi resolvido. O
  // indicador não decide mais nada sozinho — ele desenha o que recebe.
  const account = await commercialAccount(activeOrg.orgId);
  const passos = passosVisiveis({
    lojaLigada: env.NUVEMSHOP_ENABLED,
    managed: account?.mode === "platform",
  }).map((p) => ({
    segmento: p.segmento,
    rotulo: p.rotulo,
    cumprido: p.cumprido(state),
  }));

  const marca = branding();
  const marcaDoProduto = marcaEhADoProduto(marca);

  return (
    <IdiomaProvider locale={user.locale}>
      <div className="flex min-h-screen flex-col bg-muted/40">
        <header className="border-b bg-background">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {marcaDoProduto && (
                <LogotipoDoProduto
                  nome={marca.name}
                  decorativo
                  className="h-8 w-auto shrink-0 sm:h-9"
                />
              )}
              <div className="min-w-0">
                {!marcaDoProduto && (
                  <p className="text-xs tracking-wider text-muted-foreground uppercase">
                    {marca.name}
                  </p>
                )}
                <h1
                  className="truncate text-sm font-semibold tracking-tight sm:text-lg"
                  title={activeOrg.name}
                >
                  {activeOrg.name}
                </h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {/*
                A SAÍDA, para quem tem outra organização. Ver o cabeçalho de
                `OutrasOrganizacoes`: sem ela, trocar de organização pelo seletor
                do topo levava a um wizard sem porta de volta — o layout de `/app`
                sai da árvore e leva o `TenantSwitcher` junto.
              */}
              <OutrasOrganizacoes
                outras={user.organizations
                  .filter((o) => o.organization_id !== activeOrg.orgId)
                  .map((o) => ({ id: o.organization_id, nome: o.organization_name }))}
              />
              <SkipToEnd />
            </div>
          </div>
          <div className="mx-auto w-full max-w-3xl px-4 pb-2">
            <Stepper passos={passos} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
      </div>
    </IdiomaProvider>
  );
}
