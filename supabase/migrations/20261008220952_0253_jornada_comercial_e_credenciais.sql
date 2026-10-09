-- Somente novos vínculos recebem o menu simples; nenhuma personalização é sobrescrita.
alter table public.user_organizations alter column interface_settings set default '{"preset":"simplificada"}'::jsonb;

-- Chaves e bindings são operados pelas rotas de plataforma, com MFA e service_role.
revoke insert, update, delete on public.ai_provider_credentials from public, anon, authenticated;
revoke insert, update, delete on public.ai_purpose_bindings from public, anon, authenticated;
drop policy if exists tenant_isolation_ai_provider_credentials_write on public.ai_provider_credentials;
create policy tenant_isolation_ai_provider_credentials_write on public.ai_provider_credentials
  for select using (organization_id in (select public.fn_user_org_ids()) and public.fn_role_at_least(organization_id,'admin'));

-- Acesso direto ao banco também não pode mudar a chave por meio de uma versão.
create or replace function public.fn_guard_agent_credential() returns trigger
language plpgsql security definer set search_path='' as $$
declare previous_credential uuid;
begin
  if current_setting('role',true) not in ('anon','authenticated') then return new; end if;
  if tg_op='UPDATE' then previous_credential:=old.credential_id;
  else
    select credential_id into previous_credential from public.ai_agent_versions
      where organization_id=new.organization_id and agent_id=new.agent_id
      order by version_number desc limit 1;
  end if;
  if new.credential_id is distinct from previous_credential then
    raise exception 'ai_credentials_platform_only' using errcode='42501';
  end if;
  return new;
end $$;
revoke all on function public.fn_guard_agent_credential() from public,anon,authenticated,service_role;
drop trigger if exists trg_guard_agent_credential on public.ai_agent_versions;
create trigger trg_guard_agent_credential before insert or update of credential_id on public.ai_agent_versions
  for each row execute function public.fn_guard_agent_credential();

-- Caixa de saída durável: destinatário é resolvido na execução, sem duplicar e-mails pessoais.
create table if not exists public.commercial_notices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null,
  kind text not null check(kind in ('trial_ending','subscription_ending','payment_failed')),
  deadline timestamptz,
  title text not null,
  body text not null,
  inbox_id uuid references public.agent_inbox_items(id) on delete set null,
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  cancelled_at timestamptz,
  first_attempt_at timestamptz,
  provider_id text,
  attempts integer not null default 0,
  last_attempt_at timestamptz,
  lease_until timestamptz,
  error_code text,
  unique(organization_id,user_id,event_key)
);
create index if not exists idx_commercial_notices_pending on public.commercial_notices(created_at) where delivered_at is null;
alter table public.commercial_notices enable row level security;
drop policy if exists commercial_notices_read on public.commercial_notices;
create policy commercial_notices_read on public.commercial_notices for select to authenticated
  using ((organization_id in(select public.fn_user_org_ids()) and public.fn_role_at_least(organization_id,'admin')) or public.fn_is_platform_admin());
revoke all on public.commercial_notices from public,anon,authenticated;
grant select on public.commercial_notices to authenticated;
grant all on public.commercial_notices to service_role;

-- Usa o vocabulário de avisos existentes; o assunto e a ação são o faturamento.
alter table public.agent_inbox_items drop constraint if exists agent_inbox_items_kind_check;
alter table public.agent_inbox_items add constraint agent_inbox_items_kind_check check(kind in
 ('appointment_outcome_required','appointment_recovery_review','qr_rescan','routing_unassigned','job_dead','event_dead','budget_exceeded','handoff','promotion_review','judge_unaligned','followup_dead','snooze_expired','next_action_ambiguous','risk_backlog_seeded','reactivation_expired','capabilities_missing','message_send_stuck','midia_nao_lida','channel_template_review','channel_number_alert','promise_unfulfilled','contact_proposal_expired','budget_warning','conhecimento_nao_indexado','voice_call_missed','commercial_ai_paused','commercial_reminder','other'));

-- Enquanto extras não estão à venda, a mensagem não promete um checkout utilizável.
create or replace function public.fn_ai_commercial_notice(p_org uuid,p_code text) returns void
language plpgsql set search_path='' as $$ declare a public.organization_ai_accounts; msg text; begin
  select * into a from public.organization_ai_accounts where organization_id=p_org for update;
  if not found then return; end if;
  msg:=case when a.state='active' and a.access_until>now() and a.monthly_remaining+a.extra_remaining<10
    then 'Seus créditos acabaram. A franquia renova em '||to_char(a.period_end at time zone 'UTC','DD/MM/YYYY')||' (UTC). A compra de créditos extras está indisponível no momento. Seu time pode continuar atendendo manualmente.'
    when a.state='trial' then 'Seu teste terminou ou os créditos acabaram. Escolha um plano no faturamento para continuar.'
    else 'Seu atendimento com IA está pausado. Confira o período contratado e a situação no faturamento. Exportação, suporte e contratação continuam acessíveis.' end;
  update public.agent_inbox_items set body=msg where organization_id=p_org and kind='commercial_ai_paused' and status='open' and body is distinct from msg;
  insert into public.agent_inbox_items(organization_id,kind,severity,title,body)
    select p_org,'commercial_ai_paused','warn','Seu agente precisa de atenção',msg
    where not exists(select 1 from public.agent_inbox_items where organization_id=p_org and kind='commercial_ai_paused' and status='open');
end $$;
revoke all on function public.fn_ai_commercial_notice(uuid,text) from public,anon,authenticated;
grant execute on function public.fn_ai_commercial_notice(uuid,text) to service_role;

-- Uma proposta administrativa por solicitação, sem duplicar checkout em reenvios.
alter table public.billing_checkouts add column if not exists change_request_id uuid;
create unique index if not exists idx_billing_checkout_change_request on public.billing_checkouts(organization_id,change_request_id) where change_request_id is not null;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='billing_checkout_change_request_org_fkey' and conrelid='public.billing_checkouts'::regclass) then
  alter table public.billing_checkouts add constraint billing_checkout_change_request_org_fkey foreign key(organization_id,change_request_id) references public.platform_support_threads(organization_id,id);
 end if;
end $$;

notify pgrst,'reload schema';
