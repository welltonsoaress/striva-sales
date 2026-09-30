import { beforeEach, expect, it, vi } from "vitest";

const { getUser } = vi.hoisted(() => ({
  getUser: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser } }) }));
vi.mock("next/font/google", () => ({ Manrope: () => ({ variable: "fonte-comercial" }) }));
vi.mock("@/components/marketing/LandingPage", () => ({ LandingPage: () => null }));

import HomePage from "@/app/page";

beforeEach(() => vi.clearAllMocks());

it("Entrar aponta ao sistema quando a sessão é validada", async () => {
  getUser.mockResolvedValue({ data: { user: { id: "usuario-ficticio" } } });
  const page = await HomePage();
  expect(page.props.children.props.loginHref).toBe("/app");
  expect(getUser).toHaveBeenCalledOnce();
});

it("Entrar aponta ao login para visitante sem sessão", async () => {
  getUser.mockResolvedValue({ data: { user: null } });
  const page = await HomePage();
  expect(page.props.children.props.loginHref).toBe("/login");
});

it("sessão rejeitada pelo servidor volta ao login", async () => {
  getUser.mockResolvedValue({ data: { user: null }, error: { message: "Sessão inválida" } });
  const page = await HomePage();
  expect(page.props.children.props.loginHref).toBe("/login");
});
