import type { Pool } from "pg";
import type { HotmartCancellation } from "./hotmart";

/** Só uma assinatura já vinculada por compra aprovada fornece o tenant.
 * Cancelar recorrência preserva pagamentos e não decide a política de acesso. */
export async function processHotmartCancellation(pool: Pool, event: HotmartCancellation) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const key = `subscription:${event.subscriber_code}`;
    await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [key]);
    await client.query(
      `insert into billing_webhook_events(event_id,event,occurred_at,state,normalized)
       values ($1,$2,$3,'received',$4::jsonb) on conflict (event_id) do nothing`,
      [event.event_id, event.event, event.occurred_at, JSON.stringify(event)],
    );
    const receipt = await client.query<{ state: string; normalized: HotmartCancellation }>(
      "select state, normalized from billing_webhook_events where event_id=$1 for update",
      [event.event_id],
    );
    const stored = receipt.rows[0]?.normalized;
    if (
      !stored ||
      Object.keys(event).some(
        (key) =>
          stored[key as keyof HotmartCancellation] !== event[key as keyof HotmartCancellation],
      )
    )
      throw new Error("billing_event_identity_changed");
    if (["applied", "obsolete"].includes(receipt.rows[0]?.state ?? "")) {
      await client.query("commit");
      return { state: "duplicate", organizationId: null };
    }
    const contract = await client.query<{ id: string; organization_id: string }>(
      "select id, organization_id from billing_contracts where external_key=$1 for update",
      [key],
    );
    const bound = contract.rows[0];
    if (!bound) {
      await client.query(
        "update billing_webhook_events set state='unmatched', reason='subscription_not_found' where event_id=$1",
        [event.event_id],
      );
      await client.query("commit");
      return { state: "unmatched", organizationId: null };
    }
    const updated = await client.query(
      `update billing_contracts set subscription_status='INACTIVE', cancelled_at=$3,
       access_until=$4, next_charge_at=null, last_event_at=$5
       where id=$1 and organization_id=$2 and last_event_at<$5 returning id`,
      [bound.id, bound.organization_id, event.cancelled_at, event.access_until, event.occurred_at],
    );
    const state = updated.rows.length ? "applied" : "obsolete";
    await client.query(
      "update billing_webhook_events set state=$2, reason=null where event_id=$1",
      [event.event_id, state],
    );
    await client.query("commit");
    return { state, organizationId: bound.organization_id };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
