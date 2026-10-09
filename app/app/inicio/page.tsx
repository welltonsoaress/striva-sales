import { redirect } from "next/navigation";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { carregarAreaDeTrabalho } from "@/lib/onboarding/area-de-trabalho";
import { Inicio } from "./_client";
import { commercialAccountSnapshot } from "@/lib/billing/managed-ai-server";
import { ResponseBalance } from "@/components/billing/ResponseBalance";
import { carregarOperacaoInicial } from "@/lib/onboarding/operacao-inicial";

export const dynamic = "force-dynamic";
export const metadata = { title: "Início" };

export default async function InicioPage() {
  const user = await requireAuth();
  const org = await resolveActiveOrg(user);
  if (!org) redirect("/get-started");
  // A visão de configuração pertence à administração. Demais papéis recebem
  // os atalhos de trabalho, sem ler composição financeira ou dados da equipe.
  const area =
    org.role === "admin" && !user.support ? await carregarAreaDeTrabalho(org.orgId) : null;
  const snapshot = area ? await commercialAccountSnapshot(org.orgId) : null;
  const operacao = await carregarOperacaoInicial(org.orgId);
  return (
    <>
      <div className="mx-auto max-w-7xl px-5 pt-6 md:px-8">
        {snapshot && <ResponseBalance account={snapshot.account} checkedAt={snapshot.checked_at} />}
      </div>
      <Inicio
        nome={user.full_name}
        organizacao={org.name}
        role={org.role}
        area={area}
        operacao={operacao}
      />
    </>
  );
}
