import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventRow } from "@/lib/event-log/dispatcher";

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  postpone: vi.fn(),
  audit: vi.fn(),
}));
vi.mock("@/lib/automation/actions", () => ({
  getAction: (type: string) => ({
    type,
    execute: mocks.execute,
    postponeUntil: mocks.postpone,
  }),
}));
vi.mock("@/lib/audit", () => ({ audit: mocks.audit }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

import { AUTOMATION_CONSUMER_KEY, runAutomationForEvent } from "./engine";

const event: EventRow = {
  id: "event-a",
  organization_id: "org-a",
  event_type: "contact.tag_added",
  entity_kind: "contact",
  entity_id: null,
  payload: { organization_id: "org-untrusted" },
  metadata: {},
  consumed_by: [],
  attempts: 0,
};

function fixture(account: Record<string, unknown> | null, accountError = false) {
  const runs: Array<Record<string, unknown>> = [];
  const counterWrites: Array<Record<string, unknown>> = [];
  const from = vi.fn((table: string) => {
    const filters = new Map<string, unknown>();
    let mode: "select" | "insert" | "update" = "select";
    let mutation: Record<string, unknown> | null = null;
    let columns = "";
    const result = () => {
      if (table !== "automation_rule_runs") {
        // Também exige o escopo nos dois acessos do contador com service role.
        expect(filters.get("organization_id")).toBe(event.organization_id);
      }
      if (table === "organization_ai_accounts") {
        return {
          data: account,
          error: accountError ? { message: "connection unavailable" } : null,
        };
      }
      if (table === "automation_rule_runs") {
        expect(mode).toBe("insert");
        expect(mutation?.organization_id).toBe(event.organization_id);
        runs.push(mutation!);
        return { data: { id: "run-a" }, error: null };
      }
      if (table !== "automation_rules") throw new Error(`Tabela inesperada: ${table}`);
      if (mode === "update") {
        expect(filters.get("id")).toBe("rule-a");
        counterWrites.push(mutation!);
        return { data: null, error: null };
      }
      if (columns === "run_count") {
        expect(filters.get("id")).toBe("rule-a");
        return { data: { run_count: 4 }, error: null };
      }
      return {
        data: [
          {
            id: "rule-a",
            name: "Regra fictícia",
            conditions: [],
            actions: [{ type: "assign_owner" }, { type: "create_or_move_lead" }],
          },
        ],
        error: null,
      };
    };
    const builder = {
      select: (value: string) => {
        columns = value;
        return builder;
      },
      eq: (key: string, value: unknown) => {
        filters.set(key, value);
        return builder;
      },
      order: () => builder,
      insert: (value: Record<string, unknown>) => {
        mode = "insert";
        mutation = value;
        return builder;
      },
      update: (value: Record<string, unknown>) => {
        mode = "update";
        mutation = value;
        return builder;
      },
      maybeSingle: async () => result(),
      then: (resolve: (value: ReturnType<typeof result>) => unknown) =>
        Promise.resolve(result()).then(resolve),
    };
    return builder;
  });
  return { admin: { from } as unknown as SupabaseClient, runs, counterWrites };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.postpone.mockResolvedValue(null);
  mocks.execute.mockImplementation(async () => ({ type: "crm", status: "success" }));
});

describe("contrato comercial do worker de automações", () => {
  it.each([
    { mode: "platform", state: "expired", access_until: "2099-01-01T00:00:00Z" },
    { mode: "platform", state: "suspended", access_until: "2099-01-01T00:00:00Z" },
    { mode: "platform", state: "active", access_until: "2000-01-01T00:00:00Z" },
  ])("não altera o CRM com contrato indisponível: $state/$access_until", async (account) => {
    const f = fixture(account);
    // O adiamento não pode esconder a recusa até a próxima janela de envio.
    mocks.postpone.mockResolvedValue("2099-01-01T00:00:00Z");
    const result = await runAutomationForEvent(f.admin, event);
    expect(result).toEqual({
      consumer_key: AUTOMATION_CONSUMER_KEY,
      status: "skipped",
      detail: "commercial_read_only",
    });
    expect(mocks.postpone).not.toHaveBeenCalled();
    expect(mocks.execute).not.toHaveBeenCalled();
    expect(f.runs).toHaveLength(1);
    expect(f.runs[0]).toMatchObject({
      status: "failed",
      actions_result: [
        { type: "assign_owner", status: "skipped", detail: { reason: "commercial_read_only" } },
        {
          type: "create_or_move_lead",
          status: "skipped",
          detail: { reason: "commercial_read_only" },
        },
      ],
    });
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: event.organization_id,
        metadata: expect.objectContaining({ status: "failed" }),
      }),
    );
  });

  it.each([
    { mode: "legacy", state: "active", access_until: null },
    {
      mode: "platform",
      state: "active",
      access_until: "2099-01-01T00:00:00Z",
      monthly_remaining: 0,
      extra_remaining: 0,
    },
  ])("preserva operações de CRM permitidas, inclusive sem saldo: $mode", async (account) => {
    const f = fixture(account);
    expect(await runAutomationForEvent(f.admin, event)).toEqual({
      consumer_key: AUTOMATION_CONSUMER_KEY,
      status: "ok",
    });
    expect(mocks.execute).toHaveBeenCalledTimes(2);
    expect(mocks.postpone.mock.calls.map(([ctx]) => ctx.actionIndex)).toEqual([0, 1]);
    expect(mocks.execute.mock.calls.map(([ctx]) => ctx.actionIndex)).toEqual([0, 1]);
    expect(f.runs[0]?.status).toBe("success");
    expect(f.counterWrites).toEqual([expect.objectContaining({ run_count: 5 })]);
  });

  it.each([false, true])(
    "falha de consulta preserva retry do consumidor, sem falso sucesso (%s)",
    async (accountError) => {
      const f = fixture(null, accountError);
      const result = await runAutomationForEvent(f.admin, event);
      expect(result).toMatchObject({ consumer_key: AUTOMATION_CONSUMER_KEY, status: "error" });
      expect(result.detail).toContain("Não foi possível confirmar");
      expect(mocks.postpone).not.toHaveBeenCalled();
      expect(mocks.execute).not.toHaveBeenCalled();
      expect(f.runs).toEqual([]);
      expect(f.counterWrites).toEqual([]);
    },
  );
});
