import { createAdminClient } from "@/lib/supabase/admin";
import { requireAiPlatformAdmin } from "@/lib/auth/require-ai-platform-admin";
import { fail } from "@/lib/api/wrappers";
import { inheritedAgentConnection } from "./inherited-connection";

/** Novo agente usa a conexão da instalação; escolher uma chave requer administração completa. */
export async function guardNewAgentCredential(credentialId: string | null | undefined, orgId?: string, connection?: { provider: string; model: string }): Promise<Response | null> {
  if (!credentialId) return null;
  if (orgId && connection) {
    try {
      const inherited = await inheritedAgentConnection(orgId);
      if (inherited?.credential_id === credentialId && inherited.provider === connection.provider && inherited.model === connection.model)
        return null;
    } catch { return fail("unavailable", "Não foi possível conferir a conexão do agente.", 503); }
  }
  const auth = await requireAiPlatformAdmin();
  return auth.ok ? null : auth.response;
}

/** Alterar o agente não concede permissão para trocar sua conexão de IA. */
export async function guardAgentCredential(orgId: string, agentId: string, credentialId: string | null | undefined, versionId?: string): Promise<Response | null> {
  if (credentialId === undefined) return null;
  let query = createAdminClient().from("ai_agent_versions").select("credential_id")
    .eq("organization_id", orgId).eq("agent_id", agentId);
  if (versionId) query = query.eq("id", versionId);
  const { data, error } = await query.order("version_number", { ascending: false }).limit(1).maybeSingle();
  if (error) return fail("unavailable", "Não foi possível conferir a conexão do agente.", 503);
  if (credentialId === (data?.credential_id ?? null)) return null;
  const auth = await requireAiPlatformAdmin();
  return auth.ok ? null : auth.response;
}
