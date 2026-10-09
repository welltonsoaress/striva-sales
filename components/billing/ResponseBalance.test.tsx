import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResponseBalance } from "./ResponseBalance";

vi.mock("@/lib/i18n/IdiomaProvider", () => ({
  useT: () => (text: string) => text,
  useIdioma: () => "pt-BR",
}));
afterEach(cleanup);

const account = {
  mode: "platform",
  state: "active",
  monthly_remaining: 0,
  monthly_allowance: 1000,
  extra_remaining: 0,
  access_until: "2030-01-02T00:00:00Z",
  period_end: "2030-01-02T00:00:00Z",
};
const checkedAt = Date.parse("2030-01-01T12:00:00Z");

describe("próximo passo do saldo comercial", () => {
  it("franquia esgotada informa que o humano pode atender durante o período válido", () => {
    render(<ResponseBalance account={account} checkedAt={checkedAt} />);
    expect(screen.getByRole("heading", { name: "Seus créditos acabaram" })).toBeVisible();
    expect(screen.getByText(/Seu time pode continuar atendendo manualmente/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Ver créditos extras" })).toHaveAttribute(
      "href",
      "/app/settings/billing#creditos-extras",
    );
  });
  it("saldo menor que dez pausa; franquia e extras juntos podem completar a mensagem", () => {
    const first = render(
      <ResponseBalance
        account={{ ...account, monthly_remaining: 6, extra_remaining: 3 }}
        checkedAt={checkedAt}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Créditos insuficientes para continuar" }),
    ).toBeVisible();
    first.rerender(
      <ResponseBalance
        account={{ ...account, monthly_remaining: 6, extra_remaining: 4 }}
        checkedAt={checkedAt}
      />,
    );
    expect(screen.getByRole("heading", { name: "10 créditos disponíveis" })).toBeVisible();
  });

  it.each([null, "2030-01-01T12:00:00Z"])(
    "período ausente ou encerrado não anuncia permissão de atendimento humano: %s",
    (access_until) => {
      render(<ResponseBalance account={{ ...account, access_until }} checkedAt={checkedAt} />);
      expect(
        screen.getByRole("heading", { name: "Seu atendimento com IA está pausado" }),
      ).toBeVisible();
      expect(
        screen.getByText("Consulta, exportação, suporte e contratação continuam acessíveis."),
      ).toBeVisible();
      expect(
        screen.queryByText(/Seu time pode continuar atendendo manualmente/),
      ).not.toBeInTheDocument();
    },
  );
});
