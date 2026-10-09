import { beforeEach, expect, it, vi } from "vitest";

const { handler, audit, account, scope } = vi.hoisted(() => ({
  handler: vi.fn(),
  audit: vi.fn(),
  account: vi.fn(),
  scope: { value: "mcp:write" },
}));
vi.mock("@/lib/mcp/tools", () => ({
  allTools: [],
  getToolByName: () => ({
    name: "qa_commercial_tool",
    description: "Ferramenta fictícia",
    inputSchema: {},
    requiresRole: "agent",
    get requiresScope() {
      return scope.value;
    },
    category: "write",
    handler,
  }),
}));
vi.mock("@/lib/mcp/tools/catalog", () => ({ catalogEntry: () => ({ apenasHumano: false }) }));
vi.mock("@/lib/mcp/audit", () => ({ auditMcpToolCall: audit }));
vi.mock("@/lib/leads/escopo-de-funil", () => ({
  podeChamarFerramenta: async () => ({ permitido: true }),
  recusaParaOModelo: () => null,
}));
import { pickToolsFromMcp } from "./tools";

const org = "ac000000-0000-4000-8000-000000000001";
const filters: unknown[][] = [];
function execute() {
  const query = {
    select: () => query,
    eq: (...args: unknown[]) => {
      filters.push(args);
      return query;
    },
    maybeSingle: account,
  };
  const db = { from: () => query };
  const mounted = pickToolsFromMcp({
    supabase: db as never,
    ctx: { organizationId: org, role: "agent", actor: { type: "ai_agent", id: "qa" } } as never,
    auth: { role: "agent", scopes: ["mcp:read", "mcp:write"] } as never,
    toolIds: ["qa_commercial_tool"],
    pipelineIds: [],
    handoffToolEnabled: false,
    handoffSignal: { triggered: false },
  });
  return (
    mounted.qa_commercial_tool as unknown as { execute: (args: unknown) => Promise<unknown> }
  ).execute({});
}
beforeEach(() => {
  vi.clearAllMocks();
  filters.length = 0;
  scope.value = "mcp:write";
  handler.mockResolvedValue({ ok: true });
});
it("reconfere o contrato no efeito e não chama o handler depois da expiração", async () => {
  account.mockResolvedValue({ data: { mode: "platform", state: "expired" }, error: null });
  await execute();
  expect(filters).toContainEqual(["organization_id", org]);
  expect(handler).not.toHaveBeenCalled();
  expect(audit).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
});
it("falha fechada com leitura indisponível e preserva atendimento humano sem saldo", async () => {
  account.mockResolvedValue({ data: null, error: { message: "indisponível" } });
  await execute();
  expect(handler).not.toHaveBeenCalled();
  account.mockResolvedValue({
    data: {
      mode: "platform",
      state: "active",
      access_until: "2099-01-01T00:00:00Z",
      monthly_remaining: 0,
    },
    error: null,
  });
  await execute();
  expect(handler).toHaveBeenCalledTimes(1);
});
it("consulta permanece disponível após o período contratado", async () => {
  scope.value = "mcp:read";
  expect(await execute()).toEqual({ ok: true });
  expect(account).not.toHaveBeenCalled();
});
