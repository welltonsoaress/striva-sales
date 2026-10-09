import { requireRole } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/ai/dispatcher/rate-limit";
import { answerSupportQuestion, supportRequestSchema } from "@/lib/help/support";
import { sameRequestOrigin } from "@/lib/api/request-origin";
import { env } from "@/lib/env";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { getRequestPool } from "@/lib/agent-engine/db/request-pool";
import {
  recordSupportRequest,
  recordSupportAnswer,
  SupportWriteError,
} from "@/lib/help/support-store";

const THREAD_COLUMNS = "id, status, assigned_to, created_at, updated_at";
const MESSAGE_COLUMNS = "id, author_kind, body, source, created_at";

export async function GET() {
  const auth = await requireRole("viewer");
  if (!auth.ok) return auth.response;
  if (auth.user.support)
    return fail("forbidden", "Encerre o acompanhamento para abrir seu suporte pessoal.", 403);
  const db = createAdminClient();
  const { data: threads, error } = await db
    .from("platform_support_threads")
    .select(THREAD_COLUMNS)
    .eq("organization_id", auth.org.orgId)
    .eq("created_by", auth.user.id)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error)
    return fail(
      "unavailable",
      "O suporte não está disponível agora. A equipe pode conferir a atualização do banco.",
      503,
    );
  const thread = threads?.[0] ?? null;
  if (!thread) return ok({ thread: null, messages: [] });
  const { data: messages, error: historyError } = await db
    .from("platform_support_messages")
    .select(MESSAGE_COLUMNS)
    .eq("organization_id", auth.org.orgId)
    .eq("thread_id", thread.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (historyError)
    return fail("unavailable", "Não foi possível carregar o histórico do suporte.", 503);
  return ok({ thread, messages: (messages ?? []).reverse() });
}

export async function POST(request: Request) {
  const denied = await requireSupportWrite(undefined, {commercialExempt:true});
  if (denied) return denied;
  if (!sameRequestOrigin(request, env.NEXT_PUBLIC_APP_URL))
    return fail("forbidden", "Origem do envio inválida.", 403);
  const auth = await requireRole("viewer");
  if (!auth.ok) return auth.response;
  if (auth.user.support)
    return fail("forbidden", "Encerre o acompanhamento para abrir seu suporte pessoal.", 403);
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return fail("invalid_request", "Não foi possível ler sua pergunta.", 400);
  }
  const parsed = supportRequestSchema.safeParse(input);
  if (!parsed.success)
    return fail("validation_failed", "Confira a pergunta e tente novamente.", 422);
  const limit = await checkRateLimit(`support:${auth.org.orgId}:${auth.user.id}`, 20, 60);
  if (!limit.allowed)
    return fail("rate_limited", "Aguarde um momento antes de enviar outra mensagem.", 429);
  const { thread_id, message_id, action, body } = parsed.data;
  let recorded = false;
  try {
    const pool = getRequestPool();
    const result = await recordSupportRequest(pool, {
      organizationId: auth.org.orgId,
      userId: auth.user.id,
      threadId: thread_id,
      messageId: message_id,
      action,
      body:
        action === "send"
          ? body!
          : action === "handoff"
            ? "Solicitei atendimento com uma pessoa da equipe."
            : "Encerrei este chamado.",
    });
    if (result.duplicate) return ok({ thread_id, duplicate: true });
    recorded = true;
    let status = result.status;
    if (action === "send" && status === "open") {
      const answer = await answerSupportQuestion({
        organizationId: auth.org.orgId,
        role: auth.org.role,
        question: body!,
      });
      status =
        (await recordSupportAnswer(pool, {
          organizationId: auth.org.orgId,
          userId: auth.user.id,
          threadId: thread_id,
          ...answer,
        })) ?? status;
    }
    await audit({
      action:
        action === "close"
          ? "support.closed"
          : status === "waiting_human"
            ? "support.human_requested"
            : "support.message_sent",
      actorUserId: auth.user.id,
      organizationId: auth.org.orgId,
      resourceType: "support_thread",
      resourceId: thread_id,
    });
    return ok({ thread_id });
  } catch (error) {
    if (error instanceof SupportWriteError)
      return fail(error.code, error.message, error.code === "not_found" ? 404 : 409);
    // A pergunta aceita não fica invisível se a resposta automática falhar.
    if (recorded && action === "send") {
      await createAdminClient()
        .from("platform_support_threads")
        .update({ status: "waiting_human", updated_at: new Date().toISOString() })
        .eq("organization_id", auth.org.orgId)
        .eq("id", thread_id)
        .eq("created_by", auth.user.id)
        .eq("status", "open");
    }
    logger.warn("support_request_failed", { organization_id: auth.org.orgId });
    return fail(
      "unavailable",
      "Não foi possível concluir o envio. Confira o histórico antes de tentar novamente.",
      503,
    );
  }
}
