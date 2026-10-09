"use client";
import { useT } from "@/lib/i18n/IdiomaProvider";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Turnstile } from "@/components/auth/Turnstile";
import type { z } from "zod";
import type { simpleAgendaSchema } from "@/lib/onboarding/simple-agenda";
import {
  prepareBusinessAgent,
  activateBusinessAgent,
} from "@/app/actions/onboarding/business-agent";

export function ManagedAgent({
  segment,
  scenarios,
  prepared,
  agendaEligible,
  savedAgenda,
}: {
  segment: string;
  scenarios: readonly string[];
  prepared: { agent_id: string; version_id: string } | null;
  agendaEligible: boolean;
  savedAgenda: z.infer<typeof simpleAgendaSchema> | null;
}) {
  const t = useT();

  const router = useRouter();
  const [agent, setAgent] = useState(prepared);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [sample, setSample] = useState(scenarios[0] ?? "Olá, como vocês atendem?");
  const [answer, setAnswer] = useState("");
  const [consent, setConsent] = useState(false);
  const [token, setToken] = useState("");
  const [attempt, setAttempt] = useState(0);
  const initialized = useRef(false);
  const [agendaEnabled, setAgendaEnabled] = useState(!!savedAgenda);
  const [days, setDays] = useState<number[]>(savedAgenda?.days ?? []);
  const [agendaDirty, setAgendaDirty] = useState(false);
  useEffect(() => {
    if (initialized.current || prepared) return;
    initialized.current = true;
    start(async () => {
      try {
        const result = await prepareBusinessAgent();
        if (result.ok) setAgent(result);
        else setError(result.error);
      } catch {
        setError("Não foi possível preparar o agente agora. Tente novamente.");
      }
    });
  }, [prepared]);
  function invalidateAgenda() {
    setAgendaDirty(true);
    setAgent(null);
    setConsent(false);
    setAnswer("");
  }
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-semibold tracking-tight">
          {t("Um atendimento preparado para")} {t(segment).toLowerCase()}
        </h2>
        <p className="mt-3 text-muted-foreground">
          {t(
            "A IA está incluída. As informações do seu negócio complementam o agente e podem ser atualizadas depois.",
          )}
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-primary/20 bg-primary/5 p-5">
          <h3 className="font-semibold">{t("Conversa com seu cliente")}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>{t("Mensagens curtas, uma pergunta por vez.")}</li>
            <li>{t("Consulta às informações da sua empresa.")}</li>
            <li>{t("Encaminhamento à equipe com contexto.")}</li>
          </ul>
        </section>
        <section className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-5">
          <h3 className="font-semibold">{t("Organiza o atendimento")}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>{t("Contatos e oportunidades da sua empresa.")}</li>
            <li>{t("Funil preparado para seu segmento.")}</li>
            <li>{t("Atualizações com fatos confirmados.")}</li>
          </ul>
        </section>
      </div>
      {agendaEligible && (
        <form
          className="space-y-4 rounded-xl border p-5"
          action={(form) =>
            start(async () => {
              setError("");
              const agenda = agendaEnabled
                ? {
                    name: String(form.get("name")),
                    duration_minutes: Number(form.get("duration")),
                    days,
                    start: String(form.get("start")),
                    end: String(form.get("end")),
                  }
                : null;
              try {
                const result = await prepareBusinessAgent({ agenda });
                if (result.ok) {
                  setAgent(result);
                  setAgendaDirty(false);
                } else setError(result.error);
              } catch {
                setError("Não foi possível preparar o agente agora. Tente novamente.");
              }
            })
          }
        >
          <label className="flex gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={agendaEnabled}
              disabled={pending}
              onChange={(e) => {
                setAgendaEnabled(e.target.checked);
                invalidateAgenda();
              }}
              className="mt-0.5 size-4 accent-[var(--primary)]"
            />
            {t("Permitir que o agente marque horários")}
          </label>
          <p className="text-sm text-muted-foreground">
            {t(
              "Opcional. Informe a disponibilidade real para autorizar reservas, confirmações e reagendamentos. Cancelamentos e retornos automáticos continuam sujeitos à configuração avançada.",
            )}
          </p>
          {agendaEnabled && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  {t("Nome do atendimento")}
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={80}
                    defaultValue={savedAgenda?.name ?? ""}
                    onChange={invalidateAgenda}
                    className="mt-1 h-10 w-full rounded-lg border bg-background px-3"
                  />
                </label>
                <label className="block text-sm">
                  {t("Duração em minutos")}
                  <input
                    name="duration"
                    type="number"
                    required
                    min={5}
                    max={1440}
                    defaultValue={savedAgenda?.duration_minutes}
                    onChange={invalidateAgenda}
                    className="mt-1 h-10 w-full rounded-lg border bg-background px-3"
                  />
                </label>
                <label className="block text-sm">
                  {t("Início do expediente")}
                  <input
                    name="start"
                    type="time"
                    required
                    defaultValue={savedAgenda?.start}
                    onChange={invalidateAgenda}
                    className="mt-1 h-10 w-full rounded-lg border bg-background px-3"
                  />
                </label>
                <label className="block text-sm">
                  {t("Fim do expediente")}
                  <input
                    name="end"
                    type="time"
                    required
                    defaultValue={savedAgenda?.end}
                    onChange={invalidateAgenda}
                    className="mt-1 h-10 w-full rounded-lg border bg-background px-3"
                  />
                </label>
              </div>
              <fieldset>
                <legend className="mb-2 text-sm">{t("Dias de atendimento")}</legend>
                <div className="flex flex-wrap gap-3">
                  {[
                    t("Domingo"),
                    t("Segunda"),
                    t("Terça"),
                    t("Quarta"),
                    t("Quinta"),
                    t("Sexta"),
                    t("Sábado"),
                  ].map((day, index) => (
                    <label key={day} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={days.includes(index)}
                        onChange={(e) => {
                          setDays((previous) =>
                            e.target.checked
                              ? [...previous, index].sort()
                              : previous.filter((d) => d !== index),
                          );
                          invalidateAgenda();
                        }}
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          )}
          {agendaDirty && (
            <Button variant="outline" disabled={pending || (agendaEnabled && !days.length)}>
              {pending ? t("Preparando…") : t("Salvar e preparar agente")}
            </Button>
          )}
        </form>
      )}
      <p className="text-sm text-muted-foreground">
        {t(
          "Reservas de agenda e retornos automáticos dependem de configuração e autorização. Seu agente não promete horários, preços ou condições que não estejam confirmados.",
        )}
      </p>
      {!agent && !agendaDirty ? (
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError("");
              try {
                const result = await prepareBusinessAgent();
                if (result.ok) setAgent(result);
                else setError(result.error ?? "Não foi possível concluir agora.");
              } catch {
                setError("Não foi possível preparar o agente agora. Tente novamente.");
              }
            })
          }
        >
          {pending ? t("Preparando…") : t("Preparar meu agente")}
        </Button>
      ) : agent ? (
        <>
          <section className="space-y-3 rounded-xl border bg-card p-5">
            <h3 className="font-semibold">{t("Veja como ele atende")}</h3>
            <label className="block text-sm" htmlFor="agent-sample">
              {t("Escreva como um cliente")}
            </label>
            <textarea
              id="agent-sample"
              className="w-full rounded-lg border bg-background p-3 text-sm"
              value={sample}
              onChange={(e) => setSample(e.target.value)}
              maxLength={4000}
              rows={3}
            />
            <Button
              variant="outline"
              disabled={pending || !sample.trim()}
              onClick={() =>
                start(async () => {
                  setError("");
                  try {
                    const response = await fetch(
                      `/api/v1/ai/agents/${agent.agent_id}/versions/${agent.version_id}/test`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ sample_message: sample }),
                      },
                    );
                    const result = await response.json();
                    if (!response.ok) {
                      setError(result.error?.message ?? "Não foi possível testar.");
                      return;
                    }
                    setAnswer(
                      result.data?.final_text ??
                        result.data?.response_text ??
                        result.data?.text ??
                        "Teste concluído. Confira os detalhes na tela do agente.",
                    );
                  } catch {
                    setError("Não foi possível testar agora. Tente novamente.");
                  }
                })
              }
            >
              {pending ? t("Testando…") : t("Testar atendimento")}
            </Button>
            {answer && (
              <div role="status" className="rounded-lg bg-muted p-4 text-sm whitespace-pre-wrap">
                {answer}
              </div>
            )}
          </section>
          <section className="space-y-4 rounded-xl border p-5">
            <h3 className="font-semibold">{t("Comece seu teste gratuito")}</h3>
            <p className="text-sm text-muted-foreground">
              {t(
                "7 dias ou 1.000 créditos, o que terminar primeiro. Um usuário e um WhatsApp. Ao terminar o teste, escolha um plano para continuar operando. Consulta, exportação, suporte e contratação permanecem acessíveis.",
              )}
            </p>
            <label className="flex gap-3 text-sm">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 size-4 accent-[var(--primary)]"
              />
              <span>
                {t(
                  "Revisei o comportamento e autorizo o agente a atender e organizar os registros desta empresa.",
                )}
              </span>
            </label>
            <Turnstile key={attempt} action="trial_activation" onToken={setToken} />
            {!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
              <p role="alert" className="text-sm text-muted-foreground">
                {t(
                  "A verificação de segurança ainda não está disponível. A equipe da plataforma precisa concluir essa conexão antes da ativação.",
                )}
              </p>
            )}
            <Button
              variant="success"
              disabled={pending || !consent || !token}
              onClick={() =>
                start(async () => {
                  setError("");
                  try {
                    const result = await activateBusinessAgent({
                      ...agent,
                      captcha_token: token,
                      consent: true,
                    });
                    if (result.ok) router.push(result.redirect_to ?? "/app/inicio");
                    else setError(result.error ?? "Não foi possível concluir agora.");
                  } catch {
                    setError("A ativação não foi concluída. Tente novamente.");
                  } finally {
                    // Uma falha de rede não prova que o servidor deixou de consumir o token.
                    setToken("");
                    setAttempt((n) => n + 1);
                  }
                })
              }
            >
              {pending ? t("Ativando…") : t("Ativar atendimento")}
            </Button>
            <Link
              href="/app/settings/billing"
              className="ml-4 inline-block text-sm text-primary underline underline-offset-4"
            >
              {t("Ver planos")}
            </Link>
          </section>
        </>
      ) : null}
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm"
        >
          {t(error)}{" "}
          <Link className="underline" href="/app/ajuda">
            {t("Abrir ajuda")}
          </Link>
        </p>
      )}
    </div>
  );
}
