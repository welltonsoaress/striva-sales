import Image from "next/image";
import Link from "next/link";
import { loadPublicCommercialPlans } from "@/lib/billing/catalog";
import { PricingSection } from "@/components/marketing/PricingSection";
import styles from "@/components/marketing/landing.module.css";
import { DEFAULT_APP_NAME } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { ChatCircle, CalendarBlank, ArrowRight, Check } from "@/lib/ui/icons";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Planos e atendimento com IA",
  description:
    "Conheça as ofertas para organizar atendimento, oportunidades e agenda em uma plataforma.",
};

export default async function PlansSalesPage() {
  const catalog = await loadPublicCommercialPlans();
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-6">
        <Link href="/" className="font-semibold tracking-tight">
          {DEFAULT_APP_NAME}
        </Link>
        <Link href="/login" className="text-sm underline underline-offset-4">
          Entrar no sistema
        </Link>
      </header>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-12 md:grid-cols-[1.1fr_1fr] md:py-20">
        <div className="space-y-6">
          <p className="text-sm font-medium text-primary">
            Atendimento e vendas, com próximos passos claros
          </p>
          <h1 className="max-w-xl text-4xl leading-[1.12] font-semibold tracking-tight md:text-5xl">
            Cada conversa pode abrir uma nova oportunidade.
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
            Reúna atendimento no WhatsApp, assistentes de IA, funis de vendas e agenda. Comece com
            uma configuração guiada e acompanhe a operação na sua área de trabalho.
          </p>
          <Button asChild size="lg">
            <Link href="/signup">
              Testar 7 dias grátis <ArrowRight aria-hidden />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            7 dias ou 1.000 créditos após a ativação. Um usuário e um WhatsApp. Criar uma conta não
            confirma uma compra. Confira as condições da oferta antes de pagar.
          </p>
        </div>
        <Image
          src="/marketing/inicio-canais-vendas.png"
          alt="Conversas e agenda organizadas em uma ilustração com WhatsApp e Instagram"
          width={1024}
          height={1024}
          priority
          className="aspect-square w-full rounded-2xl object-cover"
        />
      </section>
      <div className={styles.landing}>
        <PricingSection {...catalog} />
      </div>
      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:grid-cols-3">
          {[
            [
              ChatCircle,
              "Atendimento com continuidade",
              "A IA atende e pede orientação quando precisa. Sua equipe acompanha e continua a conversa.",
            ],
            [
              Check,
              "Oportunidades organizadas",
              "Acompanhe os negócios nas etapas do seu funil e configure retornos para os clientes.",
            ],
            [
              CalendarBlank,
              "Agenda conectada",
              "Organize os horários e as confirmações de atendimento conforme a configuração da empresa.",
            ],
          ].map(([Icon, title, body]) => {
            const FeatureIcon = Icon as typeof ChatCircle;
            return (
              <div key={String(title)} className="space-y-3">
                <FeatureIcon size={28} className="text-primary" aria-hidden />
                <h2 className="text-lg font-semibold">{String(title)}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{String(body)}</p>
              </div>
            );
          })}
        </div>
      </section>
      <footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-6 py-8 text-xs text-muted-foreground">
        <p>{DEFAULT_APP_NAME}</p>
        <nav className="flex gap-5">
          <Link href="/legal/terms">Termos de uso</Link>
          <Link href="/legal/privacy">Privacidade</Link>
        </nav>
      </footer>
    </main>
  );
}
