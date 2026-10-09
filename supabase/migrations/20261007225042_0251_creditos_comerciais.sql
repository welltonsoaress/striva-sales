-- 0251: dez créditos por mensagem completa; contratos antigos mantêm a capacidade.
-- Os recibos históricos conservam sua unidade original, identificada pela régua.
alter table public.organization_ai_accounts add column if not exists credit_meter text not null default 'response_v2';
alter table public.ai_credit_ledger add column if not exists credit_meter text not null default 'response_v2';
alter table public.ai_response_reservations add column if not exists credit_meter text not null default 'response_v2';
alter table public.billing_checkouts add column if not exists credit_meter text not null default 'response_v2';
alter table public.billing_contracts add column if not exists credit_meter text not null default 'response_v2';
alter table public.ai_response_reservations add column if not exists units integer not null default 1;
alter table public.ai_response_reservations add column if not exists monthly_units integer not null default 0;
alter table public.ai_response_reservations add column if not exists extra_units integer not null default 0;
alter table public.ai_credit_packs add column if not exists slug text;
create unique index if not exists ai_credit_packs_slug_unique on public.ai_credit_packs(slug);

update public.ai_response_reservations set
  monthly_units=case when source='monthly' then units else 0 end,
  extra_units=case when source='extra' then units else 0 end
where monthly_units+extra_units=0;
-- Reserva em andamento e saldo passam juntos à nova unidade. Reaplicar não multiplica.
update public.ai_response_reservations r set units=r.units*10,
  monthly_units=r.monthly_units*10,extra_units=r.extra_units*10,credit_meter='credit_v3'
where r.credit_meter='response_v2' and r.state in('reserved','uncertain')
  and exists(select 1 from public.organization_ai_accounts a where a.organization_id=r.organization_id and a.mode='platform' and a.credit_meter='response_v2');
update public.organization_ai_accounts set monthly_allowance=monthly_allowance*10,
  monthly_remaining=monthly_remaining*10,extra_remaining=extra_remaining*10,extra_debt=extra_debt*10,
  credit_meter='credit_v3' where mode='platform' and credit_meter='response_v2';

alter table public.organization_ai_accounts alter column credit_meter set default 'credit_v3';
alter table public.ai_credit_ledger alter column credit_meter set default 'credit_v3';
alter table public.ai_response_reservations alter column credit_meter set default 'credit_v3';
alter table public.billing_checkouts alter column credit_meter set default 'credit_v3';
alter table public.billing_contracts alter column credit_meter set default 'credit_v3';
do $$ begin
  if not exists(select 1 from pg_constraint where conname='ai_reservation_funding') then
    alter table public.ai_response_reservations add constraint ai_reservation_funding check
      (units>0 and monthly_units>=0 and extra_units>=0 and monthly_units+extra_units=units);
  end if;
end $$;
-- Quantidade sempre informada pela função, não por REST ou pelo navegador.
alter table public.ai_response_reservations drop constraint if exists ai_response_reservations_source_check;
alter table public.ai_response_reservations add constraint ai_response_reservations_source_check check(source in('monthly','extra','mixed'));

insert into public.ai_credit_packs(slug,name,units,price_cents,publication_state)
values('extra-1000','1.000 créditos extras',1000,4999,'draft') on conflict(slug) do nothing;

create or replace function public.fn_billing_contract_meter() returns trigger
language plpgsql set search_path='' as $$ begin
  if tg_op='UPDATE' then new.credit_meter:=old.credit_meter;
  else
    select c.credit_meter into new.credit_meter from public.billing_checkouts c
      where c.id=new.checkout_id and c.organization_id=new.organization_id;
    if new.credit_meter is null then raise exception 'checkout_not_found'; end if;
  end if;
  return new;
