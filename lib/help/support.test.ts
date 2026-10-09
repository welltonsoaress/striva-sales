import { beforeEach, expect, it, vi } from "vitest";
const call = vi.hoisted(() => vi.fn());
vi.mock("@/lib/agent-engine/edge/llm/run-model-call", () => ({
  runModelCall: call,
  llmEdgeConfigFromEnv: () => ({}),
}));
vi.mock("@/lib/agent-engine/db/request-pool", () => ({ getRequestPool: () => ({}) }));
vi.mock("@/lib/env", () => ({ env: {} }));
vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn() } }));
import { answerSupportQuestion, supportRequestSchema } from "./support";
beforeEach(() => {
  call.mockReset();
});
it("quando o modelo falha, a orientação identificada do manual mantém uma saída humana", async () => {
  call.mockRejectedValue(new Error("modelo indisponível"));
  const answer = await answerSupportQuestion({
    organizationId: "org-qa",
    role: "admin",
    question: "Conectar WhatsApp",
  });
  expect(answer.source).toBe("manual");
  expect(answer.body).toContain("QR code");
  expect(answer.body).toContain("Falar com uma pessoa");
});
it("uma dúvida ausente do manual segue para a equipe sem gastar com um modelo", async () => {
  expect(
    (
      await answerSupportQuestion({
        organizationId: "org-qa",
        role: "viewer",
        question: "asteroide xpto",
      })
    ).needsHuman,
  ).toBe(true);
  expect(call).not.toHaveBeenCalled();
});
it("o modelo recebe a organização autenticada e não oferece destino administrativo ao atendente", async () => {
  call.mockResolvedValue({
    result: { text: JSON.stringify({ answer: "Peça ajuda ao administrador.", needs_human: true }) },
  });
  const answer = await answerSupportQuestion({
    organizationId: "org-qa",
    role: "agent",
    question: "Conectar WhatsApp",
  });
  expect(answer.source).toBe("model");
  expect(answer.needsHuman).toBe(true);
  const options = call.mock.calls[0]![2];
  expect(options.tenantId).toBe("org-qa");
  expect(options.tools).toBeUndefined();
  expect(JSON.parse(options.messages[0].content).manual[0].destino).toBeNull();
});
it("o corpo não pode escolher organização ou autor e pergunta vazia não abre uma mensagem", () => {
  const ids = {
    thread_id: "aaaaaaaa-0000-4000-8000-000000000001",
    message_id: "aaaaaaaa-0000-4000-8000-000000000002",
    action: "send",
  };
  expect(supportRequestSchema.safeParse({ ...ids, body: " " }).success).toBe(false);
  expect(
    supportRequestSchema.safeParse({ ...ids, body: "Ajuda", organization_id: "outra" }).success,
  ).toBe(false);
});
