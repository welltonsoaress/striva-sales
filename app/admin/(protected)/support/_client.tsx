"use client";
import { PlanChangeQuote } from "@/components/admin/PlanChangeQuote";
import { useCallback, useEffect, useState } from "react";
import { useT } from "@/hooks/i18n/useT";
import { Button } from "@/components/ui/button";
import { useRealtimeChannel } from "@/hooks/realtime/useRealtimeChannel";

type Thread = {
  id: string;
  status: string;
  assigned_to: string | null;
  organizations: { display_name: string } | null;
  history_available: boolean;
  messages: Array<{ id: string; author_kind: string; body: string }>;
};

export function SupportQueue({ userId, readOnly }: { userId: string; readOnly: boolean }) {
  const t = useT();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const reload = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/admin/support", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error?.message ?? t("Não foi possível carregar a fila."));
        return;
      }
      setThreads(result.data.threads);
      setError(null);
    } catch {
      setError(t("Não foi possível carregar a fila."));
    } finally {
      setLoaded(true);
    }
  }, [t]);
  useEffect(() => {
    const initial = setTimeout(() => void reload(), 0);
    const timer = setInterval(() => void reload(), 30000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [reload]);
  // Realtime entrega só metadados da fila ao admin com MFA adequado.
  // O conteúdo das mensagens continua no endpoint com guard próprio.
  useRealtimeChannel({
    name: `support-admin-own:${userId}`,
    postgresChanges: { event: "*", schema: "public", table: "platform_support_threads" },
    onChange: reload,
  });
  async function mutate(threadId: string, action: string, body?: string) {
    if (readOnly) {
      setError(t("Seu acesso permite somente leitura."));
      return false;
    }
    setPending(true);
    try {
      const response = await fetch("/api/v1/admin/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread_id: threadId, action, ...(body ? { body } : {}) }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error?.message ?? t("Não foi possível atualizar o chamado."));
        return false;
      }
      await reload();
      return true;
    } catch {
      setError(t("Não foi possível atualizar o chamado."));
      return false;
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("Suporte da plataforma")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("Assuma as solicitações e responda com o contexto da conversa.")}
          </p>
        </div>
        <Button variant="outline" onClick={() => void reload()}>
          {t("Atualizar fila")}
        </Button>
      </header>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {t(error)}
        </p>
      )}
      {!loaded && <p role="status">{t("Carregando chamados…")}</p>}
      {loaded && threads.length === 0 && !error && (
        <p className="py-8 text-sm text-muted-foreground">
          {t("Nenhum chamado aguardando a equipe.")}
        </p>
      )}
      {threads.map((thread) => (
        <section key={thread.id} className="space-y-4 rounded-lg border bg-card p-5">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">
              {thread.organizations?.display_name ?? t("Organização")}
            </h2>
            <span className="text-xs text-muted-foreground">
              {thread.assigned_to === userId
                ? t("Com você")
                : thread.assigned_to
                  ? t("Com outra pessoa da equipe")
                  : t("Aguardando atendimento")}
            </span>
          </header>
          {!thread.history_available ? (
            <p role="alert">
              {t("O histórico não pôde ser carregado. Atualize antes de responder.")}
            </p>
          ) : (
            <div className="max-h-80 space-y-3 overflow-y-auto border-y py-4">
              {thread.messages.map((message) => (
                <div key={message.id}>
                  <p className="text-xs font-medium text-muted-foreground">
                    {message.author_kind === "user"
                      ? t("Cliente")
                      : message.author_kind === "human"
                        ? t("Equipe de suporte")
                        : t("Assistente")}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed break-words whitespace-pre-wrap">
                    {message.body}
                  </p>
                </div>
              ))}
            </div>
          )}
          {!readOnly && thread.assigned_to === userId && thread.messages.some(m => m.author_kind === "user" && m.body.startsWith("Troca de plano:")) && <PlanChangeQuote threadId={thread.id} onSent={() => void reload()} />}
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const body = String(new FormData(form).get("body") ?? "").trim();
              if (body)
                void mutate(thread.id, "reply", body).then((ok) => {
                  if (ok) form.reset();
                });
            }}
          >
            <label className="sr-only" htmlFor={`reply-${thread.id}`}>
              {t("Resposta ao chamado")}
            </label>
            <textarea
              id={`reply-${thread.id}`}
              name="body"
              required
              maxLength={4000}
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder={t("Escreva sua orientação…")}
              disabled={
                readOnly ||
                pending ||
                !thread.history_available ||
                (!!thread.assigned_to && thread.assigned_to !== userId)
              }
            />
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={
                  readOnly ||
                  pending ||
                  !thread.history_available ||
                  (!!thread.assigned_to && thread.assigned_to !== userId)
                }
              >
                {t("Enviar resposta")}
              </Button>
              {!thread.assigned_to && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending || readOnly}
                  onClick={() => void mutate(thread.id, "claim")}
                >
                  {t("Assumir chamado")}
                </Button>
              )}
              {thread.assigned_to === userId && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending || readOnly}
                  onClick={() => void mutate(thread.id, "close")}
                >
                  {t("Encerrar chamado")}
                </Button>
              )}
            </div>
          </form>
        </section>
      ))}
    </div>
  );
}
