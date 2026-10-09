"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CalendarBlank,
  CheckCircle,
  ChatsCircle,
  Kanban,
  Robot,
  Sparkle,
  UsersThree,
  Warning,
} from "@/lib/ui/icons";
import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/i18n/useT";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useRealtimeChannel } from "@/hooks/realtime/useRealtimeChannel";
import type { Role } from "@/lib/auth/types";
import type { carregarAreaDeTrabalho } from "@/lib/onboarding/area-de-trabalho";
import styles from "./inicio.module.css";

type Area = Awaited<ReturnType<typeof carregarAreaDeTrabalho>>;

export function Inicio({
  nome,
  organizacao,
  role,
  area,
  operacao,
}: {
  nome: string | null;
  organizacao: string;
  role: Role;
  area: Area | null;
  operacao?: {
    conversations: number | null;
    appointments: number | null;
    opportunities: number | null;
  };
}) {
  const t = useT();
  const router = useRouter();
  const { activeOrg } = useAuth();
  const refresh = useCallback(() => router.refresh(), [router]);
  const organizationId = activeOrg?.orgId;
  useRealtimeChannel({
    name: `inicio-saldo:${organizationId}`,
    postgresChanges: {
      event: "*",
      schema: "public",
      table: "organization_ai_accounts",
      filter: `organization_id=eq.${organizationId}`,
    },
    enabled: !!area && !!organizationId,
    onChange: refresh,
  });
  useRealtimeChannel({
    name: `inicio-conversas:${organizationId}`,
    postgresChanges: {
      event: "*",
      schema: "public",
      table: "conversations",
      filter: `organization_id=eq.${organizationId}`,
    },
    enabled: !!organizationId,
    onChange: refresh,
  });
  useRealtimeChannel({
    name: `inicio-agenda:${organizationId}`,
    postgresChanges: {
      event: "*",
      schema: "public",
      table: "calendar_appointments",
      filter: `organization_id=eq.${organizationId}`,
    },
    enabled: !!organizationId,
    onChange: refresh,
  });
  useRealtimeChannel({
    name: `inicio-oportunidades:${organizationId}`,
    postgresChanges: {
      event: "*",
      schema: "public",
      table: "crm_leads",
      filter: `organization_id=eq.${organizationId}`,
    },
    enabled: !!organizationId,
    onChange: refresh,
  });
  useRealtimeChannel({
    name: `inicio-organizacao:${organizationId}`,
    postgresChanges: {
      event: "*",
      schema: "public",
      table: "organizations",
      filter: `id=eq.${organizationId}`,
    },
    enabled: !!area && !!organizationId,
    onChange: refresh,
  });
  useRealtimeChannel({
    name: `inicio-canais:${organizationId}`,
    postgresChanges: {
      event: "*",
      schema: "public",
      table: "channel_sessions",
      filter: `organization_id=eq.${organizationId}`,
    },
    enabled: !!area && !!organizationId,
    onChange: refresh,
  });
  useRealtimeChannel({
    name: `inicio-agentes:${organizationId}`,
    postgresChanges: {
      event: "*",
      schema: "public",
      table: "ai_agents",
      filter: `organization_id=eq.${organizationId}`,
    },
    enabled: !!area && !!organizationId,
    onChange: refresh,
  });
  useEffect(() => {
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refresh]);
  const primeiroNome = nome?.trim().split(/\s+/)[0];
  const admin = role === "admin";
  return (
    <div className={styles.page}>
      <header className={styles.pageHeading}>
        <h1>{t("Início")}</h1>
        <p>{organizacao}</p>
      </header>
      <section className={styles.welcome} aria-labelledby="welcome-title">
        <div className={styles.welcomeCopy}>
          <h2 id="welcome-title">
            {primeiroNome ? `${t("Bom ter você aqui")}, ${primeiroNome}.` : t("Bom ter você aqui.")}
          </h2>
          <p>{t("Seu atendimento e suas vendas, no mesmo lugar.")}</p>
          <span>
            {t(
              "Acompanhe as conversas, organize os próximos passos e trabalhe junto com seu agente.",
            )}
          </span>
          <Button asChild variant="info">
            <Link href="/app/inbox">
              {t("Abrir conversas")}
              <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
        <div className={styles.welcomeImage}>
          <Image
            src="/marketing/inicio-canais-vendas.png"
            alt={t("Ilustração de conversas no WhatsApp e Instagram, contatos e agenda")}
            fill
            preload
            sizes="(max-width: 700px) 100vw, 40vw"
          />
          <span className={styles.imageCaption}>
            <Sparkle size={17} weight="fill" />
            {t("Você e seu agente, trabalhando juntos")}
          </span>
        </div>
      </section>

      {operacao && (
        <section aria-label={t("Sua operação agora")} className={styles.operations}>
          {[
            ["Conversas aguardando", operacao.conversations, "/app/inbox", ChatsCircle],
            [
              t("Compromissos nas próximas 24 horas"),
              operacao.appointments,
              "/app/agenda",
              CalendarBlank,
            ],
            ["Oportunidades em andamento", operacao.opportunities, "/app/kanban", Kanban],
          ].map(([label, value, href, Icon]) => {
            const Mark = Icon as typeof ChatsCircle;
            return (
              <Link key={String(href)} href={String(href)}>
                <Mark size={22} aria-hidden />
                <span>
                  {t(String(label))}
                  <strong>{value === null ? "—" : Number(value).toLocaleString("pt-BR")}</strong>
                  {value === null && <small>{t("Atualize para consultar")}</small>}
                </span>
                <ArrowRight size={16} aria-hidden />
              </Link>
            );
          })}
        </section>
      )}

      {area?.incompleto && (
        <p role="alert" className={styles.notice}>
          <Warning size={18} />
          {t(
            "Algumas informações não puderam ser carregadas. Atualize a página para conferir seu progresso.",
          )}
        </p>
      )}

      {area && (
        <section className={styles.workspace} aria-labelledby="workspace-title">
          <div className={styles.planIntro}>
            <h2 id="workspace-title">{t("Sua área de trabalho")}</h2>
            <p>{t("Veja o que sua empresa já preparou para atender.")}</p>
            <p className={styles.contractNote}>
              {t("As condições do seu plano estão em Faturamento.")}
            </p>
            <Button asChild variant="outline">
              <Link href="/app/settings/billing">
                {t("Ver faturamento")}
                <ArrowRight size={16} />
              </Link>
            </Button>
          </div>
          <dl className={styles.workspaceList}>
            <div>
              <dt>{t("Números conectados")}</dt>
              <dd>
                {area.canaisConectados ?? "—"} <span>/ {area.canais ?? "—"}</span>
              </dd>
            </div>
            <div>
              <dt>{t("Agentes preparados")}</dt>
              <dd>{area.agentes ?? "—"}</dd>
            </div>
            <div>
              <dt>{t("Pessoas na equipe")}</dt>
              <dd>{area.equipe ?? "—"}</dd>
            </div>
            <div>
              <dt>{t("Configuração inicial")}</dt>
              <dd>{area.incompleto ? "—" : `${area.progresso.percentual}%`}</dd>
            </div>
          </dl>
        </section>
      )}

      {area && !area.incompleto && area.progresso.percentual < 100 && (
        <section className={styles.setup} aria-labelledby="setup-title">
          <div className={styles.sectionHeading}>
            <div>
              <h2 id="setup-title">{t("Primeiros passos")}</h2>
              <p>
                {area.progresso.percentual === 100
                  ? t("Tudo preparado. Continue acompanhando sua operação.")
                  : t("Faça no seu ritmo. Você pode sair e continuar depois.")}
              </p>
            </div>
            <span className={styles.completion}>
              {area.progresso.concluidas}/{area.progresso.total}
            </span>
          </div>
          <div
            className={styles.progress}
            role="progressbar"
            aria-label={t("Configuração inicial")}
            aria-valuenow={area.progresso.percentual}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${area.progresso.percentual}%` }} />
          </div>
          <div className={styles.steps}>
            {area.progresso.etapas.map((etapa, index) => (
              <details
                key={etapa.id}
                open={area.progresso.proxima?.id === etapa.id}
                className={styles.step}
              >
                <summary>
                  <span className={etapa.concluida ? styles.done : styles.stepNumber}>
                    {etapa.concluida ? <CheckCircle size={21} weight="fill" /> : index + 1}
                  </span>
                  <span>{t(etapa.titulo)}</span>
                  <span className={styles.stepStatus}>
                    {etapa.concluida ? t("Concluído") : t("A fazer")}
                  </span>
                </summary>
                <div className={styles.stepBody}>
                  <p>{t(etapa.descricao)}</p>
                  <Button asChild variant={etapa.concluida ? "outline" : "default"} size="sm">
                    <Link href={etapa.href}>
                      {etapa.concluida ? t("Revisar etapa") : t("Configurar")}
                      <ArrowRight size={15} />
                    </Link>
                  </Button>
                </div>
              </details>
            ))}
          </div>
          <p className={styles.optional}>
            {t(
              "Depois, você pode convidar a equipe, configurar a agenda e adicionar outras integrações.",
            )}
          </p>
        </section>
      )}

      <section aria-labelledby="shortcuts-title" className={styles.shortcutsSection}>
        <h2 id="shortcuts-title">{t("Para o seu dia")}</h2>
        <div className={styles.shortcuts}>
          <Link href="/app/inbox">
            <ChatsCircle className={styles.blue} size={24} />
            <span>
              {t("Conversas")}
              <small>{t("Continue os atendimentos")}</small>
            </span>
            <ArrowRight size={16} />
          </Link>
          <Link href="/app/kanban">
            <Kanban className={styles.violet} size={24} />
            <span>
              {t("Oportunidades")}
              <small>{t("Acompanhe suas negociações")}</small>
            </span>
            <ArrowRight size={16} />
          </Link>
          <Link href="/app/agenda">
            <CalendarBlank className={styles.green} size={24} />
            <span>
              {t("Agenda")}
              <small>{t("Veja seus compromissos")}</small>
            </span>
            <ArrowRight size={16} />
          </Link>
          {admin && (
            <Link href="/app/ai/agents">
              <Robot className={styles.amber} size={24} />
              <span>
                {t("Seu agente")}
                <small>{t("Revise o jeito de atender")}</small>
              </span>
              <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </section>
      <section className={styles.help} aria-labelledby="help-title">
        <BookOpen size={28} className={styles.violet} />
        <div>
          <h2 id="help-title">{t("Um próximo passo, sempre à mão")}</h2>
          <p>{t("Encontre orientações para começar, atender e configurar sua empresa.")}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/app/ajuda">
            {t("Abrir manual")}
            <ArrowRight size={16} />
          </Link>
        </Button>
        {admin && (
          <Link href="/app/team" className={styles.teamLink}>
            <UsersThree size={17} />
            {t("Convidar equipe")}
          </Link>
        )}
      </section>
    </div>
  );
}