end $$;
revoke all on function public.fn_billing_contract_meter() from public,anon,authenticated,service_role;
drop trigger if exists trg_billing_contract_meter on public.billing_contracts;
create trigger trg_billing_contract_meter before insert or update on public.billing_contracts for each row execute function public.fn_billing_contract_meter();

create or replace function public.fn_ai_reserve(p_org uuid,p_reference text) returns uuid
language plpgsql set search_path='' as $$
declare a public.organization_ai_accounts; r public.ai_response_reservations; m integer; e integer; begin
  perform public.fn_ai_renew(p_org);
  select * into a from public.organization_ai_accounts where organization_id=p_org for update;
  if not found then raise exception 'ai_account_missing'; end if;
  if a.mode='legacy' then return null; end if;
  select * into r from public.ai_response_reservations where organization_id=p_org and reference=p_reference;
  if found then
    if r.state='released' then raise exception 'ai_reservation_released'; end if;
    return r.id;
  end if;
  if a.state not in('trial','active') or a.access_until is null or a.access_until<=now() then raise exception 'ai_access_inactive'; end if;
  m:=least(a.monthly_remaining,10); e:=10-m;
  if e>0 and (a.state<>'active' or a.extra_remaining<e) then raise exception 'ai_credits_exhausted'; end if;
  update public.organization_ai_accounts set monthly_remaining=monthly_remaining-m,
    extra_remaining=extra_remaining-e,updated_at=now() where organization_id=p_org;
  insert into public.ai_response_reservations(organization_id,reference,source,period_start,credit_meter,units,monthly_units,extra_units)
    values(p_org,p_reference,case when e=0 then 'monthly' when m=0 then 'extra' else 'mixed' end,a.period_start,'credit_v3',10,m,e) returning * into r;
  return r.id;
end $$;
revoke all on function public.fn_ai_reserve(uuid,text) from public,anon,authenticated;
grant execute on function public.fn_ai_reserve(uuid,text) to service_role;

create or replace function public.fn_ai_settle(p_org uuid,p_id uuid,p_release boolean default false) returns text
language plpgsql set search_path='' as $$
declare r public.ai_response_reservations; a public.organization_ai_accounts; accepted integer; uncertain integer; begin
  select * into a from public.organization_ai_accounts where organization_id=p_org for update;
  select * into r from public.ai_response_reservations where organization_id=p_org and id=p_id for update;
  if not found then raise exception 'ai_reservation_not_found'; end if;
  if r.state in('committed','released') then return r.state; end if;
  select count(*) into accepted from public.ai_response_parts where organization_id=p_org and response_id=p_id and part<=r.expected_parts;
  select count(*) into uncertain from public.messages m where m.organization_id=p_org and m.ai_response_id=p_id and m.status in('sending','queued')
    and not exists(select 1 from public.ai_response_parts p where p.organization_id=p_org and p.response_id=p_id and p.part=m.ai_response_part);
  if r.sealed_at is not null and r.expected_parts is not null and accepted=r.expected_parts then
    update public.ai_response_reservations set state='committed',updated_at=now() where id=p_id;
    insert into public.ai_credit_ledger(organization_id,reference,kind,units,credit_meter)
      values(p_org,'response:'||p_id,'debit',-r.units,r.credit_meter) on conflict do nothing;
    return 'committed';
  end if;
  if p_release and uncertain=0 then
    -- Créditos mensais de um ciclo encerrado não voltam ao ciclo seguinte.
    update public.organization_ai_accounts set
      monthly_remaining=monthly_remaining+case when a.period_start=r.period_start then r.monthly_units else 0 end,
      extra_remaining=extra_remaining+greatest(0,r.extra_units-extra_debt),
      extra_debt=greatest(0,extra_debt-r.extra_units),updated_at=now() where organization_id=p_org;
    update public.ai_response_reservations set state='released',updated_at=now() where id=p_id; return 'released';
  end if;
  update public.ai_response_reservations set state='uncertain',updated_at=now() where id=p_id; return 'uncertain';
