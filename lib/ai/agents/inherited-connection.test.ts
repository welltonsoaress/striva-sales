import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ eq: vi.fn(), agent: { id: "agent-a", published_version_id: "version-a" }, error: false }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: (table: string) => {
  const query = { select: () => query, eq: mock.eq.mockImplementation(() => query), is: () => query, order: () => query, limit: () => query,
    maybeSingle: async () => ({ data: table === "ai_agents" ? mock.agent : { provider: "anthropic", model: "configured", credential_id: "key-a" }, error: mock.error ? {} : null }) };
  return query;
} }) }));
import { inheritedAgentConnection } from "./inherited-connection";
beforeEach(() => { vi.clearAllMocks(); mock.error = false; });
it("segue a versão publicada com organização conferida nas duas consultas", async () => {
  expect(await inheritedAgentConnection("org-a")).toEqual({ provider: "anthropic", model: "configured", credential_id: "key-a" });
  expect(mock.eq.mock.calls.filter(([column]) => column === "organization_id")).toEqual([["organization_id", "org-a"], ["organization_id", "org-a"]]);
  expect(mock.eq).toHaveBeenCalledWith("agent_id", "agent-a");
  expect(mock.eq).toHaveBeenCalledWith("id", "version-a");
});
it("erro no banco não produz uma conexão de fallback inventada", async () => {
  mock.error = true;
  await expect(inheritedAgentConnection("org-a")).rejects.toThrow("agent_connection_unavailable");
});
