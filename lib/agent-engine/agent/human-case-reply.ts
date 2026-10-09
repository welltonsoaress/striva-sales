import type { Pool } from "pg";
import { markAwaitingLead, resolveCaseFromHuman } from "./human-cases";
import { enqueueJob } from "../queue/queue";

/** A mesma transação da tela e do gestor: decisão humana + próxima vez da IA. */
export async function commitHumanCaseReply(
  pool: Pool,
  input: {
    organizationId: string;
    caseId: string;
    actorUserId: string;
    action: "resolved" | "need_lead_info";
    body: string;
    contactId: string;
    expectedUpdatedAt?: string;
  },
): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    if (input.expectedUpdatedAt) {
      // A proposta pode ficar dez minutos em revisão. Trava o caso e valida
      // a versão exata antes de aplicar a orientação que o gestor conferiu.
      const current = await client.query(
        `select ac.id from agent_cases ac
        join conversations c on c.id = ac.conversation_id and c.organization_id = ac.organization_id
        where ac.organization_id = $1 and ac.id = $2 and ac.status = 'awaiting_human'
          and ac.updated_at = $3::timestamptz and c.contact_id = $4
        for update of ac`,
        [input.organizationId, input.caseId, input.expectedUpdatedAt, input.contactId],
      );
      if (!current.rows.length) {
        await client.query("rollback");
        return false;
      }
    }
    const transitioned =
      input.action === "resolved"
        ? await resolveCaseFromHuman(
            client,
            input.organizationId,
            input.caseId,
            input.actorUserId,
            input.body,
          )
        : await markAwaitingLead(
            client,
            input.organizationId,
            input.caseId,
            input.actorUserId,
            input.body,
          );
    if (transitioned) {
      await enqueueJob(client, input.organizationId, {
        kind: "case_reply_turn",
        leadId: input.contactId,
        payload: { case_id: input.caseId, action: input.action, body: input.body },
      });
      await client.query("commit");
    } else await client.query("rollback");
    return transitioned;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
