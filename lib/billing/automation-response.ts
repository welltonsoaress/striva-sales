import type { Pool } from "pg";
import type { ActionResultDetail } from "@/lib/automation/types";

/** Uma identidade por evento/regra/ação. A reserva precede o modelo e o canal.
 * Um replay observa a intenção anterior; nunca gera nem envia outra mensagem. */
export async function withAutomationResponse(
  db: Pool,
  input: { organizationId: string; eventId: string; ruleId: string; actionIndex: number },
  execute: (responseId: string | null) => Promise<ActionResultDetail>,
): Promise<ActionResultDetail> {
  const org = input.organizationId;
  const reference = `automation:${input.eventId}:${input.ruleId}:${input.actionIndex}`;
  const { rows } = await db.query<{ id: string | null }>("select fn_ai_reserve($1,$2) id", [
    org,
    reference,
  ]);
  const id = rows[0]?.id;
  if (id === undefined) throw new Error("ai_account_unavailable");
  if (id === null) return execute(null); // Empresas legadas conservam seu contrato.
  // Lock de sessão, mantido durante geração/envio: um reaper não pode executar
  // em paralelo nem confundir um processo lento com um processo encerrado.
  const client = await db.connect();
  const lockKey = `${org.toLowerCase()}:${reference}`;
  let locked = false;
  try {
    locked =
      (
        await client.query<{ locked: boolean }>(
          "select pg_try_advisory_lock(hashtextextended($1,0)) locked",
          [lockKey],
        )
      ).rows[0]?.locked === true;
    if (!locked)
      return {
        type: "send_ai_message",
        status: "postponed",
        detail: { reason: "commercial_response_already_started", response_id: id },
      };
    const claim = await client.query(
      `update ai_response_reservations set expected_parts=1
     where organization_id=$1 and id=$2 and expected_parts is null and sealed_at is null returning id`,
      [org, id],
    );
    if (!claim.rows.length) {
      // Quem obteve o lock sabe que não há executor anterior vivo. Reconcilia o
      // recibo existente e fecha uma intenção interrompida; jamais envia novamente.
      await client.query(
        "update ai_response_reservations set sealed_at=coalesce(sealed_at,now()) where organization_id=$1 and id=$2",
        [org, id],
      );
      const prior = await client.query<{ state: string }>("select fn_ai_settle($1,$2,true) state", [
        org,
        id,
      ]);
      return {
        type: "send_ai_message",
        status:
          prior.rows[0]?.state === "committed"
            ? "success"
            : prior.rows[0]?.state === "released"
              ? "failed"
              : "postponed",
        detail: { reason: "commercial_response_already_started", response_id: id },
      };
    }
    try {
      return await execute(id);
    } finally {
      await client.query(
        "update ai_response_reservations set sealed_at=coalesce(sealed_at,now()) where organization_id=$1 and id=$2",
        [org, id],
      );
      await client.query("select fn_ai_settle($1,$2,true)", [org, id]);
    }
  } finally {
    try {
      if (locked)
        await client.query("select pg_advisory_unlock(hashtextextended($1,0))", [lockKey]);
    } catch (error) {
      client.release(true); // Não devolver ao pool uma sessão com lock desconhecido.
      throw error;
    }
    client.release();
  }
}
