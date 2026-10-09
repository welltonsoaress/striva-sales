import { expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { receiveHotmart } from "./receive-hotmart";

function receiver(hottok = "synthetic-only") {
  const query = vi.fn().mockResolvedValue({ rows: [] });
  return {
    hottok,
    pool: vi.fn(() => ({ query }) as unknown as Pool),
    rateLimit: vi.fn().mockResolvedValue(true),
    ok: (data: unknown) => Response.json({ data }),
    fail: (code: string, message: string, status: number) =>
      Response.json({ error: { code, message } }, { status }),
    audit: vi.fn().mockResolvedValue(undefined),
    onFailure: vi.fn(),
    query,
  };
}
function request(body: unknown, token = "synthetic-only") {
  return new Request("https://example.test/hotmart", {
    method: "POST",
    headers: { "x-hotmart-hottok": token },
    body: JSON.stringify(body),
  });
}
const unsupported = {
  id: "unknown-event",
  version: "2.0.0",
  creation_date: Date.now(),
  event: "UNKNOWN",
  data: { buyer: { email: "discard@qa.test" } },
};

it("não lê banco nem consome limite com token inválido ou configuração ausente", async () => {
  for (const [token, configured, status] of [
    ["wrong", "synthetic-only", 401],
    ["synthetic-only", "", 503],
  ] as const) {
    const deps = receiver(configured);
    expect((await receiveHotmart(request({}, token), deps)).status).toBe(status);
    expect(deps.rateLimit).not.toHaveBeenCalled();
    expect(deps.pool).not.toHaveBeenCalled();
  }
});
it("limita eventos autenticados antes de consultar o banco", async () => {
  const deps = receiver();
  deps.rateLimit.mockResolvedValue(false);
  expect((await receiveHotmart(request(unsupported), deps)).status).toBe(429);
  expect(deps.pool).not.toHaveBeenCalled();
});
it("valida tamanho em bytes, formato e datas futuras", async () => {
  for (const [body, status] of [
    [{ extra: "á".repeat(51_000) }, 413],
    [{}, 422],
    [{ ...unsupported, creation_date: Date.now() + 3600_000 }, 422],
  ] as const) {
    const deps = receiver();
    expect((await receiveHotmart(request(body), deps)).status).toBe(status);
    expect(deps.pool).not.toHaveBeenCalled();
  }
});
it("mantém evento não suportado visível sem persistir comprador", async () => {
  const deps = receiver();
  expect(await (await receiveHotmart(request(unsupported), deps)).json()).toEqual({
    data: { received: true, state: "unsupported" },
  });
  expect(JSON.stringify(deps.query.mock.calls)).not.toContain("discard@qa.test");
  expect(deps.audit).not.toHaveBeenCalled();
});
it("responde 503 para o provedor tentar novamente após falha de persistência", async () => {
  const deps = receiver();
  deps.query.mockRejectedValue(new Error("private database details"));
  const response = await receiveHotmart(request(unsupported), deps);
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("private database");
  expect(deps.onFailure).toHaveBeenCalledOnce();
});
