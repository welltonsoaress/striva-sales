import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { WelcomeForm } from "./_form";
import { branding } from "@/lib/branding";
import { createClient } from "@/lib/supabase/server";
import { lerRetratoDaInstalacao } from "@/lib/instalacao/retrato";
import { JaEstaPronto } from "../_components/JaEstaPronto";
import { traduzir } from "@/lib/i18n/dicionario";
import { commercialAccount } from "@/lib/billing/managed-ai-server";
import { businessSegmentHint } from "@/lib/onboarding/segment-hint";
import { onboardingStateSchema } from "@/lib/schemas/onboarding";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) redirect("/login");
  const idioma = user.idioma;

  const supabase = await createClient();
  const [{data:{user:verifiedUser}},{data:orgState,error:orgError},memoryPointer]=await Promise.all([
    supabase.auth.getUser(),
    supabase.from("organizations").select("onboarding_state,timezone").eq("id",activeOrg.orgId).maybeSingle(),
    supabase.from("org_memory_pointers").select("version_id").eq("organization_id",activeOrg.orgId).maybeSingle(),
  ]);
  const memoryVersion = memoryPointer.data?.version_id
    ? await supabase.from("org_memory_versions").select("content")
        .eq("organization_id", activeOrg.orgId).eq("id", memoryPointer.data.version_id).maybeSingle()
    : null;
  const saved=onboardingStateSchema.safeParse(orgState?.onboarding_state);
  const suggestedSegment=(saved.success?saved.data.welcome?.business_segment:undefined)??businessSegmentHint(verifiedUser?.user_metadata?.business_segment);
  const savedWelcome = saved.success ? saved.data.welcome : undefined;
  const initialDescription = memoryVersion?.data?.content ?? savedWelcome?.business_description ?? savedWelcome?.o_que_faz ?? "";
  const initialTimezone = orgState?.timezone ?? savedWelcome?.timezone ?? "America/Sao_Paulo";
  const loadFailed = !!orgError || !!memoryPointer.error || !!memoryVersion?.error ||
    (!!memoryPointer.data?.version_id && !memoryVersion?.data);
  const managed = (await commercialAccount(activeOrg.orgId))?.mode === "platform";
  const retrato = managed
    ? null
    : await lerRetratoDaInstalacao({ supabase, orgId: activeOrg.orgId });

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">
          {traduzir("Boas-vindas ao", idioma)} {branding().name}
        </h2>
        <p className="text-sm text-muted-foreground">
          {traduzir(
            managed
              ? "Conte sobre seu negócio. Seu agente já vem preparado, com IA incluída."
              : "Vamos montar quem vai atender seus clientes — e onde ele vai trabalhar.",
            idioma,
          )}
        </p>
      </header>

      {retrato && <JaEstaPronto retrato={retrato} idioma={idioma} />}

      {/*
        O instalador NUNCA pergunta o nome do negócio: toda organização nasce
        "Minha Empresa", hardcoded. Mandar esse texto como valor inicial fazia a
        pessoa ter de apagá-lo antes de escrever o nome dela — e quem não
        percebia seguia com o placeholder no cabeçalho do sistema para sempre.
      */}
      {loadFailed ? (
        <p role="alert">{traduzir("Não foi possível carregar as informações da sua empresa. Recarregue a página antes de editar.", idioma)}</p>
      ) : (
        <WelcomeForm
          defaultOrgName={retrato?.empresa.aindaSemNomeProprio ? "" : activeOrg.name}
          suggestedSegment={suggestedSegment}
          initialDescription={initialDescription}
          initialTimezone={initialTimezone}
        />
      )}
    </div>
  );
}
