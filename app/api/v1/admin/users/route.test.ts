import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { guard, lookup, invite, support } = vi.hoisted(() => ({
  guard: vi.fn(),
  lookup: vi.fn(),
  invite: vi.fn(),
  support: vi.fn(),
}));
vi.mock("@/lib/auth/admin-mutation", () => ({ requireAdminMutation: guard }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: support }));
vi.mock("@/lib/auth/issue-invite", () => ({ issueInvite: invite }));
vi.mock("@/lib/auth/requirePlatformAdmin", () => ({ requirePlatformAdmin: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: lookup }) }) }),
  }),
}));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));

import { POST } from "./route";
const payload = {
  email: "cliente@invitation.test",
  organization_id: "ba20e60b-4df5-4498-84f3-391b6774f739",
  role: "admin",
};
const request = (body: unknown = payload) =>
  new NextRequest("http://localhost/api/v1/admin/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.resetAllMocks();
  support.mockResolvedValue(null);
  guard.mockResolvedValue({
    ok: true,
    user: { id: "operator-fixture", user_metadata: { full_name: "Operador fictício" } },
  });
  lookup.mockResolvedValue({ data: { display_name: "Empresa fictícia" }, error: null });
  invite.mockResolvedValue({
    email_dispatched: true,
    accept_url: "http://localhost/invite/fixture",
  });
});
it("não consulta empresas nem envia e-mail quando a escrita é negada", async () => {
  guard.mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) });
  expect((await POST(request())).status).toBe(403);
  expect(lookup).not.toHaveBeenCalled();
  expect(invite).not.toHaveBeenCalled();
});
it("não cria convite para dados inválidos ou empresa inexistente", async () => {
  expect((await POST(request({ ...payload, role: "platform_admin" }))).status).toBe(422);
  lookup.mockResolvedValue({ data: null, error: null });
  expect((await POST(request())).status).toBe(404);
  expect(invite).not.toHaveBeenCalled();
});
it("um convite válido usa a jornada de confirmação e senha da empresa escolhida", async () => {
  const response = await POST(request());
  expect(response.status).toBe(201);
  expect(invite).toHaveBeenCalledWith(
    expect.objectContaining({
      organizationId: payload.organization_id,
      email: payload.email,
      role: payload.role,
      inviterId: "operator-fixture",
      interfaceSettings: { preset: "simplificada" },
    }),
  );
  expect((await response.json()).data.email_dispatched).toBe(true);
});
it("falha do fluxo de convite retorna erro retomável no contrato da API", async () => {
  invite.mockRejectedValue(new Error("fixture-unavailable"));
  const response = await POST(request());
  expect(response.status).toBe(503);
  expect((await response.json()).error.code).toBe("unavailable");
});
