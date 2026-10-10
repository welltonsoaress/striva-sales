/**
 * GET /api/v1/voice/sessions/status — estado do pareamento de chamada de voz
 * da organização ativa. Usado pelo discador (§5.1 da spec) pra decidir se
 * mostra o botão "Ligar".
 */
import { randomUUID } from "node:crypto";

import { ok, fail } from "@/lib/api/wrappers";
import { loadAuthUser, resolveActiveOrg } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const requestId = randomUUID();

  const user = await loadAuthUser();
  if (user && (!user.is_platform_admin || user.support))
    return fail("forbidden", "Este recurso é administrado pela plataforma.", 403);
  if (!user) return fail("unauthenticated", "Faça login.", 401);
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) return fail("forbidden", "Sem organização ativa.", 403);

  const supabase = await createClient();
  const { data } = await supabase
    .from("channel_sessions")
    .select("id, status, wacalls_jid, wacalls_paired_at")
    .eq("organization_id", activeOrg.orgId)
    .eq("provider", "wacalls")
    .is("archived_at", null)
    .maybeSingle();

  const row = data as {
    id: string;
    status: string;
    wacalls_jid: string | null;
    wacalls_paired_at: string | null;
  } | null;

  return ok(
    {
      configured: !!row,
      channelSessionId: row?.id ?? null,
      status: row?.status ?? null,
      paired: !!row?.wacalls_paired_at,
      jid: row?.wacalls_jid ?? null,
    },
    { requestId },
  );
}
