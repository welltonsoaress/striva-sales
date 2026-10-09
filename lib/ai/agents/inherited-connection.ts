import { createAdminClient } from "@/lib/supabase/admin";

export interface InheritedAgentConnection {
  provider: string;
  model: string;
  credential_id: string | null;
}

/** Reutiliza a conexão do agente padrão, sem oferecer escolha de chave ao tenant.
 * O escopo é conferido nas duas tabelas, inclusive ao seguir o ponteiro. */
export async function inheritedAgentConnection(
  orgId: string,
): Promise<InheritedAgentConnection | null> {
  const db = createAdminClient();
  const { data: settings, error: settingsError } = await db
    .from("platform_ai_settings")
    .select("enabled,apply_to_all,provider,model")
    .eq("id", true)
    .maybeSingle();
  if (settingsError) throw new Error("agent_connection_unavailable");
  if (settings?.enabled && settings.provider && settings.model) {
    const { data: account, error } = await db
      .from("organization_ai_accounts")
      .select("mode")
      .eq("organization_id", orgId)
      .maybeSingle();
    if (error) throw new Error("agent_connection_unavailable");
    if (account?.mode === "platform" || settings.apply_to_all)
      return { provider: settings.provider, model: settings.model, credential_id: null };
  }
  const { data: agent, error: agentError } = await db
    .from("ai_agents")
    .select("id,published_version_id")
    .eq("organization_id", orgId)
    .eq("kind", "mcp_agent")
    .is("archived_at", null)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (agentError) throw new Error("agent_connection_unavailable");
  if (!agent) return null;
  let query = db
    .from("ai_agent_versions")
    .select("provider,model,credential_id")
    .eq("organization_id", orgId)
    .eq("agent_id", agent.id);
  if (agent.published_version_id) query = query.eq("id", agent.published_version_id);
  const { data, error } = await query
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("agent_connection_unavailable");
  return data;
}
