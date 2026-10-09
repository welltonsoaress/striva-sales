import type { Pool } from "pg";
import type { HotmartPurchase } from "./hotmart";

type Checkout = {
  id: string;
  organization_id: string;
  product_ucode: string;
  offer_code: string;
  price_cents: string;
  currency: string;
  transaction_code: string | null;
};

/** Deduplicação, vínculo, extrato e permissões gerenciadas entram no mesmo commit. */
export async function processHotmartPurchase(pool: Pool, event: HotmartPurchase) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    // Renovações podem chegar juntas e com transactions diferentes. Serialize
    // tanto a assinatura quanto a transação antes de resolver sua organização.
    for (const key of [
      event.subscriber_code ? `subscription:${event.subscriber_code}` : null,
      `transaction:${event.transaction}`,
    ]
      .filter((value): value is string => !!value)
      .sort())
      await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [key]);
    await client.query(
      `insert into billing_webhook_events(event_id, event, occurred_at, state, normalized)
      values ($1, $2, $3, 'received', $4::jsonb) on conflict (event_id) do nothing`,
      [event.event_id, event.event, event.occurred_at, JSON.stringify(event)],
    );
    const receipt = await client.query<{ state: string; normalized: HotmartPurchase }>(
      "select state, normalized from billing_webhook_events where event_id = $1 for update",
      [event.event_id],
    );
    if (JSON.stringify(receipt.rows[0]?.normalized) !== JSON.stringify(event)) {
      // jsonb reordena chaves; compare os valores ordenados, não o texto do JSON.
      const stored = receipt.rows[0]?.normalized;
      if (
        !stored ||
        Object.keys(event).some(
          (key) => stored[key as keyof HotmartPurchase] !== event[key as keyof HotmartPurchase],
        )
      )
        throw new Error("billing_event_identity_changed");
    }
    if (["applied", "obsolete"].includes(receipt.rows[0]?.state ?? "")) {
      await client.query("commit");
      return { state: "duplicate", organizationId: null };
    }
    const externalKey = event.subscriber_code
      ? `subscription:${event.subscriber_code}`
      : `transaction:${event.transaction}`;
    const existing = await client.query<{
      id: string;
      organization_id: string;
      checkout_id: string;
    }>(
      "select id, organization_id, checkout_id from billing_contracts where external_key = $1 for update",
      [externalKey],
    );
    const contract = existing.rows[0];
    // A transação já pode pertencer a outro contrato. Confira antes de mudar
    // a assinatura: o ON CONFLICT do pagamento sozinho impediria a cópia do
    // pagamento, mas deixaria a alteração indevida da assinatura confirmada.
    const paymentOwner = await client.query<{ contract_id: string }>(
      "select contract_id from billing_payments where transaction_code = $1 for update",
      [event.transaction],
    );
    const checkoutResult = contract
      ? await client.query<Checkout>(
          "select * from billing_checkouts where organization_id = $1 and id = $2 for update",
          [contract.organization_id, contract.checkout_id],
        )
      : await client.query<Checkout>(
          "select * from billing_checkouts where reference = $1 for update",
          [event.reference],
        );
    const checkout = checkoutResult.rows[0];
    let reason: string | null = null;
    if (paymentOwner.rows[0] && paymentOwner.rows[0].contract_id !== contract?.id)
      reason = "transaction_already_bound";
    else if (!checkout) reason = "checkout_not_found";
    else if (
      checkout.product_ucode !== event.product_ucode ||
      checkout.offer_code !== event.offer_code
    )
      reason = "offer_mismatch";
    else if (
      Number(checkout.price_cents) !== event.amount_cents ||
      checkout.currency !== event.currency
    )
      reason = "amount_mismatch";
    else if (
      !contract &&
      checkout.transaction_code &&
      checkout.transaction_code !== event.transaction
    )
      reason = "checkout_already_used";
    // Uma referência isolada nunca cria uma assinatura sem aprovação financeira.
    else if (!contract && !["PURCHASE_APPROVED", "PURCHASE_COMPLETE"].includes(event.event))
      reason = "awaiting_approval";
    if (reason || !checkout) {
      await client.query(
        "update billing_webhook_events set state = 'unmatched', reason = $2 where event_id = $1",
        [event.event_id, reason],
      );
      await client.query("commit");
      return { state: "unmatched", organizationId: null };
    }
    const bound = await client.query<{ id: string }>(
      `insert into billing_contracts
      (organization_id, checkout_id, external_key, subscriber_code, subscription_status, next_charge_at, last_event_at)
      values ($1,$2,$3,$4,$5,$6,$7) on conflict (external_key) do update
      set subscription_status = excluded.subscription_status, next_charge_at = excluded.next_charge_at,
        last_event_at = excluded.last_event_at,
        cancelled_at = case when excluded.subscription_status = 'ACTIVE' then null else billing_contracts.cancelled_at end,
        access_until = case when excluded.subscription_status = 'ACTIVE' then null else billing_contracts.access_until end
      where billing_contracts.organization_id = excluded.organization_id and billing_contracts.last_event_at < excluded.last_event_at
      returning id`,
      [
        checkout.organization_id,
        checkout.id,
        externalKey,
        event.subscriber_code,
        event.subscription_status,
        event.next_charge_at,
        event.occurred_at,
      ],
    );
    const contractId = contract?.id ?? bound.rows[0]?.id;
    if (!contractId) throw new Error("billing_contract_binding_failed");
    await client.query(
      "update billing_checkouts set transaction_code = coalesce(transaction_code, $3) where organization_id = $1 and id = $2",
      [checkout.organization_id, checkout.id, event.transaction],
    );
    // Um estorno recebido antes da aprovação continua sendo a verdade mais
    // recente. Não conceder acesso enquanto a fila aguarda reconciliação.
    const reversed=await client.query<{status:string}>(`select normalized->>'status' as status from billing_webhook_events
      where normalized->>'transaction'=$1 and event in('PURCHASE_REFUNDED','PURCHASE_CHARGEBACK') and occurred_at >= $2
      order by occurred_at desc limit 1`,[event.transaction,event.occurred_at]);
    const effectiveStatus=reversed.rows[0]?.status ?? event.status;
    const payment = await client.query(
      `insert into billing_payments
      (organization_id, contract_id, transaction_code, amount_cents, currency, status, last_event_at,paid_access_until)
      values ($1,$2,$3,$4,$5,$6,$7,$8) on conflict (transaction_code) do update
      set status = excluded.status, amount_cents = excluded.amount_cents, currency = excluded.currency, last_event_at = excluded.last_event_at,
        paid_access_until=coalesce(billing_payments.paid_access_until,excluded.paid_access_until)
      where billing_payments.organization_id = excluded.organization_id and billing_payments.contract_id = excluded.contract_id
        and (billing_payments.last_event_at < excluded.last_event_at or
          billing_payments.last_event_at = excluded.last_event_at and excluded.status in('REFUNDED','CHARGEBACK') and billing_payments.status not in('REFUNDED','CHARGEBACK'))
        and not (billing_payments.status in('REFUNDED','CHARGEBACK') and excluded.status not in('REFUNDED','CHARGEBACK')) returning id`,
      [
        checkout.organization_id,
        contractId,
        event.transaction,
        event.amount_cents,
        event.currency,
        effectiveStatus,
        event.occurred_at,
        event.next_charge_at,
      ],
    );
    const state = payment.rows.length ? "applied" : "obsolete";
    await client.query(
      "update billing_webhook_events set state = $2, reason = null where event_id = $1",
      [event.event_id, state],
    );
    await client.query("commit");
    return { state, organizationId: checkout.organization_id };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
