import { beforeEach, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ admin: vi.fn(), inherited: vi.fn(), eq: vi.fn(), current: "current", error: false }));
vi.mock("./inherited-connection", () => ({ inheritedAgentConnection: mock.inherited }));
vi.mock("@/lib/auth/require-ai-platform-admin", () => ({ requireAiPlatformAdmin: mock.admin }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: () => {
  const query = { select: () => query, eq: mock.eq.mockImplementation(() => query), order: () => query,
    limit: () => query, maybeSingle: async () => ({ data: { credential_id: mock.current }, error: mock.error ? {} : null }) };
  return query;
} }) }));
import { guardAgentCredential, guardNewAgentCredential } from "./credential-access";
beforeEach(() => { vi.clearAllMocks(); mock.current = "current"; mock.error = false; mock.admin.mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) }); });
it("tenant preserva sua conexão ao editar atendimento, com consultas limitadas à própria organização", async () => {
  expect(await guardAgentCredential("org-a", "agent-a", "current")).toBeNull();
  expect(mock.eq).toHaveBeenCalledWith("organization_id", "org-a");
  expect(mock.eq).toHaveBeenCalledWith("agent_id", "agent-a");
  expect(mock.admin).not.toHaveBeenCalled();
});
it("trocar ou remover a conexão exige administrador completo da plataforma", async () => {
  expect((await guardAgentCredential("org-a", "agent-a", "other"))?.status).toBe(403);
  expect((await guardAgentCredential("org-a", "agent-a", null))?.status).toBe(403);
  mock.admin.mockResolvedValue({ ok: true });
  expect(await guardAgentCredential("org-a", "agent-a", "other")).toBeNull();
});
it("criação aceita conexão administrada pelo servidor, mas não chave escolhida por tenant", async () => {
  expect(await guardNewAgentCredential(null)).toBeNull();
  expect((await guardNewAgentCredential("chosen"))?.status).toBe(403);
});
it("erro de leitura não permite alterar a conexão", async () => {
  mock.error = true;
  expect((await guardAgentCredential("org-a", "agent-a", "current"))?.status).toBe(503);
});
it("novo agente reutiliza somente a conexão padrão conferida no servidor", async () => {
  mock.inherited.mockResolvedValue({ credential_id: "current", provider: "anthropic", model: "configured" });
  expect(await guardNewAgentCredential("current", "org-a", { provider: "anthropic", model: "configured" })).toBeNull();
  expect(mock.inherited).toHaveBeenCalledWith("org-a");
  expect(mock.admin).not.toHaveBeenCalled();
  expect((await guardNewAgentCredential("other", "org-a", { provider: "anthropic", model: "configured" }))?.status).toBe(403);
  expect((await guardNewAgentCredential("current", "org-a", { provider: "openai", model: "forged" }))?.status).toBe(403);
});
it("falha ao conferir a conexão herdada fecha a criação", async () => {
  mock.inherited.mockRejectedValue(new Error("database unavailable"));
  expect((await guardNewAgentCredential("current", "org-a", { provider: "anthropic", model: "configured" }))?.status).toBe(503);
});
