import { redirect } from "next/navigation";

import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { ROLE_RANK } from "@/lib/auth/types";

import { PainelDeProvedores } from "./_components/PainelDeProvedores";
import Link from "next/link";
import { commercialAccountSnapshot } from "@/lib/billing/managed-ai-server";
import { ResponseBalance } from "@/components/billing/ResponseBalance";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireAiPlatformAdmin } from "@/lib/auth/require-ai-platform-admin";

export const dynamic = "force-dynamic";

/**
 * Onde o dono do negócio vê e escolhe qual IA atende cada parte do sistema.
 *
 * O sistema chama modelo em 23 lugares. Até esta tela existir, a escolha estava
 * espalhada por três pilhas de código e sete variáveis de ambiente, e não havia
 * lugar nenhum onde a pergunta "quem usa IA aqui, e com qual chave?" tivesse
 * resposta — o que transformava qualquer falha de configuração em falha muda.
 *
 * Os dados vêm do endpoint (`/api/v1/ai/providers`) e não de uma consulta aqui:
 * a mesma resolução de precedência precisa valer para a tela e para o runtime,
 * e duas leituras diferentes da mesma configuração é como se cria a tela que
 * mente.
 */
export default async function ProvedoresPage() {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) redirect("/app");
  if (ROLE_RANK[activeOrg.role] < ROLE_RANK.manager) redirect("/403");
  const { account, checked_at } = await commercialAccountSnapshot(activeOrg.orgId);
  if (!(await requireAiPlatformAdmin()).ok || account?.mode === "platform") {
    const t = (text: string) => traduzir(text, user.idioma);
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <header>
          <h1 className="text-3xl font-semibold">{t(account?.mode === "platform" ? "IA incluída no seu plano" : "Sua inteligência artificial")}</h1>
          <p className="mt-3 text-muted-foreground">
            {t(
              "A plataforma cuida dos modelos e da conexão. Você só precisa orientar seu agente sobre o seu negócio.",
            )}
          </p>
        </header>
        <ResponseBalance account={account} checkedAt={checked_at} />
        <div className="flex flex-wrap gap-4">
          <Link href="/app/ai/agents" className="text-primary underline underline-offset-4">
            {t("Ver meus agentes")}
          </Link>
          <Link href="/app/settings/billing" className="text-primary underline underline-offset-4">
            {t("Ver meu plano")}
          </Link>
          <Link href="/app/ajuda" className="text-primary underline underline-offset-4">
            {t("Abrir ajuda")}
          </Link>
        </div>
      </div>
    );
  }

  return <PainelDeProvedores />;
}
