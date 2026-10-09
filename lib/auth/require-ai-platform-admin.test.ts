import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ role: vi.fn(), debt: vi.fn(), db: vi.fn(), scope: "full", mfa: false, aal: "aal2" }));
vi.mock("./require-role", () => ({ requireRole: mocks.role }));
vi.mock("./server", () => ({ mfaEmDivida: mocks.debt }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.db }));
import { requireAiPlatformAdmin } from "./require-ai-platform-admin";

beforeEach(() => {
  vi.clearAllMocks(); mocks.scope = "full"; mocks.mfa = false; mocks.aal = "aal2";
  mocks.role.mockResolvedValue({ ok: true, user: { id: "operator", is_platform_admin: true }, org: { orgId: "own-org" } });
  mocks.debt.mockResolvedValue(false);
  const query = { select: () => query, eq: () => query, is: () => query,
    maybeSingle: async () => ({ data: { scope: mocks.scope, mfa_required: mocks.mfa }, error: null }) };
  mocks.db.mockResolvedValue({ from: () => query, auth: { mfa: { getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: mocks.aal } }) } } });
});
it("tenant admin e sessão de suporte nunca alteram conexão de IA", async () => {
  for (const user of [{ id: "tenant", is_platform_admin: false }, { id: "operator", is_platform_admin: true, support: {} }]) {
    mocks.role.mockResolvedValue({ ok: true, user, org: { orgId: "own-org" } });
    const result = await requireAiPlatformAdmin();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  }
  expect(mocks.db).not.toHaveBeenCalled();
});
it("somente plataforma completa com MFA em dia passa", async () => {
  mocks.scope = "readonly";
  expect((await requireAiPlatformAdmin()).ok).toBe(false);
  mocks.scope = "full"; mocks.debt.mockResolvedValue(true);
  expect((await requireAiPlatformAdmin()).ok).toBe(false);
  mocks.debt.mockResolvedValue(false); mocks.mfa = true; mocks.aal = "aal1";
  expect((await requireAiPlatformAdmin()).ok).toBe(false);
  mocks.aal = "aal2";
  expect((await requireAiPlatformAdmin()).ok).toBe(true);
});
