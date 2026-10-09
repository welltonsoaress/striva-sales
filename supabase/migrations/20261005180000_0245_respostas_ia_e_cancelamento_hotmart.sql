-- Contagem prospectiva de respostas aceitas pelo canal. Nenhuma franquia é
-- concedida, bloqueada ou cobrada pela aplicação desta migration.
alter table public.messages add column if not exists ai_credit_eligible boolean not null default false;
alter table public.billing_contracts add column if not exists cancelled_at timestamptz;
alter table public.billing_contracts add column if not exists access_until timestamptz;

create table if not exists public.ai_response_usage (
  -- Identidade do recibo = messages.id. Não é FK: o recibo sem conteúdo deve
  -- sobreviver à retenção/redação de mensagens, sem apagar consumo financeiro.
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  accepted_at timestamptz not null default now(),
  units smallint not null default 1 check (units = 1)
);
create index if not exists ai_response_usage_org_accepted_idx on public.ai_response_usage(organization_id, accepted_at desc, id);
alter table public.ai_response_usage enable row level security;
revoke all on public.ai_response_usage from public, anon, authenticated, service_role;
grant select on public.ai_response_usage to authenticated, service_role;
drop policy if exists tenant_isolation_ai_response_usage_select on public.ai_response_usage;
create policy tenant_isolation_ai_response_usage_select on public.ai_response_usage for select to authenticated using
  (organization_id in (select public.fn_user_org_ids()) and public.fn_role_at_least(organization_id, 'admin'));

create or replace function public.fn_proteger_origem_credito_ia() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Um cliente com acesso direto à REST de messages não pode declarar origem
  -- de IA. A origem é contexto interno do handler/worker, nunca metadata/body.
  if current_setting('role', true) in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then new.ai_credit_eligible := false;
    else new.ai_credit_eligible := old.ai_credit_eligible; end if;
  end if;
  return new;
end $$;
revoke all on function public.fn_proteger_origem_credito_ia() from public, anon, authenticated, service_role;
drop trigger if exists trg_messages_proteger_credito_ia on public.messages;
create trigger trg_messages_proteger_credito_ia before insert or update on public.messages
for each row execute function public.fn_proteger_origem_credito_ia();

create or replace function public.fn_registrar_resposta_ia() returns trigger
language plpgsql security definer set search_path = '' as $$
declare inserted_id uuid;
begin
  -- Mudança de status pelo browser não é recibo do provedor. O serviço de
  -- entrega/webhook pode reconhecer a aceitação mesmo após replay/crash.
  if current_setting('role', true) in ('authenticated', 'anon') then return new; end if;
  if not new.ai_credit_eligible or new.direction <> 'outbound' or new.status not in ('sent', 'delivered', 'read') then return new; end if;
  insert into public.ai_response_usage(id, organization_id) values(new.id, new.organization_id)
    on conflict (id) do nothing returning id into inserted_id;
  if inserted_id is not null then
    insert into public.api_audit_log(organization_id, action, resource_type, resource_id, metadata)
      values(new.organization_id, 'ai.response_counted', 'ai_response_usage', inserted_id, '{"units":1}'::jsonb);
  end if;
  return new;
end $$;
revoke all on function public.fn_registrar_resposta_ia() from public, anon, authenticated, service_role;
drop trigger if exists trg_messages_registrar_resposta_ia on public.messages;
create trigger trg_messages_registrar_resposta_ia after insert or update on public.messages
for each row execute function public.fn_registrar_resposta_ia();
-- Sem backfill: sent_at em mensagens antigas é a intenção, não a aceitação.
-- Ambas as funções são exclusivas de triggers; não possuem consumidor RPC.
notify pgrst, 'reload schema';
