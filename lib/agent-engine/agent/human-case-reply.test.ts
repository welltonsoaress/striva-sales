import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ resolve: vi.fn(), info: vi.fn(), enqueue: vi.fn() }));
vi.mock("./human-cases", () => ({
  resolveCaseFromHuman: mocks.resolve,
  markAwaitingLead: mocks.info,
}));
vi.mock("../queue/queue", () => ({ enqueueJob: mocks.enqueue }));
import { commitHumanCaseReply } from "./human-case-reply";
const input = {
  organizationId: "org-qa",
  caseId: "case-qa",
  actorUserId: "user-qa",
  contactId: "contact-qa",
  action: "resolved" as const,
  body: "Pode continuar com a condição aprovada.",
  expectedUpdatedAt: "2026-10-05T10:00:00Z",
};
function fixture(current = true) {
  const query = vi.fn(async (sql: string) => ({
    rows: sql.includes("for update") && current ? [{ id: "case-qa" }] : [],
  }));
  const client = { query, release: vi.fn() };
  return { client, pool: { connect: vi.fn(async () => client) } as never };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.resolve.mockResolvedValue(true);
  mocks.info.mockResolvedValue(true);
  mocks.enqueue.mockResolvedValue("job-qa");
});
it("trava a versão conferida e enfileira a orientação no mesmo commit da decisão", async () => {
  const db = fixture();
  expect(await commitHumanCaseReply(db.pool, input)).toBe(true);
  expect(db.client.query).toHaveBeenCalledWith(expect.stringContaining("ac.organization_id = $1"), [
    "org-qa",
    "case-qa",
    input.expectedUpdatedAt,
    "contact-qa",
  ]);
  expect(mocks.enqueue).toHaveBeenCalledWith(db.client, "org-qa", {
    kind: "case_reply_turn",
    leadId: "contact-qa",
    payload: { case_id: "case-qa", action: "resolved", body: input.body },
  });
  expect(db.client.query).toHaveBeenLastCalledWith("commit");
});
it("caso alterado depois da proposta não altera nem enfileira atendimento", async () => {
  const db = fixture(false);
  expect(await commitHumanCaseReply(db.pool, input)).toBe(false);
  expect(mocks.resolve).not.toHaveBeenCalled();
  expect(mocks.enqueue).not.toHaveBeenCalled();
  expect(db.client.query).toHaveBeenLastCalledWith("rollback");
});
it("falha da fila desfaz a decisão e libera a conexão", async () => {
  const db = fixture();
  mocks.enqueue.mockRejectedValueOnce(new Error("queue_failed"));
  await expect(commitHumanCaseReply(db.pool, input)).rejects.toThrow("queue_failed");
  expect(db.client.query).toHaveBeenLastCalledWith("rollback");
  expect(db.client.release).toHaveBeenCalledOnce();
});
it("pedido de informação usa a mesma fila e o estado awaiting_lead", async () => {
  const db = fixture();
  await commitHumanCaseReply(db.pool, { ...input, action: "need_lead_info" });
  expect(mocks.info).toHaveBeenCalled();
  expect(mocks.resolve).not.toHaveBeenCalled();
});
