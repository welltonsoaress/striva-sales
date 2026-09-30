import { beforeEach, expect, it, vi } from "vitest";

const { getUser, redirect } = vi.hoisted(() => ({
  getUser: vi.fn(),
  redirect: vi.fn((url: string) => { throw new Error(`NEXT_REDIRECT:${url}`); }),
}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser } }) }));
vi.mock("@/lib/branding/saida", () => ({ marcaDaSaida: async () => ({ nome: "Striva Sales" }) }));
vi.mock("@/components/auth/LoginForm", () => ({ LoginForm: () => null }));

import LoginPage from "@/app/(public)/login/page";

beforeEach(() => vi.clearAllMocks());

it("sessão validada entra no sistema sem pedir senha novamente", async () => {
  getUser.mockResolvedValue({ data: { user: { id: "usuario-ficticio" } } });
  await expect(LoginPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_REDIRECT:/app");
  expect(getUser).toHaveBeenCalledOnce();
});

it("visitante sem sessão continua recebendo a tela de login", async () => {
  getUser.mockResolvedValue({ data: { user: null } });
  expect(await LoginPage({ searchParams: Promise.resolve({}) })).toBeTruthy();
  expect(redirect).not.toHaveBeenCalled();
});

it("sessão criada pela confirmação de um convite inválido preserva o aviso de acesso", async () => {
  getUser.mockResolvedValue({ data: { user: { id: "convidado-ficticio" } } });
  expect(await LoginPage({ searchParams: Promise.resolve({ error: "convite_invalido" }) })).toBeTruthy();
  expect(redirect).not.toHaveBeenCalled();
});
