import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { sameRequestOrigin } from "@/lib/api/request-origin";
import { env } from "@/lib/env";
import { getRequestPool } from "@/lib/agent-engine/db/request-pool";
import { recordSupportOperatorAction, SupportWriteError } from "@/lib/help/support-store";
import { logger } from "@/lib/logger";

export async function GET() {
  await requirePlatformAdmin();
  const db = createAdminClient();
  const { data, error } = await db
    .from("platform_support_threads")
    .select(
      "id, organization_id, status, assigned_to, created_at, updated_at, organizations(display_name)",
    )
    .in("status", ["waiting_human", "human_active"])
    .order("updated_at", { ascending: true })
    .limit(100);
  if (error) return fail("unavailable", "Não foi possível carregar a fila de suporte.", 503);
  const threads = await Promise.all(
    (data ?? []).map(async (thread) => {
      const { data: messages, error: historyError } = await db
        .from("platform_support_messages")
        .select("id, author_kind, body, source, created_at")
        .eq("organization_id", thread.organization_id)
        .eq("thread_id", thread.id)
        .order("created_at", { ascending: false })
        .limit(100);
      return { ...thread, messages: (messages ?? []).reverse(), history_available: !historyError };
    }),
  );
  return ok({ threads });
}

const requestSchema = z
  .object({
    thread_id: z.string().uuid(),
    action: z.enum(["claim", "reply", "close"]),
    body: z.string().trim().min(1).max(4000).optional(),
  })
  .strict()
  .refine((input) => input.action !== "reply" || !!input.body);

export async function POST(request: Request) {
  if (!sameRequestOrigin(request, env.NEXT_PUBLIC_APP_URL))
    return fail("forbidden", "Origem do envio inválida.", 403);
  const denied = await requireSupportWrite();
  if (denied) return denied;
  const { user, platformAdmin } = await requirePlatformAdmin();
  if (platformAdmin.scope !== "full")
    return fail("forbidden", "Seu acesso permite somente leitura.", 403);
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return fail("invalid_request", "Dados inválidos.", 400);
  }
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) return fail("validation_failed", "Confira o chamado e a resposta.", 422);
  const { thread_id, action, body } = parsed.data;
  let organizationId: string;
  try {
    ({ organizationId } = await recordSupportOperatorAction(getRequestPool(), {
      threadId: thread_id,
      userId: user.id,
      action,
      body,
    }));
  } catch (error) {
    if (error instanceof SupportWriteError)
      return fail(error.code, error.message, error.code === "not_found" ? 404 : 409);
    logger.warn("support_operator_write_failed");
    return fail(
      "unavailable",
      "Não foi possível registrar a ação. Atualize a fila e tente novamente.",
      503,
    );
  }
  await audit({
    action: action === "close" ? "support.closed" : "support.replied",
    actorUserId: user.id,
    organizationId,
    resourceType: "support_thread",
    resourceId: thread_id,
    metadata: { operation: action },
  });
  return ok({ thread_id });
}
