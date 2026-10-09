import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fail } from "@/lib/api/wrappers";

export const supportSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  actor_user_id: z.string().uuid(),
  auth_session_id: z.string().uuid(),
  previous_organization_id: z.string().uuid().nullable(),
  expires_at: z.string(),
  name: z.string(),
  locale: z.string().nullable(),
  access_mode: z.enum(["full", "support_readonly"]),
  status: z.enum(["active", "expired", "revoked"]),
});
export type SupportContext = z.infer<typeof supportSchema>;

/** Chamar depois de getUser. A RPC resolve auth.uid + auth.session_id, nunca cookie. */
export async function readSupportContext(
  db: Awaited<ReturnType<typeof createClient>>,
): Promise<SupportContext | null> {
  const { data, error } = await db.rpc("fn_support_context");
  if (error) throw new Error("Não foi possível confirmar o acompanhamento administrativo.");
  return data === null ? null : supportSchema.parse(data);
}

export function supportWriteError(
  support: SupportContext | null | undefined,
  organizationId?: string,
): string | null {
  if (!support || (organizationId && organizationId !== support.organization_id)) return null;
  if (support.status !== "active")
    return "O acompanhamento terminou. Saia do acompanhamento para continuar.";
  if (support.access_mode !== "full") return "Este acompanhamento permite somente leitura.";
  return null;
}

/** Guarda de EFEITO, antes dos clientes service role. Não substitui RBAC/MFA.
 * Sem cookie de usuário, workers/tokens seguem sua autorização própria.
 * targetOrganizationId é exclusivamente path ou registro confiável de administração.
 */
export async function requireSupportWrite(
  targetOrganizationId?: string,
  options: { commercialExempt?: boolean } = {},
) {
  try {
    const { loadAuthUser } = await import("@/lib/auth/server");
    const user = await loadAuthUser();
    if (!user) return null;
    const support = user.support;
    const message = supportWriteError(support, targetOrganizationId);
    if (message) return fail("forbidden", message, 403);
    if (support && targetOrganizationId && targetOrganizationId !== support.organization_id)
      return null;
    // A plataforma administra contratos mesmo quando a empresa está suspensa.
    // A sessão de suporte continua sujeita ao acesso comercial do cliente.
    if (options.commercialExempt || (user.is_platform_admin && !support)) return null;
    const orgId =
      targetOrganizationId ??
      (await (await import("@/lib/auth/server")).resolveActiveOrg(user))?.orgId;
    if (!orgId) return null; // A autorização canônica da rota trata ausência de empresa.
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { tenantOperationAllowed } = await import("@/lib/billing/operation-access");
    const { data, error } = await createAdminClient()
      .from("organization_ai_accounts")
      .select("mode,state,access_until")
      .eq("organization_id", orgId)
      .maybeSingle();
    if (error || !data)
      return fail("upstream_unavailable", "Não foi possível confirmar o período contratado.", 503);
    return tenantOperationAllowed(data)
      ? null
      : fail(
          "forbidden",
          "O período contratado terminou. Consulta, exportação, suporte e contratação continuam disponíveis.",
          403,
        );
  } catch {
    return fail(
      "upstream_unavailable",
      "Não foi possível confirmar a permissão de acompanhamento.",
      503,
    );
  }
}

/** Identidade vem do state HMAC já verificado, nunca do body. */
export async function supportCallbackWriteAllowed(
  organizationId: string,
  actorId?: string,
  sessionId?: string,
): Promise<boolean> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("fn_support_callback_write_allowed", {
    p_org: organizationId,
    p_actor: actorId ?? null,
    p_session: sessionId ?? null,
  });
  if (error || data !== true) return false;
  // O consentimento OAuth pode retornar depois de encerrar o período pago.
  // A identidade do state autoriza a empresa, mas não prolonga o contrato.
  try {
    const { assertTenantOperation } = await import("@/lib/billing/operation-access-server");
    await assertTenantOperation(admin, organizationId);
    return true;
  } catch {
    return false;
  }
}
export async function authenticatedSessionId(): Promise<string> {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("Sessão ausente.");
  const { data } = await db.auth.getClaims();
  return z.string().uuid().parse(data?.claims.session_id);
}
