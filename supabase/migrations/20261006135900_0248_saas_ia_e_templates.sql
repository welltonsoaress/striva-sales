-- 0248: IA incluída. Organizações anteriores ficam explicitamente no modo legado.
alter table public.llm_calls add column if not exists pricing_snapshot jsonb;
alter table public.ai_models add column if not exists cache_read_price_per_million_cents numeric;
alter table public.ai_models add column if not exists cache_write_price_per_million_cents numeric;
alter table public.ai_models add column if not exists pricing_verified_at timestamptz;
alter table public.ai_models add column if not exists pricing_source text;
alter table public.organizations add column if not exists signup_origin text;
alter table public.ai_agents add column if not exists business_segment text;
alter table public.ai_agents add column if not exists template_version integer;
alter table public.ai_agent_versions add column if not exists operator_prompt text;
alter table public.channel_sessions add column if not exists verified_at timestamptz;
alter table public.channel_sessions add column if not exists verification_phone_hash text;
alter table public.billing_checkouts add column if not exists limits_snapshot jsonb;
alter table public.billing_payments add column if not exists first_paid_at timestamptz;
alter table public.billing_payments add column if not exists paid_date_inferred boolean not null default false;
alter table public.billing_payments add column if not exists paid_access_until timestamptz;
update public.billing_payments set first_paid_at=last_event_at,paid_date_inferred=true where first_paid_at is null and status in('APPROVED','COMPLETE');
update public.billing_checkouts c set limits_snapshot=p.limits from public.commercial_plans p where c.plan_id=p.id and c.limits_snapshot is null;

create table if not exists public.organization_ai_accounts (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  mode text not null default 'legacy' check(mode in ('legacy','platform')),
  state text not null default 'pending' check(state in ('pending','trial','active','expired','suspended')),
  plan_id uuid references public.commercial_plans(id),
  anchor_at timestamptz, access_until timestamptz,
  period_start timestamptz, period_end timestamptz,
  monthly_allowance integer not null default 0 check(monthly_allowance>=0),
  monthly_remaining integer not null default 0 check(monthly_remaining>=0),
  extra_remaining integer not null default 0 check(extra_remaining>=0),
  user_limit integer not null default 1 check(user_limit>0),
  channel_limit integer not null default 1 check(channel_limit>0),
  updated_at timestamptz not null default now()
);
insert into public.organization_ai_accounts(organization_id,mode) select id,'legacy' from public.organizations on conflict do nothing;

create table if not exists public.ai_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reference text not null, kind text not null check(kind in ('trial','subscription','renewal','extra','adjustment','debit','refund')),
  units integer not null, reason text, actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), unique(organization_id,reference)
);
create table if not exists public.ai_response_reservations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reference text not null, source text not null check(source in ('monthly','extra')),
  period_start timestamptz not null,
  state text not null default 'reserved' check(state in ('reserved','committed','released','uncertain')),
  expected_parts integer check(expected_parts>0),
  sealed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(organization_id,id), unique(organization_id,reference)
);
alter table public.messages add column if not exists ai_response_id uuid;
alter table public.messages add column if not exists ai_response_part integer;
alter table public.ai_response_usage add column if not exists meter text not null default 'message_v1';
create table if not exists public.ai_response_parts (
  organization_id uuid not null, response_id uuid not null, part integer not null check(part>0), accepted_at timestamptz not null default now(),
  primary key(organization_id,response_id,part),
  foreign key(organization_id,response_id) references public.ai_response_reservations(organization_id,id) on delete cascade
);
do $$ begin
  if not exists(select 1 from pg_constraint where conname='messages_ai_response_org_fk') then
    alter table public.messages add constraint messages_ai_response_org_fk foreign key(organization_id,ai_response_id)
      references public.ai_response_reservations(organization_id,id);
  end if;
end $$;
create index if not exists messages_ai_response_idx on public.messages(organization_id,ai_response_id);

create table if not exists public.ai_trial_claims (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_hash text not null unique, phone_hash text not null unique,
  device_hash text, ip_hash text, created_at timestamptz not null default now(),
  unique(organization_id)
);
create table if not exists public.ai_paid_access (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  transaction_code text not null,
  paid_at timestamptz not null, access_until timestamptz not null,
  revoked_at timestamptz,
  primary key(organization_id,transaction_code)
);
alter table public.ai_trial_claims add column if not exists risk_signals text[] not null default '{}';
create table if not exists public.ai_trial_exceptions (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id), reason text not null check(length(reason)>=10),
  expires_at timestamptz not null, consumed_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.platform_ai_settings (
  id boolean primary key default true check(id),
  enabled boolean not null default false,
  provider text, model text, operator_model text,
  max_output_tokens integer not null default 2048 check(max_output_tokens between 128 and 16000),
  max_steps integer not null default 10 check(max_steps between 1 and 25),
  monthly_cost_limit_cents numeric not null default 0 check(monthly_cost_limit_cents>=0),
  updated_at timestamptz not null default now()
);
alter table public.platform_ai_settings add column if not exists purpose_models jsonb not null default '{}';
alter table public.platform_ai_settings add column if not exists transcription_price_per_minute_cents numeric check(transcription_price_per_minute_cents>=0);
alter table public.platform_ai_settings add column if not exists transcription_pricing_source text;
alter table public.platform_ai_settings add column if not exists requests_per_minute integer not null default 60 check(requests_per_minute between 1 and 1000);
alter table public.ai_response_reservations add column if not exists sealed_at timestamptz;
insert into public.platform_ai_settings(id) values(true) on conflict do nothing;
create table if not exists public.ai_credit_packs (
  id uuid primary key default gen_random_uuid(), name text not null,
  units integer not null check(units>0), price_cents bigint check(price_cents>0),
  currency text not null default 'BRL' check(currency='BRL'),
  hotmart_offer jsonb, publication_state text not null default 'draft' check(publication_state in ('draft','published')),
  created_at timestamptz not null default now()
);
create table if not exists public.ai_operational_buckets (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  minute timestamptz not null,hits integer not null default 0,primary key(organization_id,minute)
);
alter table public.billing_checkouts alter column plan_id drop not null;
alter table public.billing_checkouts add column if not exists credit_pack_id uuid references public.ai_credit_packs(id);
alter table public.billing_checkouts add column if not exists credit_units integer;
do $$ begin
  if not exists(select 1 from pg_constraint where conname='billing_checkout_purchase_kind') then
    alter table public.billing_checkouts add constraint billing_checkout_purchase_kind check
      ((plan_id is not null and credit_pack_id is null) or (plan_id is null and credit_pack_id is not null and credit_units>0));
  end if;
end $$;

