import type { Pool } from "pg";
import { sendEmail, isEmailConfigured } from "@/lib/email/resend";
import { marcaDaSaida } from "@/lib/branding/saida";
import { env } from "@/lib/env";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

/** Cadência operacional; não muda duração do teste nem do contrato. */
export async function runCommercialNotices(pool: Pool) {
  const client = await pool.connect();
  let queued = 0;
  try {
    await client.query("begin");
    const lock = await client.query<{ acquired: boolean }>("select pg_try_advisory_xact_lock(hashtextextended('commercial-notices',0)) as acquired");
    if (!lock.rows[0]?.acquired) { await client.query("rollback"); return { queued: 0, sent: 0, failed: 0, skipped: true }; }
    // Uma janela vencida não é enviada posteriormente como se ainda fosse futura.
    const due = await client.query<{ organization_id: string; user_id: string; kind: string; event_key: string; deadline: string | null; title: string; body: string }>(`
      with deadlines as (
        select a.organization_id, a.access_until as deadline,
          case when a.state='trial' then 'trial_ending' else 'subscription_ending' end as kind,
          case when a.state='trial' then 'Seu teste está chegando ao fim' else 'Confira a renovação do seu plano' end as title,
          case when a.state='trial' then 'Seu teste termina em ' else 'O período contratado termina em ' end ||
            to_char(a.access_until at time zone 'UTC','DD/MM/YYYY HH24:MI') || ' (UTC). Confira os planos e pagamentos no faturamento.' as body,
          a.state || ':' || a.access_until::text as event_key
        from organization_ai_accounts a where a.mode='platform' and a.state in('trial','active') and a.access_until>now()
          and a.access_until<=now()+case when a.state='trial' then make_interval(hours=>$1) else make_interval(days=>$2) end
        union all
        select p.organization_id, null, 'payment_failed', 'Seu pagamento precisa de atenção',
          'O pagamento não foi confirmado. Confira a situação no faturamento e fale com a equipe da plataforma antes de tentar uma nova cobrança.',
          'payment:' || p.transaction_code || ':' || p.status
        from billing_payments p where p.status in('DELAYED','CANCELLED','EXPIRED','OVERDUE') and p.last_event_at>now()-interval '7 days'
      )
      select d.*, m.user_id from deadlines d join user_organizations m on m.organization_id=d.organization_id
      where m.role='admin' and m.accepted_at is not null and m.revoked_at is null
      and not exists(select 1 from commercial_notices n where n.organization_id=d.organization_id and n.user_id=m.user_id and n.event_key=d.event_key)
      order by d.deadline nulls first limit 100`, [env.COMMERCIAL_TRIAL_NOTICE_HOURS, env.COMMERCIAL_RENEWAL_NOTICE_DAYS]);
    for (const row of due.rows) {
      const notice = await client.query<{ id: string }>(`insert into commercial_notices(organization_id,user_id,event_key,kind,deadline,title,body)
        values($1,$2,$3,$4,$5,$6,$7) on conflict(organization_id,user_id,event_key) do nothing returning id`,
        [row.organization_id, row.user_id, row.event_key, row.kind, row.deadline, row.title, row.body]);
      const noticeId = notice.rows[0]?.id;
      if (!noticeId) continue;
      const inbox = await client.query<{ id: string }>(`insert into agent_inbox_items(organization_id,kind,severity,title,body)
        values($1,'commercial_reminder','info',$2,$3) returning id`, [row.organization_id, row.title, row.body]);
      const inboxId = inbox.rows[0]?.id;
      if (!inboxId) throw new Error("Não foi possível registrar o aviso interno.");
      await client.query("update commercial_notices set inbox_id=$2 where id=$1 and organization_id=$3", [noticeId, inboxId, row.organization_id]);
      queued++;
    }
    await client.query(`update commercial_notices n set cancelled_at=now(),error_code='superseded'
      where n.delivered_at is null and n.cancelled_at is null and (
        (n.deadline is not null and n.deadline<=now()) or not exists(select 1 from user_organizations m
          where m.organization_id=n.organization_id and m.user_id=n.user_id and m.role='admin' and m.accepted_at is not null and m.revoked_at is null)
        or (n.kind in('trial_ending','subscription_ending') and not exists(select 1 from organization_ai_accounts a
          where a.organization_id=n.organization_id and a.mode='platform' and a.access_until=n.deadline
            and a.state=case when n.kind='trial_ending' then 'trial' else 'active' end))
        or (n.kind='payment_failed' and not exists(select 1 from billing_payments p where p.organization_id=n.organization_id
          and ('payment:' || p.transaction_code || ':' || p.status)=n.event_key and p.status in('DELAYED','CANCELLED','EXPIRED','OVERDUE'))))`);
    await client.query(`update agent_inbox_items i set status='resolved' from commercial_notices n
      where n.inbox_id=i.id and n.organization_id=i.organization_id and n.cancelled_at is not null and i.status='open'`);
    await client.query("commit");
  } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
  if (!isEmailConfigured()) {
    await pool.query("update commercial_notices set error_code='not_configured' where delivered_at is null and cancelled_at is null and error_code is distinct from 'not_configured'");
    return { queued, sent: 0, failed: 0, email_configured: false };
  }
  // A lease fecha concorrência. Após a janela de idempotência do provedor, exige reconciliação humana.
  const claimed = await pool.query<{ id: string; organization_id: string; user_id: string; title: string; body: string }>(`
    with candidates as (select id from commercial_notices where delivered_at is null and cancelled_at is null
      and (lease_until is null or lease_until<now()) and (last_attempt_at is null or last_attempt_at<now()-interval '1 hour')
      and (first_attempt_at is null or first_attempt_at>now()-interval '23 hours')
      order by created_at for update skip locked limit 20)
    update commercial_notices n set lease_until=now()+interval '5 minutes',attempts=attempts+1,
      first_attempt_at=coalesce(first_attempt_at,now()),last_attempt_at=now()
    from candidates c where n.id=c.id returning n.id,n.organization_id,n.user_id,n.title,n.body`);
  let sent = 0, failed = 0;
  for (const notice of claimed.rows) {
    const recipient = await pool.query<{ email: string }>(`select u.email from auth.users u join user_organizations m on m.user_id=u.id
      where u.id=$1 and m.organization_id=$2 and m.role='admin' and m.accepted_at is not null and m.revoked_at is null
        and u.email_confirmed_at is not null`, [notice.user_id, notice.organization_id]);
    if (!recipient.rows[0]?.email) {
      await pool.query("update commercial_notices set lease_until=null,error_code='recipient_unverified' where id=$1 and organization_id=$2", [notice.id, notice.organization_id]);
      failed++; continue;
    }
    const brand = await marcaDaSaida(notice.organization_id);
    const link = new URL("/app/settings/billing", env.NEXT_PUBLIC_APP_URL).toString();
    const result = await sendEmail({ to: recipient.rows[0].email, subject: `${brand.nome}: ${notice.title}`, fromName: brand.nome,
      text: `${notice.body}\n${link}`, html: `<p>${escapeHtml(notice.body)}</p><p><a href="${escapeHtml(link)}">Abrir faturamento</a></p>`,
      idempotencyKey: `commercial-notice/${notice.id}` });
    await pool.query(`update commercial_notices set lease_until=null,delivered_at=case when $3 then now() else null end,
      provider_id=$4,error_code=$5 where id=$1 and organization_id=$2`, [notice.id, notice.organization_id, result.ok, result.id ?? null, result.error ?? null]);
    if (result.ok) sent++; else failed++;
  }
  await pool.query(`update commercial_notices set error_code='reconciliation_required'
    where delivered_at is null and cancelled_at is null and first_attempt_at<now()-interval '23 hours' and error_code is distinct from 'reconciliation_required'`);
  return { queued, sent, failed, email_configured: true };
}