end $$;
revoke all on function public.fn_ai_settle(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.fn_ai_settle(uuid,uuid,boolean) to service_role;

create or replace function public.fn_ai_credit_usage(p_org uuid,p_start timestamptz,p_end timestamptz) returns jsonb
language sql stable set search_path='' as $$ select jsonb_build_object(
  'credits',coalesce(sum(-units*case when credit_meter='response_v2' then 10 else 1 end),0),
  'messages',count(*))
from public.ai_credit_ledger where organization_id=p_org and kind='debit' and created_at>=p_start and created_at<p_end $$;
revoke all on function public.fn_ai_credit_usage(uuid,timestamptz,timestamptz) from public,anon,authenticated;
-- INVOKER: leitura autenticada permanece limitada pela RLS administrativa do tenant.
grant execute on function public.fn_ai_credit_usage(uuid,timestamptz,timestamptz) to authenticated,service_role;

create or replace function public.fn_admin_publish_credit_pack(p_id uuid,p_actor uuid,p_reason text) returns void
language plpgsql set search_path='' as $$ declare p public.ai_credit_packs; begin
  if length(trim(p_reason))<10 then raise exception 'reason_required'; end if;
  if not exists(select 1 from public.platform_admins where user_id=p_actor and scope='full' and revoked_at is null) then raise exception 'platform_admin_required'; end if;
  select * into p from public.ai_credit_packs where id=p_id for update;
  if not found or p.price_cents is null or p.units<=0 or p.hotmart_offer is null
    or nullif(p.hotmart_offer->>'product_ucode','') is null or nullif(p.hotmart_offer->>'offer_code','') is null
    or coalesce(p.hotmart_offer->>'checkout_url','') !~ '^https://pay\.hotmart\.com/[^?#]+'
    then raise exception 'credit_pack_offer_missing'; end if;
  if p.publication_state='published' and p.hotmart_offer @> '{"enabled":true}'::jsonb then return; end if;
  update public.ai_credit_packs set publication_state='published',hotmart_offer=jsonb_set(hotmart_offer,'{enabled}','true') where id=p_id;
  insert into public.api_audit_log(actor_user_id,action,resource_type,resource_id,metadata)
    values(p_actor,'platform_admin.credit_pack_published','ai_credit_pack',p_id,jsonb_build_object('reason',p_reason,'units',p.units,'price_cents',p.price_cents));
end $$;
revoke all on function public.fn_admin_publish_credit_pack(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.fn_admin_publish_credit_pack(uuid,uuid,text) to service_role;


-- ---- Funções compatíveis com a régua credit_v3 ----
create or replace function public.fn_ai_check_access(p_org uuid,p_purpose text,p_job uuid default null) returns void
language plpgsql set search_path='' as $$ declare a public.organization_ai_accounts; cap integer; used integer; budget numeric; begin
  perform public.fn_ai_renew(p_org);
  select * into a from public.organization_ai_accounts where organization_id=p_org;
  if not found then raise exception 'ai_account_missing'; end if;
  if a.mode='legacy' then return; end if;
  if not (a.state='pending' and p_purpose in('agent_test','agent_preview','checkpoint','connection_test')) then
    if a.state not in('active','trial') or a.access_until is null or a.access_until<=now() then raise exception 'ai_access_inactive'; end if;
    if a.monthly_remaining+(case when a.state='active' then a.extra_remaining else 0 end)<10 and not exists(
      select 1 from public.ai_response_reservations r where r.organization_id=p_org and r.state in('reserved','uncertain','committed') and r.units=10 and
        (r.reference='job:'||p_job or r.reference='job:'||(select j.payload->>'origin_job_id' from public.job_queue j where j.id=p_job and j.organization_id=p_org))
    ) then raise exception 'ai_credits_exhausted'; end if;
  end if;
  select requests_per_minute,monthly_cost_limit_cents into cap,budget from public.platform_ai_settings where id=true and enabled;
  if cap is null then raise exception 'ai_platform_unavailable'; end if;
  -- Limite de contenção operacional. Custos desconhecidos seguem destacados no admin.
  if budget>0 and (select coalesce(sum(l.cost_cents),0) from public.llm_calls l join public.organization_ai_accounts o on o.organization_id=l.organization_id and o.mode='platform' where l.created_at>=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC')>=budget then
    raise exception 'ai_platform_budget_exhausted';
  end if;
  insert into public.ai_operational_buckets(organization_id,minute,hits) values(p_org,date_trunc('minute',now()),1)
    on conflict(organization_id,minute) do update set hits=public.ai_operational_buckets.hits+1 where public.ai_operational_buckets.hits<cap returning hits into used;
  if used is null then raise exception 'ai_frequency_limit'; end if;
  delete from public.ai_operational_buckets where organization_id=p_org and minute<now()-interval '1 day';
end $$;
revoke all on function public.fn_ai_check_access(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.fn_ai_check_access(uuid,text,uuid) to service_role;
create or replace function public.fn_ai_start_trial(p_org uuid,p_user uuid,p_owner_hash text,p_phone_hash text,p_device_hash text,p_ip_hash text) returns void
language plpgsql security definer set search_path='' as $$
declare a public.organization_ai_accounts; begin
  select * into a from public.organization_ai_accounts where organization_id=p_org for update;
  if not found or a.mode<>'platform' then raise exception 'ai_trial_not_eligible'; end if;
  if not exists(select 1 from public.user_organizations where organization_id=p_org and user_id=p_user and role='admin' and revoked_at is null and accepted_at is not null)
    or not exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null) then raise exception 'ai_trial_identity_unverified'; end if;
  if a.state in('trial','active') then return; end if;
  if a.state<>'pending' then raise exception 'ai_trial_already_used'; end if;
  if not exists(select 1 from public.platform_ai_settings where enabled and provider is not null and model is not null) then raise exception 'ai_platform_unavailable'; end if;
  if p_owner_hash !~ '^[a-f0-9]{64}$' or p_phone_hash !~ '^[a-f0-9]{64}$' then raise exception 'ai_trial_identity_unverified'; end if;
  if not exists(select 1 from public.channel_sessions where organization_id=p_org and archived_at is null and status='WORKING' and verified_at is not null and verification_phone_hash=p_phone_hash) then raise exception 'whatsapp_verification_required'; end if;
  if (select count(*) from public.user_organizations where organization_id=p_org and revoked_at is null)>1 or
     (select count(*) from public.channel_sessions where organization_id=p_org and archived_at is null)>1 then raise exception 'ai_trial_capacity_exceeded'; end if;
  -- Os índices únicos também protegem ativações concorrentes entre empresas.
  if exists(select 1 from public.ai_trial_exceptions where organization_id=p_org and consumed_at is null and expires_at>now()) then
    update public.ai_trial_exceptions set consumed_at=now() where organization_id=p_org;
  else
    insert into public.ai_trial_claims(organization_id,owner_hash,phone_hash,device_hash,ip_hash,risk_signals) values(p_org,p_owner_hash,p_phone_hash,p_device_hash,p_ip_hash,
      array_remove(array[
        case when p_ip_hash is not null and exists(select 1 from public.ai_trial_claims where ip_hash=p_ip_hash) then 'shared_network_verified' end,
        case when p_device_hash is not null and exists(select 1 from public.ai_trial_claims where device_hash=p_device_hash) then 'shared_device_verified' end
      ],null));
  end if;
  update public.organization_ai_accounts set state='trial',anchor_at=now(),access_until=now()+interval '7 days',
    period_start=now(),period_end=now()+interval '7 days',credit_meter='credit_v3',monthly_allowance=1000,monthly_remaining=1000,user_limit=1,channel_limit=1,updated_at=now()
    where organization_id=p_org;
  insert into public.ai_credit_ledger(organization_id,reference,kind,units,actor_user_id) values(p_org,'trial','trial',1000,p_user);
end $$;
revoke all on function public.fn_ai_start_trial(uuid,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.fn_ai_start_trial(uuid,uuid,text,text,text,text) to service_role;
create or replace function public.fn_ai_apply_payment(p_org uuid,p_transaction text) returns void
language plpgsql set search_path='' as $$
declare payment public.billing_payments; c public.billing_contracts; o public.billing_checkouts; a public.organization_ai_accounts; multiplier integer; pack_units integer; months integer; until_at timestamptz; limits jsonb; begin
  select * into payment from public.billing_payments where organization_id=p_org and transaction_code=p_transaction;
  if not found then raise exception 'payment_not_found'; end if;
  select * into c from public.billing_contracts where organization_id=payment.organization_id and id=payment.contract_id;
  select * into o from public.billing_checkouts where organization_id=payment.organization_id and id=c.checkout_id;
  select * into a from public.organization_ai_accounts where organization_id=payment.organization_id for update;
  if not found or a.mode='legacy' then return; end if;
  multiplier:=case when o.credit_meter='response_v2' then 10 else 1 end;
  pack_units:=o.credit_units*multiplier;
  if payment.status in('APPROVED','COMPLETE') then
    if exists(select 1 from public.ai_credit_ledger where organization_id=payment.organization_id and reference='payment:'||payment.transaction_code) then return; end if;
    if o.credit_pack_id is not null then
      if a.state not in('active','suspended') or a.access_until<=now() or not exists(select 1 from public.ai_paid_access where organization_id=p_org and revoked_at is null and access_until>now()) then raise exception 'ai_subscription_required_for_extra'; end if;
      update public.organization_ai_accounts set extra_remaining=extra_remaining+greatest(0,pack_units-extra_debt),extra_debt=greatest(0,extra_debt-pack_units) where organization_id=payment.organization_id;
      insert into public.ai_credit_ledger(organization_id,reference,kind,units) values(payment.organization_id,'payment:'||payment.transaction_code,'extra',pack_units);
    else
      months:=case o.billing_interval when 'year' then 12 when 'semester' then 6 else 1 end;
      limits:=o.limits_snapshot;
      if limits is null or (limits->>'ai_credits') is null or (limits->>'users') is null or (limits->>'whatsapp_numbers') is null then raise exception 'ai_plan_limits_missing'; end if;
      until_at:=coalesce(payment.paid_access_until,public.fn_ai_anniversary(payment.first_paid_at,months));
      insert into public.ai_paid_access(organization_id,transaction_code,paid_at,access_until)
        values(payment.organization_id,payment.transaction_code,payment.first_paid_at,until_at) on conflict do nothing;
      -- Uma renovação estende o acesso sem resetar a franquia no meio do ciclo.
      update public.organization_ai_accounts set state=case when a.state='suspended' then 'suspended' else 'active' end,plan_id=o.plan_id,
        anchor_at=case when a.state in('active','suspended') and a.anchor_at is not null then a.anchor_at else payment.first_paid_at end,
        access_until=case when a.state in('active','suspended') then greatest(coalesce(a.access_until,until_at),until_at) else until_at end,
        monthly_allowance=((limits->>'ai_credits')::integer*multiplier),
        monthly_remaining=case when a.state in('active','suspended') and a.anchor_at is not null then a.monthly_remaining else ((limits->>'ai_credits')::integer*multiplier) end,
        period_start=case when a.state in('active','suspended') and a.anchor_at is not null then a.period_start else payment.first_paid_at end,
        period_end=case when a.state in('active','suspended') and a.anchor_at is not null then a.period_end else public.fn_ai_anniversary(payment.first_paid_at,1) end,
        user_limit=(limits->>'users')::integer,channel_limit=(limits->>'whatsapp_numbers')::integer,updated_at=now()
      where organization_id=payment.organization_id;
      insert into public.ai_credit_ledger(organization_id,reference,kind,units) values(payment.organization_id,'payment:'||payment.transaction_code,'subscription',case when a.state='active' then 0 else ((limits->>'ai_credits')::integer*multiplier) end);
    end if;
  elsif payment.status in('REFUNDED','CHARGEBACK') then
    if o.credit_pack_id is not null then
      if exists(select 1 from public.ai_credit_ledger where organization_id=payment.organization_id and reference='payment:'||payment.transaction_code)
        and not exists(select 1 from public.ai_credit_ledger where organization_id=payment.organization_id and reference='refund:'||payment.transaction_code) then
        update public.organization_ai_accounts set extra_debt=extra_debt+greatest(0,pack_units-extra_remaining),extra_remaining=greatest(0,extra_remaining-pack_units) where organization_id=payment.organization_id;
        insert into public.ai_credit_ledger(organization_id,reference,kind,units) values(payment.organization_id,'refund:'||payment.transaction_code,'refund',-pack_units);
      end if;
    else
      update public.ai_paid_access set revoked_at=now() where organization_id=payment.organization_id and transaction_code=payment.transaction_code and revoked_at is null;
      select max(p.access_until) into until_at from public.ai_paid_access p where p.organization_id=payment.organization_id and p.revoked_at is null;
      update public.organization_ai_accounts set state=case when a.state='suspended' then 'suspended' when until_at>now() then 'active' else 'expired' end,
        access_until=coalesce(until_at,now()),updated_at=now() where organization_id=payment.organization_id;
    end if;
  end if;
  return;
end $$;
revoke all on function public.fn_ai_apply_payment(uuid,text) from public,anon,authenticated;
grant execute on function public.fn_ai_apply_payment(uuid,text) to service_role;
create or replace function public.fn_admin_ai_account(p_org uuid,p_actor uuid,p_action text,p_reason text,p_units integer,p_reference uuid) returns void
language plpgsql set search_path='' as $$ declare a public.organization_ai_accounts; payment_code text; begin
  if length(trim(p_reason))<10 then raise exception 'reason_required'; end if;
  if not exists(select 1 from public.platform_admins where user_id=p_actor and scope='full' and revoked_at is null) then raise exception 'platform_admin_required'; end if;
  select * into a from public.organization_ai_accounts where organization_id=p_org for update;
  if not found then raise exception 'organization_not_found'; end if;
  if exists(select 1 from public.api_audit_log where organization_id=p_org and action='platform_admin.ai_account_changed' and metadata->>'reference'=p_reference::text) then return; end if;
  if p_action='migrate' then
    if a.mode<>'legacy' then raise exception 'already_managed'; end if;
    if not exists(select 1 from public.platform_ai_settings s join public.ai_models m on m.provider=s.provider and m.model_id=s.model
      where s.enabled and m.pricing_verified_at is not null and m.deprecated_at is null and m.supports_tools) then raise exception 'ai_platform_unavailable'; end if;
    if exists(select 1 from public.ai_agents where organization_id=p_org and published_version_id is not null) and not exists(
      select 1 from public.billing_payments where organization_id=p_org and status in('APPROVED','COMPLETE') and paid_access_until>now()
    ) then raise exception 'confirmed_paid_period_required'; end if;
    update public.organization_ai_accounts set mode='platform',credit_meter='credit_v3',state='pending',updated_at=now() where organization_id=p_org;
    for payment_code in select transaction_code from public.billing_payments where organization_id=p_org and status in('APPROVED','COMPLETE') order by first_paid_at loop
      perform public.fn_ai_apply_payment(p_org,payment_code);
    end loop;
    perform public.fn_ai_renew(p_org);
  elsif p_action='adjust' then
    if a.mode<>'platform' or p_units=0 or abs(p_units)>1000000 or a.extra_remaining+p_units<0 then raise exception 'invalid_adjustment'; end if;
    update public.organization_ai_accounts set extra_remaining=extra_remaining+case when p_units>0 then greatest(0,p_units-extra_debt) else p_units end,
      extra_debt=case when p_units>0 then greatest(0,extra_debt-p_units) else extra_debt end,updated_at=now() where organization_id=p_org;
    insert into public.ai_credit_ledger(organization_id,reference,kind,units,reason,actor_user_id) values(p_org,'admin:'||p_reference,'adjustment',p_units,p_reason,p_actor);
  elsif p_action='suspend' then
    if a.mode<>'platform' then raise exception 'managed_account_required'; end if;
    update public.organization_ai_accounts set state='suspended',updated_at=now() where organization_id=p_org;
  elsif p_action='reactivate' then
    if a.mode<>'platform' or a.access_until is null or a.access_until<=now() then raise exception 'paid_period_required'; end if;
    update public.organization_ai_accounts set state=case when exists(select 1 from public.ai_paid_access where organization_id=p_org and revoked_at is null and access_until>now()) then 'active' else 'trial' end,updated_at=now() where organization_id=p_org;
  elsif p_action='trial_exception' then
    if a.state<>'pending' or a.mode<>'platform' then raise exception 'pending_trial_required'; end if;
    insert into public.ai_trial_exceptions(organization_id,actor_user_id,reason,expires_at) values(p_org,p_actor,p_reason,now()+interval '7 days')
      on conflict(organization_id) do update set actor_user_id=excluded.actor_user_id,reason=excluded.reason,expires_at=excluded.expires_at;
  else raise exception 'invalid_admin_action'; end if;
  insert into public.api_audit_log(organization_id,actor_user_id,action,resource_type,resource_id,metadata)
    values(p_org,p_actor,'platform_admin.ai_account_changed','organization',p_org,jsonb_build_object('operation',p_action,'reason',p_reason,'units',p_units,'reference',p_reference));
end $$;
revoke all on function public.fn_admin_ai_account(uuid,uuid,text,text,integer,uuid) from public,anon,authenticated;
grant execute on function public.fn_admin_ai_account(uuid,uuid,text,text,integer,uuid) to service_role;
create or replace function public.fn_admin_saas_overview() returns jsonb
language sql stable set search_path='' as $$ select jsonb_build_object(
  'companies',(select count(*) from public.organizations where status<>'redacted'),
  'trial',(select count(*) from public.organization_ai_accounts where mode='platform' and state='trial' and access_until>now()),
  'active',(select count(*) from public.organization_ai_accounts where mode='platform' and state='active' and access_until>now()),
  'expired',(select count(*) from public.organization_ai_accounts where mode='platform' and (state='expired' or state in('trial','active') and access_until<=now())),
  'suspended',(select count(*) from public.organization_ai_accounts where state='suspended'),
  'legacy',(select count(*) from public.organization_ai_accounts where mode='legacy'),
  'responses',(select count(*) from public.ai_credit_ledger where kind='debit' and created_at>=(date_trunc('month',now() at time zone 'UTC') at time zone 'UTC')),
  'credits',(select coalesce(sum(-units*case when credit_meter='response_v2' then 10 else 1 end),0) from public.ai_credit_ledger where kind='debit' and created_at>=(date_trunc('month',now() at time zone 'UTC') at time zone 'UTC')),
  'received_brl_cents',(select coalesce(sum(amount_cents),0) from public.billing_payments where status in('APPROVED','COMPLETE') and first_paid_at>=(date_trunc('month',now() at time zone 'UTC') at time zone 'UTC')),
  'known_cost_usd_cents',(select sum(cost_cents) from public.llm_calls where created_at>=(date_trunc('month',now() at time zone 'UTC') at time zone 'UTC')),
  'measured_calls',(select count(*) from public.llm_calls where cost_cents is not null and created_at>=(date_trunc('month',now() at time zone 'UTC') at time zone 'UTC')),
  'total_calls',(select count(*) from public.llm_calls where created_at>=(date_trunc('month',now() at time zone 'UTC') at time zone 'UTC')),
  'unknown_cost_calls',(select count(*) from public.llm_calls where cost_cents is null and created_at>=(date_trunc('month',now() at time zone 'UTC') at time zone 'UTC')),
  'uncertain_responses',(select count(*) from public.ai_response_reservations where state='uncertain'),
  'webhook_pending',(select count(*) from public.billing_webhook_events where state in('unmatched','failed')),
  'empty_balance',(select count(*) from public.organization_ai_accounts where mode='platform' and state in('trial','active') and access_until>now() and monthly_remaining+case when state='active' then extra_remaining else 0 end<10),
  'offline_channels',(select count(*) from public.channel_sessions where archived_at is null and status<>'WORKING'),
  'failed_jobs',(select count(*) from public.job_queue where status='dead')
) $$;
revoke all on function public.fn_admin_saas_overview() from public,anon,authenticated;
grant execute on function public.fn_admin_saas_overview() to service_role;
create or replace function public.fn_ai_commercial_notice(p_org uuid,p_code text) returns void
language plpgsql set search_path='' as $$ declare a public.organization_ai_accounts; msg text; begin
  select * into a from public.organization_ai_accounts where organization_id=p_org for update;
  if not found then return; end if;
  msg:=case when a.state='active' and a.access_until>now() and a.monthly_remaining+a.extra_remaining<10
    then 'Seus créditos acabaram. A franquia renova em '||to_char(a.period_end at time zone 'UTC','DD/MM/YYYY')||' (UTC). Consulte os pacotes extras no faturamento. Seu time pode continuar atendendo manualmente.'
    when a.state='trial' then 'Seu teste terminou ou os créditos acabaram. Contrate um plano para continuar com IA. Consulte o faturamento.'
    else 'Seu atendimento com IA está pausado. Confira o período contratado e a situação no faturamento. Consulta, exportação, suporte e contratação continuam acessíveis.' end;
  -- Pendências ainda abertas também passam à linguagem atual, sem duplicação.
  update public.agent_inbox_items set body=msg
    where organization_id=p_org and kind='commercial_ai_paused' and status='open'
      and body is distinct from msg;
  insert into public.agent_inbox_items(organization_id,kind,severity,title,body)
    select p_org,'commercial_ai_paused','warn','Seu agente precisa de atenção',msg
    where not exists(select 1 from public.agent_inbox_items where organization_id=p_org and kind='commercial_ai_paused' and status='open');
end $$;
revoke all on function public.fn_ai_commercial_notice(uuid,text) from public,anon,authenticated;
grant execute on function public.fn_ai_commercial_notice(uuid,text) to service_role;

create or replace function public.fn_ai_account_notice() returns trigger
language plpgsql security definer set search_path='' as $$ begin
  if new.mode='platform' and (new.state in('expired','suspended') or new.state in('active','trial') and
    (new.access_until<=now() or new.monthly_remaining+(case when new.state='active' then new.extra_remaining else 0 end)<10)) then
    perform public.fn_ai_commercial_notice(new.organization_id,new.state);
  elsif new.mode='platform' and new.state in('active','trial') and new.access_until>now() and
    new.monthly_remaining+(case when new.state='active' then new.extra_remaining else 0 end)>=10 then
    update public.agent_inbox_items set status='resolved' where organization_id=new.organization_id and kind='commercial_ai_paused' and status='open';
  end if;
  return new;
end $$;
revoke all on function public.fn_ai_account_notice() from public,anon,authenticated,service_role;
update public.organization_ai_accounts set updated_at=updated_at where mode='platform';