do $$ declare t text; begin
  foreach t in array array['organization_ai_accounts','ai_credit_ledger','ai_response_reservations','ai_response_parts'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('grant select,insert,update,delete on public.%I to service_role',t);
    execute format('drop policy if exists %I on public.%I','tenant_isolation_'||t||'_select',t);
    execute format('create policy %I on public.%I for select to authenticated using(organization_id in(select public.fn_user_org_ids()) and public.fn_role_at_least(organization_id,''admin''))','tenant_isolation_'||t||'_select',t);
  end loop;
  foreach t in array array['platform_ai_settings','ai_trial_claims','ai_credit_packs','ai_paid_access','ai_trial_exceptions','ai_operational_buckets'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select,insert,update,delete on public.%I to service_role',t);
  end loop;
end $$;
revoke update,delete on public.ai_credit_ledger from service_role;
create index if not exists ai_credit_ledger_org_time_idx on public.ai_credit_ledger(organization_id,created_at desc);
-- INVOKER distingue REST direta de funções canônicas SECURITY DEFINER.
create or replace function public.fn_protect_channel_verification() returns trigger
language plpgsql set search_path='' as $$ begin
  if current_user in('authenticated','anon') then
    if tg_op='INSERT' then
      new.verified_at:=null; new.verification_phone_hash:=null;
      if exists(select 1 from public.organization_ai_accounts where organization_id=new.organization_id and mode='platform') then raise exception 'canonical_channel_connection_required'; end if;
    else
      new.verified_at:=old.verified_at; new.verification_phone_hash:=old.verification_phone_hash;
      if new.organization_id is distinct from old.organization_id then raise exception 'channel_tenant_immutable'; end if;
      if exists(select 1 from public.organization_ai_accounts where organization_id=old.organization_id and mode='platform') and (
        new.status is distinct from old.status or new.phone_number is distinct from old.phone_number or
        new.organization_id is distinct from old.organization_id or
        new.waha_session_name is distinct from old.waha_session_name or new.provider is distinct from old.provider or
        new.meta_phone_number_id is distinct from old.meta_phone_number_id or new.meta_waba_id is distinct from old.meta_waba_id or
        new.meta_token_encrypted is distinct from old.meta_token_encrypted or new.zernio_account_id is distinct from old.zernio_account_id or
        new.zernio_token_encrypted is distinct from old.zernio_token_encrypted
      ) then raise exception 'channel_verification_server_owned'; end if;
    end if;
  end if;
  return new;
end $$;
revoke all on function public.fn_protect_channel_verification() from public,anon,authenticated,service_role;
drop trigger if exists trg_protect_channel_verification on public.channel_sessions;
create trigger trg_protect_channel_verification before insert or update on public.channel_sessions for each row execute function public.fn_protect_channel_verification();
create unique index if not exists org_memory_versions_org_id_unique on public.org_memory_versions(organization_id,id);
do $$ begin
  if not exists(select 1 from pg_constraint where conname='org_memory_pointer_same_org') then
    alter table public.org_memory_pointers add constraint org_memory_pointer_same_org foreign key(organization_id,version_id) references public.org_memory_versions(organization_id,id);
  end if;
end $$;
create or replace function public.fn_onboarding_memory(p_org uuid,p_user uuid,p_content text) returns uuid
language plpgsql set search_path='' as $$ declare ver uuid; n integer; begin
  perform 1 from public.organizations where id=p_org for update;
  if not exists(select 1 from public.user_organizations where organization_id=p_org and user_id=p_user and role='admin' and revoked_at is null and accepted_at is not null) then raise exception 'admin_required'; end if;
  if length(p_content)>20000 then raise exception 'content_too_long'; end if;
  select v.id into ver from public.org_memory_pointers p join public.org_memory_versions v on v.id=p.version_id and v.organization_id=p.organization_id where p.organization_id=p_org and v.content=p_content;
  if found then return ver; end if;
  select coalesce(max(version_number),0)+1 into n from public.org_memory_versions where organization_id=p_org;
  insert into public.org_memory_versions(organization_id,version_number,content,created_by) values(p_org,n,p_content,p_user) returning id into ver;
  insert into public.org_memory_pointers(organization_id,version_id,updated_at) values(p_org,ver,now()) on conflict(organization_id) do update set version_id=excluded.version_id,updated_at=excluded.updated_at;
  return ver;
end $$;
revoke all on function public.fn_onboarding_memory(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.fn_onboarding_memory(uuid,uuid,text) to service_role;
-- Catálogo público não contém ofertas administrativas ou rascunhos.
drop policy if exists commercial_plans_read on public.commercial_plans;
create policy commercial_plans_read on public.commercial_plans for select to authenticated using(publication_state='published');
revoke select on public.commercial_plans from authenticated;
grant select(id,slug,name,description,price_cents,currency,billing_interval,recommended,limits,position,publication_state) on public.commercial_plans to authenticated;
alter table public.commercial_plans add column if not exists checkout_available boolean generated always as
  (publication_state='published' and price_cents is not null and billing_interval is not null and hotmart_offer @> '{"enabled":true}'::jsonb) stored;
grant select(checkout_available) on public.commercial_plans to authenticated;

alter table public.organization_ai_accounts add column if not exists extra_debt integer not null default 0 check(extra_debt>=0);
alter table public.agent_inbox_items drop constraint if exists agent_inbox_items_kind_check;
alter table public.agent_inbox_items add constraint agent_inbox_items_kind_check check(kind in
 ('appointment_outcome_required','appointment_recovery_review','qr_rescan','routing_unassigned','job_dead','event_dead','budget_exceeded','handoff','promotion_review','judge_unaligned','followup_dead','snooze_expired','next_action_ambiguous','risk_backlog_seeded','reactivation_expired','capabilities_missing','message_send_stuck','midia_nao_lida','channel_template_review','channel_number_alert','promise_unfulfilled','contact_proposal_expired','budget_warning','conhecimento_nao_indexado','voice_call_missed','commercial_ai_paused','other'));
create or replace function public.fn_ai_commercial_notice(p_org uuid,p_code text) returns void
language plpgsql set search_path='' as $$ begin
  perform 1 from public.organization_ai_accounts where organization_id=p_org for update;
  insert into public.agent_inbox_items(organization_id,kind,severity,title,body)
    select p_org,'commercial_ai_paused','warn','Seu agente precisa de atenção',
      'A IA incluída está pausada ('||left(p_code,80)||'). Confira Respostas disponíveis e o período contratado. Atendimento humano continua disponível enquanto houver acesso ao período.'
    where not exists(select 1 from public.agent_inbox_items where organization_id=p_org and kind='commercial_ai_paused' and status='open');
end $$;
revoke all on function public.fn_ai_commercial_notice(uuid,text) from public,anon,authenticated;
grant execute on function public.fn_ai_commercial_notice(uuid,text) to service_role;
create or replace function public.fn_ai_account_notice() returns trigger
language plpgsql security definer set search_path='' as $$ begin
  if new.mode='platform' and (new.state in('expired','suspended') or new.state in('active','trial') and new.monthly_remaining=0 and (new.state='trial' or new.extra_remaining=0)) then
    perform public.fn_ai_commercial_notice(new.organization_id,new.state);
  elsif new.mode='platform' and new.state in('active','trial') and new.monthly_remaining+new.extra_remaining>0 then
    update public.agent_inbox_items set status='resolved' where organization_id=new.organization_id and kind='commercial_ai_paused' and status='open';
  end if;
  return new;
end $$;
revoke all on function public.fn_ai_account_notice() from public,anon,authenticated,service_role;
drop trigger if exists trg_ai_account_notice on public.organization_ai_accounts;
create trigger trg_ai_account_notice after update on public.organization_ai_accounts for each row execute function public.fn_ai_account_notice();

create or replace function public.fn_billing_first_payment() returns trigger
language plpgsql set search_path='' as $$ begin
  if tg_op='UPDATE' then new.first_paid_at:=old.first_paid_at; new.paid_date_inferred:=old.paid_date_inferred; end if;
  if new.first_paid_at is null and new.status in('APPROVED','COMPLETE') then new.first_paid_at:=new.last_event_at; new.paid_date_inferred:=false; end if;
  return new;
end $$;
revoke all on function public.fn_billing_first_payment() from public,anon,authenticated,service_role;
drop trigger if exists trg_billing_first_payment on public.billing_payments;
create trigger trg_billing_first_payment before insert or update on public.billing_payments for each row execute function public.fn_billing_first_payment();

create or replace function public.fn_new_ai_account() returns trigger
language plpgsql security definer set search_path='' as $$ begin
  insert into public.organization_ai_accounts(organization_id,mode) values(new.id,case when new.signup_origin='self_service' or current_setting('role',true) in('authenticated','anon') then 'platform' else 'legacy' end) on conflict do nothing;
  return new;
end $$;
revoke all on function public.fn_new_ai_account() from public,anon,authenticated,service_role;
drop trigger if exists trg_new_ai_account on public.organizations;
create trigger trg_new_ai_account after insert on public.organizations for each row execute function public.fn_new_ai_account();
create or replace function public.fn_protect_signup_origin() returns trigger
language plpgsql set search_path='' as $$ begin
  if current_setting('role',true) in('authenticated','anon') then
    if tg_op='INSERT' then new.signup_origin:='self_service'; else new.signup_origin:=old.signup_origin; end if;
  end if;
  if tg_op='INSERT' and new.signup_origin is null and current_user not in('authenticated','anon') then
    if exists(select 1 from public.platform_admins where user_id=new.created_by and scope='full' and revoked_at is null)
      then new.signup_origin:='manual'; end if;
  end if;
  return new;
end $$;
revoke execute on function public.fn_protect_signup_origin() from public,anon,authenticated,service_role;
drop trigger if exists trg_protect_signup_origin on public.organizations;
create trigger trg_protect_signup_origin before insert or update on public.organizations for each row execute function public.fn_protect_signup_origin();

-- A âncora original nunca é substituída pelo último dia de fevereiro.
create or replace function public.fn_ai_anniversary(p_anchor timestamptz,p_months integer) returns timestamptz
language sql immutable set search_path='' as $$
  select ((date_trunc('month',p_anchor at time zone 'UTC')+make_interval(months=>p_months))
    +make_interval(days=>least(extract(day from p_anchor at time zone 'UTC')::integer,
      extract(day from date_trunc('month',p_anchor at time zone 'UTC')+make_interval(months=>p_months+1)-interval '1 day')::integer)-1)
    +((p_anchor at time zone 'UTC')::time)) at time zone 'UTC'
$$;
revoke all on function public.fn_ai_anniversary(timestamptz,integer) from public,anon,authenticated;
grant execute on function public.fn_ai_anniversary(timestamptz,integer) to service_role;

create or replace function public.fn_ai_renew(p_org uuid) returns void
language plpgsql set search_path='' as $$
declare a public.organization_ai_accounts; m integer; s timestamptz; begin
  select * into a from public.organization_ai_accounts where organization_id=p_org for update;
  if not found then raise exception 'ai_account_missing'; end if;
  if a.mode='legacy' then return; end if;
  if a.access_until<=now() and a.state in('trial','active') then
    update public.organization_ai_accounts set state='expired',updated_at=now() where organization_id=p_org; return;
  end if;
  if a.state<>'active' or a.anchor_at is null or a.period_end>now() then return; end if;
  m:=greatest(0,(extract(year from now() at time zone 'UTC')::integer-extract(year from a.anchor_at at time zone 'UTC')::integer)*12
    +extract(month from now() at time zone 'UTC')::integer-extract(month from a.anchor_at at time zone 'UTC')::integer);
  s:=public.fn_ai_anniversary(a.anchor_at,m);
  if s>now() then m:=m-1; s:=public.fn_ai_anniversary(a.anchor_at,m); end if;
  insert into public.ai_credit_ledger(organization_id,reference,kind,units) values(p_org,'renewal:'||s::text,'renewal',a.monthly_allowance) on conflict do nothing;
  update public.organization_ai_accounts set monthly_remaining=monthly_allowance,period_start=s,
    period_end=public.fn_ai_anniversary(a.anchor_at,m+1),updated_at=now() where organization_id=p_org;
end $$;
revoke all on function public.fn_ai_renew(uuid) from public,anon,authenticated;
grant execute on function public.fn_ai_renew(uuid) to service_role;

create or replace function public.fn_ai_reserve(p_org uuid,p_reference text) returns uuid
language plpgsql set search_path='' as $$
declare a public.organization_ai_accounts; r public.ai_response_reservations; src text; begin
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
  if a.monthly_remaining>0 then src:='monthly';
  elsif a.state='active' and a.extra_remaining>0 then src:='extra';
  else raise exception 'ai_credits_exhausted'; end if;
  update public.organization_ai_accounts set monthly_remaining=monthly_remaining-case when src='monthly' then 1 else 0 end,
    extra_remaining=extra_remaining-case when src='extra' then 1 else 0 end,updated_at=now() where organization_id=p_org;
  insert into public.ai_response_reservations(organization_id,reference,source,period_start)
    values(p_org,p_reference,src,a.period_start) returning * into r;
  return r.id;
end $$;
revoke all on function public.fn_ai_reserve(uuid,text) from public,anon,authenticated;
grant execute on function public.fn_ai_reserve(uuid,text) to service_role;

create or replace function public.fn_ai_check_access(p_org uuid,p_purpose text,p_job uuid default null) returns void
language plpgsql set search_path='' as $$ declare a public.organization_ai_accounts; cap integer; used integer; budget numeric; begin
  perform public.fn_ai_renew(p_org);
  select * into a from public.organization_ai_accounts where organization_id=p_org;
  if not found then raise exception 'ai_account_missing'; end if;
  if a.mode='legacy' then return; end if;
  if not (a.state='pending' and p_purpose in('agent_test','agent_preview','checkpoint','connection_test')) then
    if a.state not in('active','trial') or a.access_until is null or a.access_until<=now() then raise exception 'ai_access_inactive'; end if;
    if a.monthly_remaining=0 and (a.state<>'active' or a.extra_remaining=0) and not exists(
      select 1 from public.ai_response_reservations r where r.organization_id=p_org and r.state in('reserved','uncertain','committed') and
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

create or replace function public.fn_ai_settle(p_org uuid,p_id uuid,p_release boolean default false) returns text
language plpgsql set search_path='' as $$
declare r public.ai_response_reservations; a public.organization_ai_accounts; n integer; accepted integer; uncertain integer; begin
  -- Mesma ordem de travas que a reserva: conta antes da resposta.
  select * into a from public.organization_ai_accounts where organization_id=p_org for update;
  select * into r from public.ai_response_reservations where organization_id=p_org and id=p_id for update;
  if not found then raise exception 'ai_reservation_not_found'; end if;
  if r.state in('committed','released') then return r.state; end if;
  select count(*) into accepted from public.ai_response_parts where organization_id=p_org and response_id=p_id and part<=r.expected_parts;
  select count(*) into uncertain from public.messages m where m.organization_id=p_org and m.ai_response_id=p_id and m.status in('sending','queued')
    and not exists(select 1 from public.ai_response_parts p where p.organization_id=p_org and p.response_id=p_id and p.part=m.ai_response_part);
  if r.sealed_at is not null and r.expected_parts is not null and accepted=r.expected_parts then
    update public.ai_response_reservations set state='committed',updated_at=now() where id=p_id;
    insert into public.ai_credit_ledger(organization_id,reference,kind,units) values(p_org,'response:'||p_id,'debit',-1) on conflict do nothing;
    return 'committed';
  end if;
  if p_release and uncertain=0 then
    if r.source='extra' then update public.organization_ai_accounts set extra_remaining=extra_remaining+case when extra_debt=0 then 1 else 0 end,extra_debt=greatest(0,extra_debt-1) where organization_id=p_org;
    elsif a.period_start=r.period_start then update public.organization_ai_accounts set monthly_remaining=monthly_remaining+1 where organization_id=p_org;
    end if;
    update public.ai_response_reservations set state='released',updated_at=now() where id=p_id; return 'released';
  end if;
  update public.ai_response_reservations set state='uncertain',updated_at=now() where id=p_id; return 'uncertain';
end $$;
revoke all on function public.fn_ai_settle(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.fn_ai_settle(uuid,uuid,boolean) to service_role;

create or replace function public.fn_ai_protect_response() returns trigger
language plpgsql security definer set search_path='' as $$ begin
  if current_setting('role',true) in('anon','authenticated') then
    if tg_op='INSERT' then new.ai_response_id:=null; new.ai_response_part:=null;
    else new.ai_response_id:=old.ai_response_id; new.ai_response_part:=old.ai_response_part; end if;
  end if;
  return new;
end $$;
revoke all on function public.fn_ai_protect_response() from public,anon,authenticated,service_role;
drop trigger if exists trg_ai_protect_response on public.messages;
create trigger trg_ai_protect_response before insert or update on public.messages for each row execute function public.fn_ai_protect_response();

-- As funções existentes usam nomes não qualificados; caminho fixo preserva seu contrato.
alter function public.fn_agent_versions_immutable() set search_path=public,pg_temp;
alter function public.fn_ai_agent_version_content_immutable() set search_path=public,pg_temp;
alter function public.fn_contato_anonimizado_limpa_campos_personalizados() set search_path=public,pg_temp;
revoke execute on function public.fn_agent_versions_immutable(),public.fn_ai_agent_version_content_immutable(),public.fn_contato_anonimizado_limpa_campos_personalizados() from public,anon,authenticated,service_role;
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
    period_start=now(),period_end=now()+interval '7 days',monthly_allowance=100,monthly_remaining=100,user_limit=1,channel_limit=1,updated_at=now()
    where organization_id=p_org;
  insert into public.ai_credit_ledger(organization_id,reference,kind,units,actor_user_id) values(p_org,'trial','trial',100,p_user);
end $$;
revoke all on function public.fn_ai_start_trial(uuid,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.fn_ai_start_trial(uuid,uuid,text,text,text,text) to service_role;

create or replace function public.fn_ai_apply_payment(p_org uuid,p_transaction text) returns void
language plpgsql set search_path='' as $$
declare payment public.billing_payments; c public.billing_contracts; o public.billing_checkouts; a public.organization_ai_accounts; months integer; until_at timestamptz; limits jsonb; begin
  select * into payment from public.billing_payments where organization_id=p_org and transaction_code=p_transaction;
  if not found then raise exception 'payment_not_found'; end if;
  select * into c from public.billing_contracts where organization_id=payment.organization_id and id=payment.contract_id;
  select * into o from public.billing_checkouts where organization_id=payment.organization_id and id=c.checkout_id;
  select * into a from public.organization_ai_accounts where organization_id=payment.organization_id for update;
  if not found or a.mode='legacy' then return; end if;
  if payment.status in('APPROVED','COMPLETE') then
    if exists(select 1 from public.ai_credit_ledger where organization_id=payment.organization_id and reference='payment:'||payment.transaction_code) then return; end if;
    if o.credit_pack_id is not null then
      if a.state not in('active','suspended') or a.access_until<=now() or not exists(select 1 from public.ai_paid_access where organization_id=p_org and revoked_at is null and access_until>now()) then raise exception 'ai_subscription_required_for_extra'; end if;
      update public.organization_ai_accounts set extra_remaining=extra_remaining+greatest(0,o.credit_units-extra_debt),extra_debt=greatest(0,extra_debt-o.credit_units) where organization_id=payment.organization_id;
      insert into public.ai_credit_ledger(organization_id,reference,kind,units) values(payment.organization_id,'payment:'||payment.transaction_code,'extra',o.credit_units);
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
        monthly_allowance=(limits->>'ai_credits')::integer,
        monthly_remaining=case when a.state in('active','suspended') and a.anchor_at is not null then a.monthly_remaining else (limits->>'ai_credits')::integer end,
        period_start=case when a.state in('active','suspended') and a.anchor_at is not null then a.period_start else payment.first_paid_at end,
        period_end=case when a.state in('active','suspended') and a.anchor_at is not null then a.period_end else public.fn_ai_anniversary(payment.first_paid_at,1) end,
        user_limit=(limits->>'users')::integer,channel_limit=(limits->>'whatsapp_numbers')::integer,updated_at=now()
      where organization_id=payment.organization_id;
      insert into public.ai_credit_ledger(organization_id,reference,kind,units) values(payment.organization_id,'payment:'||payment.transaction_code,'subscription',case when a.state='active' then 0 else (limits->>'ai_credits')::integer end);
    end if;
  elsif payment.status in('REFUNDED','CHARGEBACK') then
    if o.credit_pack_id is not null then
      if exists(select 1 from public.ai_credit_ledger where organization_id=payment.organization_id and reference='payment:'||payment.transaction_code)
        and not exists(select 1 from public.ai_credit_ledger where organization_id=payment.organization_id and reference='refund:'||payment.transaction_code) then
        update public.organization_ai_accounts set extra_debt=extra_debt+greatest(0,o.credit_units-extra_remaining),extra_remaining=greatest(0,extra_remaining-o.credit_units) where organization_id=payment.organization_id;
        insert into public.ai_credit_ledger(organization_id,reference,kind,units) values(payment.organization_id,'refund:'||payment.transaction_code,'refund',-o.credit_units);
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
create or replace function public.fn_ai_payment_entitlements() returns trigger
language plpgsql security definer set search_path='' as $$ begin
  if tg_op='UPDATE' and new.status=old.status then return new; end if;
  perform public.fn_ai_apply_payment(new.organization_id,new.transaction_code);
  return new;
end $$;
revoke all on function public.fn_ai_payment_entitlements() from public,anon,authenticated,service_role;
drop trigger if exists trg_ai_payment_entitlements on public.billing_payments;
create trigger trg_ai_payment_entitlements after insert or update on public.billing_payments for each row execute function public.fn_ai_payment_entitlements();
-- Limite serializado no banco: protege REST direta, convites e workers também.
create or replace function public.fn_ai_capacity_limit() returns trigger
language plpgsql security definer set search_path='' as $$
declare a public.organization_ai_accounts; used integer; begin
  select * into a from public.organization_ai_accounts where organization_id=new.organization_id for update;
  if not found or a.mode='legacy' then return new; end if;
  if tg_table_name='user_organizations' then
    if new.revoked_at is not null then return new; end if;
    if tg_op='UPDATE' and old.revoked_at is null and old.organization_id=new.organization_id then return new; end if;
    if a.state in('expired','suspended') or a.state in('active','trial') and a.access_until<=now() then raise exception 'commercial_read_only'; end if;
    select count(*) into used from public.user_organizations where organization_id=new.organization_id and revoked_at is null and id<>new.id;
    if used>=a.user_limit then raise exception 'commercial_user_limit'; end if;
  else
    if new.archived_at is not null then return new; end if;
    if tg_op='UPDATE' and old.archived_at is null and old.organization_id=new.organization_id then return new; end if;
    if a.state in('expired','suspended') or a.state in('active','trial') and a.access_until<=now() then raise exception 'commercial_read_only'; end if;
    select count(*) into used from public.channel_sessions where organization_id=new.organization_id and archived_at is null and id<>new.id;
    if used>=a.channel_limit then raise exception 'commercial_channel_limit'; end if;
  end if;
  return new;
end $$;
revoke all on function public.fn_ai_capacity_limit() from public,anon,authenticated,service_role;
drop trigger if exists trg_ai_user_limit on public.user_organizations;
create trigger trg_ai_user_limit before insert or update on public.user_organizations for each row execute function public.fn_ai_capacity_limit();
drop trigger if exists trg_ai_channel_limit on public.channel_sessions;
create trigger trg_ai_channel_limit before insert or update on public.channel_sessions for each row execute function public.fn_ai_capacity_limit();

create or replace function public.fn_provision_self_service(p_user uuid,p_name text,p_slug text) returns uuid
language plpgsql security definer set search_path='' as $$ declare org uuid; attempt integer; begin
  perform pg_advisory_xact_lock(hashtextextended('signup:'||p_user::text,0));
  select organization_id into org from public.user_organizations where user_id=p_user and revoked_at is null and accepted_at is not null limit 1;
  if found then return org; end if;
  if not exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null) then raise exception 'signup_email_unverified'; end if;
  for attempt in 0..4 loop
    begin
      insert into public.organizations(slug,display_name,legal_name,status,created_by,signup_origin)
        values(left(p_slug,32)||case when attempt=0 then '' else '-'||substr(gen_random_uuid()::text,1,8) end,
          left(p_name,200),left(p_name,200),'active',p_user,'self_service') returning id into org;
      exit;
    exception when unique_violation then if attempt=4 then raise; end if; end;
  end loop;
  insert into public.user_organizations(user_id,organization_id,role,accepted_at) values(p_user,org,'admin',now());
  return org;
end $$;
revoke all on function public.fn_provision_self_service(uuid,text,text) from public,anon,authenticated;
grant execute on function public.fn_provision_self_service(uuid,text,text) to service_role;

create or replace function public.fn_ai_finish_job() returns trigger
language plpgsql security definer set search_path='' as $$ declare response uuid; begin
  if new.status not in('done','dead','failed') or new.status=old.status then return new; end if;
  select id into response from public.ai_response_reservations where organization_id=new.organization_id and reference='job:'||new.id;
  if response is null then return new; end if;
  update public.ai_response_reservations set sealed_at=now() where organization_id=new.organization_id and id=response;
  if new.status='done' then
    perform public.fn_ai_settle(new.organization_id,response,true);
  else perform public.fn_ai_settle(new.organization_id,response,true); end if;
  return new;
end $$;
revoke all on function public.fn_ai_finish_job() from public,anon,authenticated,service_role;
drop trigger if exists trg_ai_finish_job on public.job_queue;
create trigger trg_ai_finish_job after update on public.job_queue for each row execute function public.fn_ai_finish_job();

-- Um pacote inicial inteiro ou nenhum: retomada não duplica agentes/versões.
drop function if exists public.fn_prepare_business_agent(uuid,uuid,text,integer,text,text,text[],text[],jsonb);
create or replace function public.fn_prepare_business_agent(p_org uuid,p_user uuid,p_segment text,p_template integer,p_prompt text,p_operator_prompt text,p_tools text[],p_operator_tools text[],p_funnel jsonb,p_agenda jsonb default null) returns jsonb
language plpgsql set search_path='' as $$
declare a public.ai_agents; v uuid; next_version integer; channel uuid; pipeline uuid; platform_config public.platform_ai_settings; applied jsonb; stage_data jsonb; begin
  perform 1 from public.organizations where id=p_org for update;
  if not exists(select 1 from public.organization_ai_accounts where organization_id=p_org and mode='platform') then raise exception 'managed_account_required'; end if;
  if not exists(select 1 from public.user_organizations where organization_id=p_org and user_id=p_user and role='admin' and revoked_at is null and accepted_at is not null) then raise exception 'admin_required'; end if;
  select * into platform_config from public.platform_ai_settings where id=true and enabled;
  if not found or platform_config.model is null or platform_config.provider is null then raise exception 'ai_platform_unavailable'; end if;
  select id into channel from public.channel_sessions where organization_id=p_org and archived_at is null and status='WORKING' and phone_number is not null and verified_at is not null order by created_at limit 1;
  if channel is null then raise exception 'whatsapp_verification_required'; end if;
  select * into a from public.ai_agents where organization_id=p_org and is_default and archived_at is null for update;
  if found and a.published_version_id is not null then return jsonb_build_object('agent_id',a.id,'version_id',a.published_version_id,'preserved',true); end if;
  if a.id is null then
    insert into public.ai_agents(organization_id,name,system_prompt,kind,is_default,is_active,created_by,business_segment,template_version)
      values(p_org,'Seu agente',p_prompt,'mcp_agent',true,false,p_user,p_segment,p_template) returning * into a;
  end if;
  select id into v from public.ai_agent_versions where organization_id=p_org and agent_id=a.id and provisioning_origin='onboarding' and status='draft' and system_prompt=p_prompt and operator_prompt=p_operator_prompt and tool_ids=p_tools and operator_tool_ids=p_operator_tools and channel_session_id=channel order by version_number desc limit 1;
  if v is not null and a.business_segment=p_segment and a.template_version=p_template and (select onboarding_state->'ai'->'agenda' from public.organizations where id=p_org) is not distinct from coalesce(p_agenda,'null'::jsonb) then return jsonb_build_object('agent_id',a.id,'version_id',v,'preserved',true); end if;
  if exists(select 1 from public.ai_agent_versions where organization_id=p_org and agent_id=a.id and provisioning_origin<>'onboarding') then raise exception 'existing_version_requires_review'; end if;
  select id into pipeline from public.crm_pipelines where organization_id=p_org and is_default and not is_archived limit 1;
  if pipeline is null then raise exception 'pipeline_not_found'; end if;
  select jsonb_agg(jsonb_build_object('nome',e->>'nome','slug','etapa-'||n,'position',n*1000,'is_won',e->>'passo'='won','is_lost',e->>'passo'='lost','agent_stage_hint',e->>'passo'))
    into stage_data from jsonb_array_elements(p_funnel->'etapas') with ordinality items(e,n);
  applied:=public.fn_aplicar_quadro_do_onboarding(p_org,pipeline,p_funnel->>'nome','atendimento',stage_data);
  if not coalesce((applied->>'ok')::boolean,false) then raise exception 'pipeline_requires_review'; end if;
  update public.crm_pipelines set settings=coalesce(settings,'{}')::jsonb||jsonb_build_object('flow',jsonb_build_object('stage_guidance',
    (select jsonb_object_agg(s.id::text,jsonb_build_object('purpose',e->>'orientacao')) from public.crm_stages s
      join jsonb_array_elements(p_funnel->'etapas') e on e->>'nome'=s.name where s.organization_id=p_org and s.pipeline_id=pipeline and not s.is_archived),
    'template_id',p_segment)) where organization_id=p_org and id=pipeline;
  if p_agenda is not null then
    if jsonb_array_length(p_agenda->'schedule'->'windows')=0 then raise exception 'agenda_availability_required'; end if;
    insert into public.calendar_event_types(organization_id,name,slug,category,duration_minutes,default_owner_user_id,requires_confirmation,is_active,reminder_enabled)
      values(p_org,p_agenda->>'name','onboarding-atendimento','outro',(p_agenda->>'duration_minutes')::integer,p_user,true,true,false)
      on conflict(organization_id,slug) do update set name=excluded.name,duration_minutes=excluded.duration_minutes,default_owner_user_id=excluded.default_owner_user_id,is_active=true;
    insert into public.attendant_availability(organization_id,user_id,is_available,schedule) values(p_org,p_user,true,p_agenda->'schedule')
      on conflict(organization_id,user_id) do update set schedule=excluded.schedule,is_available=true,updated_at=now();
  end if;
  select coalesce(max(version_number),0)+1 into next_version from public.ai_agent_versions where organization_id=p_org and agent_id=a.id;
  insert into public.ai_agent_versions(organization_id,agent_id,version_number,provisioning_origin,system_prompt,operator_prompt,provider,model,credential_id,
    tool_ids,operator_enabled,operator_model,operator_tool_ids,pipeline_ids,channel_session_id,status,created_by,split_messages,split_max_chars,max_steps,history_message_window,history_token_window)
    values(p_org,a.id,next_version,'onboarding',p_prompt,p_operator_prompt,platform_config.provider,platform_config.model,null,p_tools,true,coalesce(platform_config.operator_model,platform_config.model),p_operator_tools,array[pipeline],channel,'draft',p_user,true,250,platform_config.max_steps,20,8000) returning id into v;
  update public.ai_agents set business_segment=p_segment,template_version=p_template where organization_id=p_org and id=a.id;
  update public.organizations set onboarding_state=coalesce(onboarding_state,'{}')::jsonb||jsonb_build_object('ai',jsonb_build_object('agent_id',a.id,'prompt_template',p_segment,'template_version',p_template,'agenda',p_agenda),
    'funil',jsonb_build_object('pipeline_id',pipeline,'origem','pacote','etapas',jsonb_array_length(stage_data))) where id=p_org;
  return jsonb_build_object('agent_id',a.id,'version_id',v,'preserved',false);
end $$;
revoke all on function public.fn_prepare_business_agent(uuid,uuid,text,integer,text,text,text[],text[],jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.fn_prepare_business_agent(uuid,uuid,text,integer,text,text,text[],text[],jsonb,jsonb) to service_role;

create or replace function public.fn_activate_business_agent(p_org uuid,p_user uuid,p_agent uuid,p_version uuid,p_owner_hash text,p_phone_hash text,p_device_hash text,p_ip_hash text) returns void
language plpgsql set search_path='' as $$ begin
  perform 1 from public.organization_ai_accounts where organization_id=p_org for update;
  -- Ajustar a agenda pode produzir vários rascunhos. A publicação só admite
  -- versões do onboarding e nunca substitui uma publicação anterior.
  if exists(select 1 from public.ai_agents where organization_id=p_org and id=p_agent and published_version_id is not null and published_version_id<>p_version)
    or exists(select 1 from public.ai_agent_versions where organization_id=p_org and agent_id=p_agent and provisioning_origin is distinct from 'onboarding')
    then raise exception 'existing_version_requires_review'; end if;
  if not exists(select 1 from public.ai_agent_versions v join public.channel_sessions c on c.id=v.channel_session_id and c.organization_id=v.organization_id
    where v.organization_id=p_org and v.agent_id=p_agent and v.id=p_version and c.status='WORKING' and c.phone_number is not null and c.verified_at is not null and c.verification_phone_hash=p_phone_hash and c.archived_at is null) then raise exception 'whatsapp_verification_required'; end if;
  perform public.fn_ai_start_trial(p_org,p_user,p_owner_hash,p_phone_hash,p_device_hash,p_ip_hash);
  if not exists(select 1 from public.ai_agents where organization_id=p_org and id=p_agent and published_version_id=p_version) then
    perform public.fn_publish_ai_agent_version(p_org,p_agent,p_version,true,null);
  end if;
  update public.ai_agents set is_active=true where organization_id=p_org and id=p_agent;
  update public.organizations set onboarded_at=coalesce(onboarded_at,now()),
    onboarding_state=jsonb_set(coalesce(onboarding_state,'{}'),'{ai,activated_at}',to_jsonb(now()::text)) where id=p_org;
end $$;
revoke all on function public.fn_activate_business_agent(uuid,uuid,uuid,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.fn_activate_business_agent(uuid,uuid,uuid,uuid,text,text,text,text) to service_role;

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
    update public.organization_ai_accounts set mode='platform',state='pending',updated_at=now() where organization_id=p_org;
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
  'received_brl_cents',(select coalesce(sum(amount_cents),0) from public.billing_payments where status in('APPROVED','COMPLETE') and first_paid_at>=(date_trunc('month',now() at time zone 'UTC') at time zone 'UTC')),
  'known_cost_usd_cents',(select sum(cost_cents) from public.llm_calls where created_at>=(date_trunc('month',now() at time zone 'UTC') at time zone 'UTC')),
  'measured_calls',(select count(*) from public.llm_calls where cost_cents is not null and created_at>=(date_trunc('month',now() at time zone 'UTC') at time zone 'UTC')),
  'total_calls',(select count(*) from public.llm_calls where created_at>=(date_trunc('month',now() at time zone 'UTC') at time zone 'UTC')),
  'unknown_cost_calls',(select count(*) from public.llm_calls where cost_cents is null and created_at>=(date_trunc('month',now() at time zone 'UTC') at time zone 'UTC')),
  'uncertain_responses',(select count(*) from public.ai_response_reservations where state='uncertain'),
  'webhook_pending',(select count(*) from public.billing_webhook_events where state in('unmatched','failed')),
  'empty_balance',(select count(*) from public.organization_ai_accounts where mode='platform' and state in('trial','active') and access_until>now() and monthly_remaining+extra_remaining=0),
  'offline_channels',(select count(*) from public.channel_sessions where archived_at is null and status<>'WORKING'),
  'failed_jobs',(select count(*) from public.job_queue where status='dead')
) $$;
revoke all on function public.fn_admin_saas_overview() from public,anon,authenticated;
grant execute on function public.fn_admin_saas_overview() to service_role;

-- O vencimento impede escrita operacional inclusive pela REST direta.
-- Preparação inicial, financeiro, exportação e suporte têm superfícies próprias.
create or replace function public.fn_ai_operational_write_guard() returns trigger
language plpgsql security definer set search_path='' as $$ declare org uuid; a public.organization_ai_accounts; begin
  if tg_table_name='organizations' then
    org:=case when tg_op='DELETE' then old.id else new.id end;
  else org:=case when tg_op='DELETE' then old.organization_id else new.organization_id end; end if;
  select * into a from public.organization_ai_accounts where organization_id=org;
  if not found and current_setting('role',true) in('anon','authenticated') then raise exception 'commercial_account_unavailable'; end if;
  if found and a.mode='platform' and (a.state in('expired','suspended') or a.state in('trial','active') and (a.access_until is null or a.access_until<=now())) then
    -- Retenção/LGPD, entrada de mensagens e reconciliação continuam operando.
    -- IA tem sua própria barreira antes da chamada; envio novo ainda é bloqueado.
    if current_setting('role',true) not in('anon','authenticated') then
      if tg_op='DELETE' then return old; end if;
      if tg_table_name<>'messages' or tg_op='UPDATE' then return new; end if;
      if new.direction='inbound' then return new; end if;
    end if;
    raise exception 'commercial_read_only';
  end if;
  if tg_op='DELETE' then return old; end if; return new;
end $$;
revoke all on function public.fn_ai_operational_write_guard() from public,anon,authenticated,service_role;
do $$ declare t text; begin
  foreach t in array array['contacts','crm_leads','crm_tasks','messages','calendar_appointments','crm_pipelines','crm_stages'] loop
    if to_regclass('public.'||t) is not null then
      execute format('drop trigger if exists trg_commercial_write_guard on public.%I',t);
      execute format('create trigger trg_commercial_write_guard before insert or update or delete on public.%I for each row execute function public.fn_ai_operational_write_guard()',t);
    end if;
  end loop;
end $$;

-- A régua antiga continua intacta para recibos sem identidade de resposta.
create or replace function public.fn_registrar_resposta_ia() returns trigger
language plpgsql security definer set search_path='' as $$ declare inserted_id uuid; begin
  if current_setting('role',true) in('authenticated','anon') then return new; end if;
  if new.ai_response_id is not null then
    if new.direction='outbound' and new.status in('sent','delivered','read') and new.ai_response_part is not null then
      insert into public.ai_response_parts(organization_id,response_id,part) values(new.organization_id,new.ai_response_id,new.ai_response_part) on conflict do nothing;
    end if;
    perform public.fn_ai_settle(new.organization_id,new.ai_response_id,false); return new;
  end if;
  if not new.ai_credit_eligible or new.direction<>'outbound' or new.status not in('sent','delivered','read') then return new; end if;
  insert into public.ai_response_usage(id,organization_id) values(new.id,new.organization_id) on conflict do nothing returning id into inserted_id;
  if inserted_id is not null then
    insert into public.api_audit_log(organization_id,action,resource_type,resource_id,metadata)
      values(new.organization_id,'ai.response_counted','ai_response_usage',inserted_id,'{"units":1}'::jsonb);
  end if;
  return new;
end $$;
revoke all on function public.fn_registrar_resposta_ia() from public,anon,authenticated,service_role;

-- Preserva o job que ainda explica um envio com saldo reservado ou entrega incerta.
create or replace function public.fn_podar_fila_de_jobs(p_retencao_dias int default null,p_limite int default null) returns int
language plpgsql security definer set search_path='' as $$ declare removed integer; begin
  with candidates as (
    select j.id from public.job_queue j where j.status in('done','failed','dead')
      and j.created_at<now()-make_interval(days=>greatest(coalesce(p_retencao_dias,90),7))
      and not exists(select 1 from public.agent_inbox_items i where i.ref_kind='job_queue' and i.ref_id=j.id and i.status='open')
      and not exists(select 1 from public.ai_response_reservations r where r.organization_id=j.organization_id and r.reference='job:'||j.id and r.state in('reserved','uncertain'))
    order by j.created_at limit least(greatest(coalesce(p_limite,1000),1),10000)
  ) delete from public.job_queue j using candidates c where j.id=c.id;
  get diagnostics removed=row_count; return removed;
end $$;
revoke execute on function public.fn_podar_fila_de_jobs(int,int) from public,anon,authenticated;
grant execute on function public.fn_podar_fila_de_jobs(int,int) to service_role;

-- Sinais operacionais seguem a retenção da fila; prova de concessão segue a auditoria L-10.
create or replace function public.fn_ai_trial_retention(p_audit_days int,p_signal_days int,p_limit int default 1000) returns int
language plpgsql set search_path='' as $$ declare removed integer; changed integer; begin
  with candidates as (select id from public.ai_trial_claims where created_at<now()-make_interval(days=>greatest(p_audit_days,90)) order by created_at limit least(greatest(p_limit,1),10000))
    delete from public.ai_trial_claims t using candidates c where t.id=c.id;
  get diagnostics removed=row_count;
  with candidates as (select id from public.ai_trial_claims where (device_hash is not null or ip_hash is not null) and created_at<now()-make_interval(days=>greatest(p_signal_days,7)) order by created_at limit least(greatest(p_limit,1),10000))
    update public.ai_trial_claims t set device_hash=null,ip_hash=null from candidates c where t.id=c.id;
  get diagnostics changed=row_count; return removed+changed;
end $$;
revoke execute on function public.fn_ai_trial_retention(int,int,int) from public,anon,authenticated;
grant execute on function public.fn_ai_trial_retention(int,int,int) to service_role;

create or replace function public.fn_admin_ai_usage(p_start timestamptz,p_end timestamptz,p_offset int default 0,p_limit int default 50) returns jsonb
language sql stable set search_path='' as $$
  with groups as (
    select l.organization_id,o.display_name,l.purpose,l.provider,l.model,count(*) calls,
      count(*) filter(where l.status='erro') failures,count(*) filter(where l.cost_cents is null) unknown_cost_calls,
      sum(l.cost_cents) known_cost_usd_cents,sum(l.input_tokens) input_tokens,sum(l.output_tokens) output_tokens
    from public.llm_calls l join public.organizations o on o.id=l.organization_id where l.created_at>=p_start and l.created_at<p_end
    group by l.organization_id,o.display_name,l.purpose,l.provider,l.model
  ), page as (select * from groups order by calls desc,organization_id,purpose,provider,model offset greatest(p_offset,0) limit least(greatest(p_limit,1),200))
  select jsonb_build_object('total',(select count(*) from groups),'rows',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb))
$$;
revoke execute on function public.fn_admin_ai_usage(timestamptz,timestamptz,int,int) from public,anon,authenticated;
grant execute on function public.fn_admin_ai_usage(timestamptz,timestamptz,int,int) to service_role;

-- Somente o saldo comercial, sujeito à policy de leitura própria, entra no Realtime.
create or replace function public.fn_admin_ai_reconcile(p_org uuid,p_actor uuid,p_response uuid,p_reason text) returns text
language plpgsql set search_path='' as $$ declare result text; begin
  if length(trim(p_reason))<10 or not exists(select 1 from public.platform_admins where user_id=p_actor and scope='full' and revoked_at is null) then raise exception 'platform_admin_required'; end if;
  perform 1 from public.organization_ai_accounts where organization_id=p_org for update;
  if not exists(select 1 from public.ai_response_reservations r join public.job_queue j on r.reference='job:'||j.id and j.organization_id=r.organization_id where r.organization_id=p_org and r.id=p_response and j.status in('done','dead','failed')) then raise exception 'terminal_job_required'; end if;
  update public.ai_response_reservations set sealed_at=coalesce(sealed_at,now()) where organization_id=p_org and id=p_response;
  result:=public.fn_ai_settle(p_org,p_response,true);
  insert into public.api_audit_log(organization_id,actor_user_id,action,resource_type,resource_id,metadata) values(p_org,p_actor,'platform_admin.ai_account_changed','ai_response_reservation',p_response,jsonb_build_object('operation','reconcile_response','reason',p_reason,'result',result));
  return result;
end $$;
revoke execute on function public.fn_admin_ai_reconcile(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.fn_admin_ai_reconcile(uuid,uuid,uuid,text) to service_role;

do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='organization_ai_accounts') then
    alter publication supabase_realtime add table public.organization_ai_accounts;
  end if;
end $$;
notify pgrst,'reload schema';

-- Suporte do cliente é leitura na REST. Efeitos passam pelas rotas auditadas.
drop policy if exists tenant_isolation_platform_support_threads_all on public.platform_support_threads;
drop policy if exists tenant_isolation_platform_support_threads_select on public.platform_support_threads;
create policy tenant_isolation_platform_support_threads_select on public.platform_support_threads
  for select to authenticated using(organization_id in(select public.fn_user_org_ids()) and created_by=auth.uid());
drop policy if exists tenant_isolation_platform_support_messages_all on public.platform_support_messages;
drop policy if exists tenant_isolation_platform_support_messages_select on public.platform_support_messages;
create policy tenant_isolation_platform_support_messages_select on public.platform_support_messages
  for select to authenticated using(organization_id in(select public.fn_user_org_ids()) and exists(
    select 1 from public.platform_support_threads t where t.id=thread_id
      and t.organization_id=platform_support_messages.organization_id and t.created_by=auth.uid()));

-- A REST direta e RPCs privilegiadas também respeitam o período. A guarda
-- observa o ROLE original, inclusive dentro de SECURITY DEFINER. Backend,
-- retenção e reconciliação conservam as exceções já delimitadas no corpo.
do $$ declare t text; begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and c.relrowsecurity
      and (c.relname='organizations' or exists(select 1 from pg_attribute a where a.attrelid=c.oid and a.attname='organization_id' and not a.attisdropped))
      and c.relname not like 'billing_%' and c.relname not like 'platform_support_%'
  loop
    execute format('drop trigger if exists trg_commercial_write_guard on public.%I',t);
    execute format('create trigger trg_commercial_write_guard before insert or update or delete on public.%I for each row execute function public.fn_ai_operational_write_guard()',t);
  end loop;
end $$;
notify pgrst,'reload schema';
