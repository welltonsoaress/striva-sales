import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  move: vi.fn(),
  book: vi.fn(),
  audit: vi.fn(),
  alert: vi.fn(),
  caseReply: vi.fn(),
}));
vi.mock("@/lib/agent-engine/db/request-pool", () => ({ getRequestPool: () => ({}) }));
vi.mock("@/lib/agent-engine/agent/human-case-reply", () => ({
  commitHumanCaseReply: mocks.caseReply,
}));
vi.mock("@/lib/env", () => ({ env: { INTERNAL_SECRET: "test-secret" } }));
vi.mock("@/lib/audit", () => ({ audit: mocks.audit }));
vi.mock("@/lib/mcp/tools", () => ({
  getToolByName: (name: string) => ({
    handler: name === "crm_book_appointment" ? mocks.book : mocks.move,
  }),
}));
vi.mock("@/lib/management/failure", () => ({ reportManagementActionProblem: mocks.alert }));
vi.mock("@/lib/tarefas/atividade", () => ({ registraAtividadeDaTarefa: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

import { managementActionCodeHash } from "./action-code";
import { confirmManagementAction, managementProposalTool } from "./actions";

const identity = {
  organizationId: "org-a",
  channelSessionId: "session-a",
  managerUserId: "manager-a",
};
const codeHash = managementActionCodeHash(identity, "123456");

function fixture(
  options: { account?: Record<string, unknown> | null; accountError?: boolean } = {},
) {
  let memberActive = true;
  let bindingEnabled = true;
  let appointmentPersisted = true;
  let leadStage = "stage-old";
  let completedPrevious: { codeHash: string; result: string } | null = null;
  const action = {
    id: "action-a",
    organization_id: "org-a",
    channel_session_id: "session-a",
    manager_user_id: "manager-a",
    action: "move_lead_stage",
    payload: { lead_id: "lead-a", from_stage_id: "stage-old", to_stage_id: "stage-new" },
    code_hash: codeHash,
    status: "pending",
    attempts: 0,
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    result_body: null as string | null,
  };
  const from = vi.fn((table: string) => {
    const filters = new Map<string, unknown>();
    let update: Record<string, unknown> | null = null;
    const result = () => {
      if (table === "organization_ai_accounts") {
        expect(filters.get("organization_id")).toBe(identity.organizationId);
        return {
          data: options.account === undefined ? { mode: "legacy" } : options.account,
          error: options.accountError ? { message: "unavailable" } : null,
        };
      }
      if (table === "management_bindings")
        return {
          data: {
            enabled: bindingEnabled,
            verified_at: new Date().toISOString(),
            actions_enabled: true,
            manager_user_id: "manager-a",
          },
          error: null,
        };
      if (table === "user_organizations")
        return { data: memberActive ? { id: "membership-a" } : null, error: null };
      if (table === "crm_leads") return { data: { stage_id: leadStage }, error: null };
      if (table === "calendar_event_types")
        return { data: { id: "type-a", is_active: true }, error: null };
      if (table === "calendar_appointments")
        return {
          data: appointmentPersisted ? { id: "appointment-a", status: "confirmed" } : null,
          error: null,
        };
      if (table !== "management_actions") throw new Error(`unexpected table: ${table}`);
      if (update) {
        if (filters.get("status") !== action.status) return { data: null, error: null };
        Object.assign(action, update);
        return { data: { id: action.id }, error: null };
      }
      if (filters.get("status") && filters.get("status") !== action.status)
        return { data: null, error: null };
      if (filters.get("code_hash") && filters.get("code_hash") !== action.code_hash) {
        if (completedPrevious && filters.get("code_hash") === completedPrevious.codeHash)
          return {
            data: { status: "completed", result_body: completedPrevious.result },
            error: null,
          };
        return { data: null, error: null };
      }
      return { data: { ...action }, error: null };
    };
    const q = {
      select: () => q,
      eq: (key: string, value: unknown) => {
        filters.set(key, value);
        return q;
      },
      in: () => q,
      is: () => q,
      not: () => q,
      order: () => q,
      limit: () => q,
      update: (value: Record<string, unknown>) => {
        update = value;
        return q;
      },
      maybeSingle: async () => result(),
      then: (resolve: (value: ReturnType<typeof result>) => void) =>
        Promise.resolve(result()).then(resolve),
    };
    return q;
  });
  return {
    admin: { from } as never,
    action,
    revoke: () => {
      memberActive = false;
    },
    disable: () => {
      bindingEnabled = false;
    },
    hideAppointment: () => {
      appointmentPersisted = false;
    },
    moveLeadElsewhere: () => {
      leadStage = "stage-other";
    },
    addCompletedPrevious: (hash: string, result: string) => {
      completedPrevious = { codeHash: hash, result };
    },
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.move.mockResolvedValue({ lead: { id: "lead-a" } });
  mocks.book.mockResolvedValue({ marcado: true, compromisso: { id: "appointment-a" } });
  mocks.audit.mockResolvedValue(undefined);
  mocks.alert.mockResolvedValue(undefined);
});

describe("confirmação de comandos do gestor", () => {
  it.each(["expired", "suspended", "active"])(
    "recusa alteração com período vencido mesmo com código válido e estado %s",
    async (state) => {
      const db = fixture({ account: { mode: "platform", state, access_until: "2000-01-01" } });
      expect(
        await confirmManagementAction(db.admin, { ...identity, hash: `confirm:${codeHash}` }),
      ).toContain("período contratado terminou");
      expect(db.action.status).toBe("pending");
      expect(db.action.attempts).toBe(0);
      expect(mocks.move).not.toHaveBeenCalled();
      expect(mocks.caseReply).not.toHaveBeenCalled();
    },
  );

  it("saldo esgotado preserva os comandos humanos durante o período contratado", async () => {
    const db = fixture({
      account: {
        mode: "platform",
        state: "active",
        access_until: "2100-01-01",
        monthly_remaining: 0,
        extra_remaining: 0,
      },
    });
    expect(
      await confirmManagementAction(db.admin, { ...identity, hash: `confirm:${codeHash}` }),
    ).toContain("Negócio movido");
    expect(mocks.move).toHaveBeenCalledTimes(1);
  });

  it("falha na consulta comercial impede execução sem afirmar cancelamento definitivo", async () => {
    const db = fixture({ account: null, accountError: true });
    await expect(
      confirmManagementAction(db.admin, { ...identity, hash: `confirm:${codeHash}` }),
    ).rejects.toMatchObject({ status: 503 });
    expect(db.action.status).toBe("pending");
    expect(mocks.move).not.toHaveBeenCalled();
  });

  it("não prepara proposta para uma empresa cujo período terminou", async () => {
    const db = fixture({
      account: { mode: "platform", state: "expired", access_until: "2000-01-01" },
    });
    const proposal = managementProposalTool(db.admin, {
      ...identity,
      messageId: "message-expired",
    });
    const execute = proposal.definition.execute as unknown as (value: unknown) => Promise<unknown>;
    expect(
      await execute({ action: "create_task", title: "Retorno", due_at: "2100-01-01T10:00:00Z" }),
    ).toMatchObject({ message: expect.stringContaining("período contratado terminou") });
    expect(proposal.reply).toBeNull();
    expect(mocks.audit).not.toHaveBeenCalled();
  });
  it("orientação de caso exige confirmação e não repete a transição ao receber o código novamente", async () => {
    const db = fixture();
    db.action.action = "reply_case";
    Object.assign(db.action.payload, {
      case_id: "11111111-1111-4111-8111-111111111111",
      contact_id: "22222222-2222-4222-8222-222222222222",
      case_action: "resolved",
      body: "Pode conceder o desconto aprovado.",
      expected_updated_at: "2026-10-05T10:00:00Z",
    });
    mocks.caseReply.mockResolvedValue(true);
    const input = { ...identity, hash: `confirm:${codeHash}` };
    expect(await confirmManagementAction(db.admin, input)).toContain("encaminhada à fila da IA");
    await confirmManagementAction(db.admin, input);
    expect(mocks.caseReply).toHaveBeenCalledTimes(1);
    expect(mocks.caseReply).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        organizationId: "org-a",
        actorUserId: "manager-a",
        body: "Pode conceder o desconto aprovado.",
        action: "resolved",
      }),
    );
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ai.case_replied" }),
    );
  });
  it("caso alterado durante a confirmação recusa a ação sem executar outro comando", async () => {
    const db = fixture();
    db.action.action = "reply_case";
    Object.assign(db.action.payload, {
      case_id: "11111111-1111-4111-8111-111111111111",
      contact_id: "22222222-2222-4222-8222-222222222222",
      case_action: "resolved",
      body: "Orientação",
      expected_updated_at: "2026-10-05T10:00:00Z",
    });
    mocks.caseReply.mockResolvedValue(false);
    expect(
      await confirmManagementAction(db.admin, { ...identity, hash: `confirm:${codeHash}` }),
    ).toContain("caso mudou");
    expect(db.action.status).toBe("failed");
    expect(mocks.move).not.toHaveBeenCalled();
  });
  it("o modelo não pode inventar nem reescrever a orientação humana", async () => {
    const proposal = managementProposalTool(fixture().admin, {
      ...identity,
      messageId: "message-qa",
      question: "caso: pode conceder 5%",
    });
    const execute = proposal.definition.execute as unknown as (value: unknown) => Promise<unknown>;
    expect(
      await execute({
        action: "reply_case",
        case_id: "11111111-1111-4111-8111-111111111111",
        case_action: "resolved",
        body: "Pode conceder 20%",
      }),
    ).toMatchObject({ message: expect.stringContaining("copiar exatamente") });
    expect(proposal.reply).toBeNull();
    expect(mocks.caseReply).not.toHaveBeenCalled();
  });
  it("fixa na proposta o responsável da agenda escolhido antes da confirmação", async () => {
    const ownerId = "44444444-4444-4444-8444-444444444444";
    let saved: Record<string, unknown> | null = null;
    const from = (table: string) => {
      const q = {
        select: () => q,
        eq: () => q,
        in: () => q,
        is: () => q,
        not: () => q,
        neq: () => q,
        update: () => q,
        insert: (value: Record<string, unknown>) => {
          saved = value;
          return q;
        },
        single: async () => ({ data: { id: "action-a" }, error: null }),
        maybeSingle: async () => ({
          error: null,
          data:
            table === "organization_ai_accounts"
              ? { mode: "legacy" }
              : table === "user_organizations"
                ? { id: "member" }
                : table === "management_bindings"
                  ? {
                      enabled: true,
                      actions_enabled: true,
                      verified_at: "2026-09-01",
                      manager_user_id: "manager-a",
                    }
                  : table === "contacts"
                    ? { id: "contact-a", display_name: "Contato de teste" }
                    : {
                        id: "type-a",
                        name: "Consulta",
                        is_active: true,
                        default_owner_user_id: ownerId,
                      },
        }),
        then: (resolve: (value: { error: null }) => void) =>
          Promise.resolve({ error: null }).then(resolve),
      };
      return q;
    };
    const proposal = managementProposalTool({ from } as never, {
      ...identity,
      messageId: "message-a",
    });
    const execute = proposal.definition.execute as unknown as (value: unknown) => Promise<unknown>;
    expect(
      await execute({
        action: "book_appointment",
        contact_id: "11111111-1111-4111-8111-111111111111",
        event_type_slug: "consulta",
        starts_at: new Date(Date.now() + 86_400_000).toISOString(),
        customer_agreed: true,
      }),
    ).toMatchObject({ prepared: true });
    expect(saved).toMatchObject({ payload: { owner_user_id: ownerId, event_type_id: "type-a" } });
    expect(mocks.book).not.toHaveBeenCalled();
  });

  it("prepara mudança de etapa sem executar o CRM e guarda apenas o hash do código", async () => {
    const leadId = "11111111-1111-4111-8111-111111111111";
    const oldStageId = "22222222-2222-4222-8222-222222222222";
    const newStageId = "33333333-3333-4333-8333-333333333333";
    let saved: Record<string, unknown> | null = null;
    const from = (table: string) => {
      const filters = new Map<string, unknown>();
      let insertion: Record<string, unknown> | null = null;
      const q = {
        select: () => q,
        eq: (key: string, value: unknown) => {
          filters.set(key, value);
          return q;
        },
        in: () => q,
        is: () => q,
        not: () => q,
        neq: () => q,
        update: () => q,
        insert: (value: Record<string, unknown>) => {
          insertion = value;
          return q;
        },
        single: async () => {
          saved = insertion;
          return { data: { id: "action-a" }, error: null };
        },
        maybeSingle: async () => ({
          error: null,
          data:
            table === "organization_ai_accounts"
              ? { mode: "legacy" }
              : table === "user_organizations"
                ? { id: "member" }
                : table === "management_bindings"
                  ? {
                      enabled: true,
                      verified_at: "2026-09-24",
                      actions_enabled: true,
                      manager_user_id: "manager-a",
                    }
                  : table === "crm_leads"
                    ? {
                        id: leadId,
                        title: "Negócio de teste",
                        pipeline_id: "pipeline-a",
                        stage_id: oldStageId,
                        status: "open",
                      }
                    : table === "crm_stages"
                      ? filters.get("id") === newStageId
                        ? {
                            id: newStageId,
                            name: "Agendado",
                            pipeline_id: "pipeline-a",
                            is_archived: false,
                          }
                        : { id: oldStageId, name: "Contato inicial" }
                      : null,
        }),
        then: (resolve: (value: { error: null }) => void) => {
          if (insertion) saved = insertion;
          return Promise.resolve({ error: null }).then(resolve);
        },
      };
      return q;
    };
    const proposal = managementProposalTool({ from } as never, {
      ...identity,
      messageId: "message-a",
    });
    const execute = proposal.definition.execute as unknown as (value: unknown) => Promise<unknown>;
    const result = await execute({
      action: "move_lead_stage",
      lead_id: leadId,
      to_stage_id: newStageId,
    });
    expect(result).toMatchObject({ prepared: true });
    expect(proposal.reply).toContain("Negócio de teste");
    expect(proposal.reply).toContain("CONFIRMAR");
    expect(saved).toMatchObject({
      action: "move_lead_stage",
      code_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    expect(JSON.stringify(saved)).not.toContain("CONFIRMAR");
    expect(mocks.move).not.toHaveBeenCalled();
  });

  it("executa uma vez e devolve o resultado persistido quando o mesmo código reaparece", async () => {
    const db = fixture();
    const input = { ...identity, hash: `confirm:${codeHash}` };
    expect(await confirmManagementAction(db.admin, input)).toBe(
      "Negócio movido para a etapa solicitada.",
    );
    expect(db.action.status).toBe("completed");
    expect(await confirmManagementAction(db.admin, input)).toBe(
      "Negócio movido para a etapa solicitada.",
    );
    expect(mocks.move).toHaveBeenCalledTimes(1);
  });

  it("recusa comando quando o acesso do gestor foi revogado", async () => {
    const db = fixture();
    db.revoke();
    expect(
      await confirmManagementAction(db.admin, { ...identity, hash: `confirm:${codeHash}` }),
    ).toContain("acesso");
    expect(mocks.move).not.toHaveBeenCalled();
  });

  it("recusa comando quando a função foi desligada", async () => {
    const db = fixture();
    db.disable();
    expect(
      await confirmManagementAction(db.admin, { ...identity, hash: `confirm:${codeHash}` }),
    ).toContain("configuração");
    expect(mocks.move).not.toHaveBeenCalled();
  });

  it("código incorreto consome tentativa sem executar a ferramenta", async () => {
    const db = fixture();
    expect(
      await confirmManagementAction(db.admin, {
        ...identity,
        hash: `confirm:${managementActionCodeHash(identity, "654321")}`,
      }),
    ).toContain("Código incorreto");
    expect(db.action.attempts).toBe(1);
    expect(mocks.move).not.toHaveBeenCalled();
  });

  it("repetição de código concluído não consome tentativas da proposta nova", async () => {
    const db = fixture();
    const oldHash = managementActionCodeHash(identity, "654321");
    db.addCompletedPrevious(oldHash, "Tarefa já criada.");
    expect(
      await confirmManagementAction(db.admin, { ...identity, hash: `confirm:${oldHash}` }),
    ).toBe("Tarefa já criada.");
    expect(db.action.status).toBe("pending");
    expect(db.action.attempts).toBe(0);
    expect(mocks.move).not.toHaveBeenCalled();
  });

  it("reserva na agenda só confirma após ler o compromisso persistido", async () => {
    const db = fixture();
    db.action.action = "book_appointment";
    Object.assign(db.action.payload, {
      contact_id: "contact-a",
      event_type_slug: "consulta",
      event_type_id: "type-a",
      owner_user_id: "owner-a",
      starts_at: "2026-10-01T13:00:00Z",
    });
    expect(
      await confirmManagementAction(db.admin, { ...identity, hash: `confirm:${codeHash}` }),
    ).toBe("Agendamento registrado e confirmado na agenda.");
    expect(mocks.book).toHaveBeenCalledTimes(1);
    expect(db.action.status).toBe("completed");
  });

  it("recusa de disponibilidade encerra a proposta sem afirmar reserva", async () => {
    const db = fixture();
    db.action.action = "book_appointment";
    Object.assign(db.action.payload, {
      contact_id: "contact-a",
      event_type_slug: "consulta",
      event_type_id: "type-a",
      owner_user_id: "owner-a",
      starts_at: "2026-10-01T13:00:00Z",
    });
    mocks.book.mockResolvedValue({ marcado: false, motivo: "agenda_horario_ocupado" });
    expect(
      await confirmManagementAction(db.admin, { ...identity, hash: `confirm:${codeHash}` }),
    ).toContain("não foi feito");
    expect(db.action.status).toBe("failed");
    expect(mocks.alert).not.toHaveBeenCalled();
  });

  it("sem leitura posterior da reserva, mantém resultado incerto e avisa a Central", async () => {
    const db = fixture();
    db.action.action = "book_appointment";
    Object.assign(db.action.payload, {
      contact_id: "contact-a",
      event_type_slug: "consulta",
      event_type_id: "type-a",
      owner_user_id: "owner-a",
      starts_at: "2026-10-01T13:00:00Z",
    });
    db.hideAppointment();
    expect(
      await confirmManagementAction(db.admin, { ...identity, hash: `confirm:${codeHash}` }),
    ).toContain("resultado da ação");
    expect(db.action.status).toBe("uncertain");
    expect(mocks.alert).toHaveBeenCalledTimes(1);
  });

  it("devolve resultado antigo mesmo se uma proposta nova estiver expirada", async () => {
    const db = fixture();
    db.action.expires_at = new Date(Date.now() - 60_000).toISOString();
    const oldHash = managementActionCodeHash(identity, "654321");
    db.addCompletedPrevious(oldHash, "Tarefa já criada.");
    expect(
      await confirmManagementAction(db.admin, { ...identity, hash: `confirm:${oldHash}` }),
    ).toBe("Tarefa já criada.");
    expect(db.action.status).toBe("pending");
    expect(mocks.move).not.toHaveBeenCalled();
  });

  it("recusa etapa alterada sem executar nem abrir aviso de resultado incerto", async () => {
    const db = fixture();
    db.moveLeadElsewhere();
    const input = { ...identity, hash: `confirm:${codeHash}` };
    const result = await confirmManagementAction(db.admin, input);
    expect(result).toContain("etapa do negócio mudou");
    expect(db.action.status).toBe("failed");
    expect(await confirmManagementAction(db.admin, input)).toBe(result);
    expect(mocks.move).not.toHaveBeenCalled();
    expect(mocks.alert).not.toHaveBeenCalled();
  });

  it("não cria tarefa cujo prazo venceu enquanto o gestor confirmava", async () => {
    const db = fixture();
    db.action.action = "create_task";
    Object.assign(db.action.payload, {
      title: "Retorno",
      due_at: new Date(Date.now() - 60_000).toISOString(),
    });
    expect(
      await confirmManagementAction(db.admin, { ...identity, hash: `confirm:${codeHash}` }),
    ).toContain("prazo solicitado já passou");
    expect(db.action.status).toBe("failed");
    expect(mocks.alert).not.toHaveBeenCalled();
  });
});
