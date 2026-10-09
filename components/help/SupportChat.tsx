"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/hooks/i18n/useT";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useRealtimeChannel } from "@/hooks/realtime/useRealtimeChannel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChatsCircle, PaperPlaneTilt } from "@/lib/ui/icons";
import { randomId } from "@/lib/random-id";

type Message = {
  id: string;
  author_kind: string;
  body: string;
  source: string | null;
  created_at: string;
};
type Thread = { id: string; status: string };
type History = { thread: Thread | null; messages: Message[] };

export function SupportChat() {
  const t = useT();
  const { user, activeOrg } = useAuth();
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<History>({ thread: null, messages: [] });
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nextThread = useRef<string | null>(null);
  const retry = useRef<{ key: string; messageId: string } | null>(null);
  const scope = activeOrg?.orgId;
  const scroll = useRef<HTMLDivElement>(null);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/support", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error?.message ?? t("Não foi possível carregar o suporte."));
        return;
      }
      setHistory(result.data);
      setError(null);
    } catch {
      setError(t("Não foi possível carregar o suporte. Confira sua conexão."));
    } finally {
      setLoading(false);
    }
  }, [t]);
  function changeOpen(nextOpen: boolean) {
    setOpen(nextOpen);
    // Bloqueia a digitação na mesma abertura, antes de montar o formulário.
    // Adiar o carregamento permitia digitar entre a montagem e o bloqueio.
    if (nextOpen) void reload();
  }
  useEffect(() => {
    scroll.current?.scrollTo({ top: scroll.current.scrollHeight });
  }, [history.messages]);
  useRealtimeChannel({
    name: `support:${scope}:${user.id}`,
    postgresChanges: {
      event: "*",
      schema: "public",
      table: "platform_support_messages",
      filter: `organization_id=eq.${scope}`,
    },
    enabled: open && !!scope,
    onChange: reload,
  });
  useRealtimeChannel({
    name: `support-status:${scope}:${user.id}`,
    postgresChanges: {
      event: "*",
      schema: "public",
      table: "platform_support_threads",
      filter: `organization_id=eq.${scope}`,
    },
    enabled: open && !!scope,
    onChange: reload,
  });
  async function send(action: "send" | "handoff" | "close") {
    if (pending || loading) return;
    if (history.thread?.status === "closed" && nextThread.current === history.thread.id)
      nextThread.current = null;
    nextThread.current ??= randomId();
    const threadId =
      history.thread?.status === "closed"
        ? nextThread.current
        : (history.thread?.id ?? nextThread.current);
    const retryKey = JSON.stringify({ threadId, action, body: action === "send" ? body : null });
    if (retry.current?.key !== retryKey)
      retry.current = { key: retryKey, messageId: randomId() };
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: threadId,
          message_id: retry.current.messageId,
          action,
          ...(action === "send" ? { body } : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error?.message ?? t("Não foi possível enviar sua mensagem."));
        return;
      }
      setBody("");
      retry.current = null;
      await reload();
      if (action === "close") nextThread.current = null;
    } catch {
      setError(
        t("Não foi possível concluir o envio. Confira o histórico antes de tentar novamente."),
      );
    } finally {
      setPending(false);
    }
  }
  if (!scope || user.support) return null;
  const human =
    history.thread?.status === "waiting_human" || history.thread?.status === "human_active";
  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed right-4 bottom-4 z-30 gap-2 bg-background shadow-sm md:right-6 md:bottom-6"
        >
          <ChatsCircle size={18} />
          {t("Suporte")}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-4 sm:max-w-lg">
        <DialogTitle>{t("Como podemos ajudar?")}</DialogTitle>
        <DialogDescription>
          {t(
            "Pergunte sobre o uso do sistema ou peça atendimento à equipe. A conversa fica salva para você acompanhar.",
          )}
        </DialogDescription>
        <p role="status" className="text-xs text-muted-foreground">
          {history.thread?.status === "closed"
            ? t("Chamado encerrado. Envie uma pergunta para começar outro.")
            : history.thread?.status === "human_active"
              ? t("A equipe assumiu seu chamado.")
              : human
                ? t("Solicitação enviada à equipe. Sua resposta aparecerá nesta conversa.")
                : t("Orientações do manual com apoio da IA quando disponível.")}
        </p>
        <div
          ref={scroll}
          className="min-h-44 flex-1 space-y-4 overflow-y-auto rounded-md border p-4"
          aria-label={t("Histórico do suporte")}
          role="log"
          aria-live="polite"
        >
          {history.messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {loading
                ? t("Carregando…")
                : t("Conte o que você está tentando fazer e onde encontrou dificuldade.")}
            </p>
          ) : (
            history.messages.map((message) => (
              <article
                key={message.id}
                className={
                  "space-y-1 text-sm " +
                  (message.author_kind === "user"
                    ? "ml-6 rounded-md bg-primary/10 p-3"
                    : "mr-4 border-b pb-3")
                }
              >
                <p className="text-xs font-medium text-muted-foreground">
                  {message.author_kind === "user"
                    ? t("Você")
                    : message.author_kind === "human"
                      ? t("Equipe de suporte")
                      : message.source === "model"
                        ? t("Assistente de suporte")
                        : t("Orientação do manual")}
                </p>
                <p className="leading-relaxed break-words whitespace-pre-wrap">{t(message.body)}</p>
                {message.author_kind === "human" && /\/app\/settings\/billing\?proposal=([0-9a-f-]{36})/i.test(message.body) && <Link className="text-primary underline" href={message.body.match(/\/app\/settings\/billing\?proposal=([0-9a-f-]{36})/i)![0]}>{t("Ver proposta no faturamento")}</Link>}
              </article>
            ))
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {t(error)}
          </p>
        )}
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void send("send");
          }}
        >
          <label className="sr-only" htmlFor="support-question">
            {t("Sua pergunta")}
          </label>
          <textarea
            id="support-question"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={3000}
            rows={2}
            disabled={pending || loading}
            className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm"
            placeholder={t("Escreva sua pergunta…")}
          />
          <Button
            type="submit"
            aria-label={t("Enviar pergunta")}
            disabled={pending || loading || !body.trim()}
          >
            <PaperPlaneTilt size={18} />
          </Button>
        </form>
        <div className="flex flex-wrap justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pending || loading || human}
            onClick={() => void send("handoff")}
          >
            {t("Falar com uma pessoa")}
          </Button>
          {history.thread && history.thread.status !== "closed" && (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending || loading}
              onClick={() => void send("close")}
            >
              {t("Encerrar chamado")}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            disabled={pending || loading}
            onClick={() => void reload()}
          >
            {t("Atualizar")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
