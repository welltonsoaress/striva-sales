import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  supportWriteError,
  requireSupportWrite,
  supportCallbackWriteAllowed,
  type SupportContext,
} from "@/lib/impersonate/support";
const { loadAuthUser, account, callback } = vi.hoisted(() => ({
  loadAuthUser: vi.fn(),
  account: vi.fn(),
  callback: vi.fn(),
}));
vi.mock("@/lib/auth/server", () => ({
  loadAuthUser,
  resolveActiveOrg: async () => ({ orgId: "f2200000-0000-4000-8000-000000000002" }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc: callback,
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: account }) }) }),
  }),
}));
const support: SupportContext = {
  id: "f2200000-0000-4000-8000-000000000001",
  organization_id: "f2200000-0000-4000-8000-000000000002",
  actor_user_id: "f2200000-0000-4000-8000-000000000003",
  auth_session_id: "f2200000-0000-4000-8000-000000000004",
  previous_organization_id: null,
  expires_at: "2026-09-06T00:00:00Z",
  name: "B",
  locale: null,
  status: "active",
  access_mode: "support_readonly",
};
beforeEach(() => vi.clearAllMocks());
describe("cerca de efeito antes de service role", () => {
  it("readonly vence identidade plataforma e membership física admin", async () => {
    loadAuthUser.mockResolvedValue({
      id: support.actor_user_id,
      is_platform_admin: true,
      organizations: [{ organization_id: support.organization_id, role: "admin" }],
      support,
    });
    const response = await requireSupportWrite();
    expect(response?.status).toBe(403);
    expect((await response!.json()).error.message).toContain("somente leitura");
  });
  it("não restringe outro alvo administrativo A/C nem workers sem usuário", async () => {
    loadAuthUser.mockResolvedValue({ support });
    expect(await requireSupportWrite("f2200000-0000-4000-8000-000000000009")).toBeNull();
    loadAuthUser.mockResolvedValue(null);
    expect(await requireSupportWrite()).toBeNull();
  });
  it("full permite efeito; expirada/revogada exige saída", () => {
    expect(supportWriteError({ ...support, access_mode: "full" })).toBeNull();
    for (const status of ["expired", "revoked"] as const)
      expect(supportWriteError({ ...support, access_mode: "full", status })).toContain("Saia");
  });
  it("indisponibilidade falha fechada sem afirmar permissão", async () => {
    loadAuthUser.mockRejectedValue(new Error("database unavailable"));
    expect((await requireSupportWrite())?.status).toBe(503);
  });
  it("bloqueia gravação com service role após o período e permite suporte/contratação", async () => {
    loadAuthUser.mockResolvedValue({
      id: support.actor_user_id,
      is_platform_admin: false,
      organizations: [],
    });
    account.mockResolvedValue({
      data: { mode: "platform", state: "expired", access_until: "2020-01-01T00:00:00Z" },
      error: null,
    });
    expect((await requireSupportWrite())?.status).toBe(403);
    expect(await requireSupportWrite(undefined, { commercialExempt: true })).toBeNull();
    account.mockResolvedValue({ data: null, error: { message: "indisponível" } });
    expect((await requireSupportWrite())?.status).toBe(503);
  });
  it("callback OAuth não prolonga contrato encerrado e falha fechado", async () => {
    callback.mockResolvedValue({ data: true, error: null });
    account.mockResolvedValue({ data: { mode: "platform", state: "expired" }, error: null });
    expect(
      await supportCallbackWriteAllowed(
        support.organization_id,
        support.actor_user_id,
        support.auth_session_id,
      ),
    ).toBe(false);
    account.mockResolvedValue({ data: { mode: "legacy" }, error: null });
    expect(
      await supportCallbackWriteAllowed(
        support.organization_id,
        support.actor_user_id,
        support.auth_session_id,
      ),
    ).toBe(true);
    account.mockResolvedValue({ data: null, error: { message: "indisponível" } });
    expect(
      await supportCallbackWriteAllowed(
        support.organization_id,
        support.actor_user_id,
        support.auth_session_id,
      ),
    ).toBe(false);
    callback.mockResolvedValue({ data: false, error: null });
    expect(await supportCallbackWriteAllowed(support.organization_id)).toBe(false);
  });
});
