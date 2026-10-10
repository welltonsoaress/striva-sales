import { inheritedAgentConnection } from "./inherited-connection";

/** O payload do cliente não determina modelo nem chave do SaaS. */
export async function applyAgentConnection<
  T extends {
    provider?: string;
    model?: string;
    credential_id?: string | null;
    operator_model?: string | null;
  },
>(
  orgId: string,
  input: T,
): Promise<
  T & { provider: string; model: string; credential_id: string | null; operator_model: null }
> {
  const connection = await inheritedAgentConnection(orgId);
  if (!connection) throw new Error("agent_connection_unavailable");
  return { ...input, ...connection, operator_model: null };
}
