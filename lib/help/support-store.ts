import type { Pool, PoolClient } from "pg";
import { randomUUID } from "node:crypto";

type Thread = { organization_id: string; status: string; assigned_to: string | null };
export class SupportWriteError extends Error {
  constructor(
    readonly code: "not_found" | "conflict",
    message: string,
  ) {
    super(message);
  }
}

async function transaction<T>(pool: Pool, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

/** Mensagem e transição são indivisíveis. Repetir o pedido não perde o handoff. */
export async function recordSupportRequest(
  pool: Pool,
  input: {
    organizationId: string;
    userId: string;
    threadId: string;
    messageId: string;
    action: "send" | "handoff" | "close";
    body: string;
  },
) {
  return transaction(pool, async (client) => {
    // Ainda pode não existir linha para travar. Serialize também a criação
    // concorrente, que passa por duas constraints únicas do chamado.
    await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [
      `support-thread:${input.threadId}`,
    ]);
    await client.query(
      `insert into platform_support_threads(id, organization_id, created_by)
       values ($1,$2,$3) on conflict (id) do nothing`,
      [input.threadId, input.organizationId, input.userId],
    );
    const { rows } = await client.query<Thread>(
      `select organization_id, status, assigned_to from platform_support_threads
       where id=$1 and organization_id=$2 and created_by=$3 for update`,
      [input.threadId, input.organizationId, input.userId],
    );
    const thread = rows[0];
    if (!thread) throw new SupportWriteError("not_found", "Chamado não encontrado.");
    const previous = await client.query<{ body: string }>(
      `select body from platform_support_messages where organization_id=$1
       and thread_id=$2 and client_message_id=$3 and author_kind='user' and author_user_id=$4`,
      [input.organizationId, input.threadId, input.messageId, input.userId],
    );
    if (previous.rows[0]) {
      if (previous.rows[0].body !== input.body)
        throw new SupportWriteError(
          "conflict",
          "Esta mensagem já foi registrada com outro conteúdo.",
        );
      return { status: thread.status, duplicate: true };
    }
    if (thread.status === "closed")
      throw new SupportWriteError(
        "conflict",
        "Este chamado foi encerrado. Abra uma nova conversa de suporte.",
      );
    await client.query(
      `insert into platform_support_messages
       (organization_id,thread_id,client_message_id,author_kind,author_user_id,body)
       values ($1,$2,$3,'user',$4,$5)`,
      [input.organizationId, input.threadId, input.messageId, input.userId, input.body],
    );
    const status =
      input.action === "close"
        ? "closed"
        : input.action === "handoff" && thread.status === "open"
          ? "waiting_human"
          : thread.status;
    await client.query(
      "update platform_support_threads set status=$3, updated_at=now() where organization_id=$1 and id=$2",
      [input.organizationId, input.threadId, status],
    );
    return { status, duplicate: false };
  });
}

/** O modelo roda fora da transação; a trava decide se ainda pode responder. */
export async function recordSupportAnswer(
  pool: Pool,
  input: {
    organizationId: string;
    userId: string;
    threadId: string;
    body: string;
    source: "manual" | "model";
    needsHuman: boolean;
  },
) {
  return transaction(pool, async (client) => {
    const { rows } = await client.query<Thread>(
      `select organization_id, status, assigned_to from platform_support_threads
       where organization_id=$1 and id=$2 and created_by=$3 for update`,
      [input.organizationId, input.threadId, input.userId],
    );
    if (rows[0]?.status !== "open") return rows[0]?.status ?? null;
    await client.query(
      `insert into platform_support_messages
       (organization_id,thread_id,client_message_id,author_kind,body,source)
       values ($1,$2,$3,'assistant',$4,$5)`,
      [input.organizationId, input.threadId, randomUUID(), input.body, input.source],
    );
    const status = input.needsHuman ? "waiting_human" : "open";
    await client.query(
      "update platform_support_threads set status=$3, updated_at=now() where organization_id=$1 and id=$2",
      [input.organizationId, input.threadId, status],
    );
    return status;
  });
}

/** Chamador exige admin de plataforma. O tenant vem do chamado travado. */
export async function recordSupportOperatorAction(
  pool: Pool,
  input: {
    threadId: string;
    userId: string;
    action: "claim" | "reply" | "close";
    body?: string;
  },
) {
  return transaction(pool, async (client) => {
    const { rows } = await client.query<Thread>(
      "select organization_id, status, assigned_to from platform_support_threads where id=$1 for update",
      [input.threadId],
    );
    const thread = rows[0];
    if (!thread) throw new SupportWriteError("not_found", "Chamado não encontrado.");
    if (thread.status === "closed")
      throw new SupportWriteError("conflict", "Este chamado já foi encerrado.");
    if (thread.assigned_to && thread.assigned_to !== input.userId)
      throw new SupportWriteError("conflict", "Este chamado está com outra pessoa da equipe.");
    if (input.action === "reply") {
      await client.query(
        `insert into platform_support_messages
         (organization_id,thread_id,client_message_id,author_kind,author_user_id,body)
         values ($1,$2,$3,'human',$4,$5)`,
        [thread.organization_id, input.threadId, randomUUID(), input.userId, input.body],
      );
    }
    await client.query(
      `update platform_support_threads set status=$3, assigned_to=$4, updated_at=now()
       where organization_id=$1 and id=$2`,
      [
        thread.organization_id,
        input.threadId,
        input.action === "close" ? "closed" : "human_active",
        input.userId,
      ],
    );
    return { organizationId: thread.organization_id };
  });
}
