-- Configuração única da plataforma. Mudança de conexão não migra contratos ou saldos.
alter table public.platform_ai_settings add column if not exists apply_to_all boolean not null default false;
create table if not exists public.platform_ai_credentials (
  provider text primary key check(provider in ('openai','anthropic','openrouter')),
  ciphertext bytea not null, iv bytea not null check(octet_length(iv)=12),
  tag bytea not null check(octet_length(tag)=16), last4 text not null,
  updated_at timestamptz not null default now()
);
alter table public.platform_ai_credentials enable row level security;
revoke all on public.platform_ai_credentials from public,anon,authenticated;
grant all on public.platform_ai_credentials to service_role;

-- Tarifas Standard oficiais conferidas em 09/10/2026. Contexto longo tem outra tarifa.
alter table public.ai_models add column if not exists long_context_pricing jsonb;
insert into public.ai_models(provider,model_id,display_name,supports_tools,supports_vision,
  context_window,input_price_per_million_cents,output_price_per_million_cents,
  cache_read_price_per_million_cents,cache_write_price_per_million_cents,pricing_source,pricing_verified_at,long_context_pricing)
values
 ('openai','gpt-6-astra','GPT-6 Astra',true,true,1050000,1000,5000,100,1250,'https://developers.openai.com/api/docs/models/gpt-6-astra','2026-10-09T00:00:00Z','{"threshold":272000,"input_multiplier":2,"output_multiplier":1.5}'),
 ('openai','gpt-6.1-sol','GPT-6.1 Sol',true,true,1050000,200,1000,10,250,'https://developers.openai.com/api/docs/models/gpt-6.1-sol','2026-10-09T00:00:00Z','{"threshold":272000,"input_multiplier":2,"output_multiplier":1.5}'),
 ('openai','gpt-6-luna','GPT-6 Luna',true,true,1050000,10,50,1,12.5,'https://developers.openai.com/api/docs/models/gpt-6-luna','2026-10-09T00:00:00Z','{"threshold":272000,"input_multiplier":2,"output_multiplier":1.5}')
on conflict(provider,model_id) do nothing;

-- Logs continuam registrados; a leitura técnica pertence à plataforma.
do $$ declare tbl text; begin
  foreach tbl in array array['api_audit_log','llm_calls','ai_agent_runs','ai_agent_run_steps'] loop
    if to_regclass('public.'||tbl) is not null then
      execute format('drop policy if exists platform_logs_only on public.%I',tbl);
      execute format('create policy platform_logs_only on public.%I as restrictive for select to authenticated using (public.fn_is_platform_admin())',tbl);
    end if;
  end loop;
end $$;

-- Acesso direto também não pode escolher outro modelo/chave no agente.
-- O preparo pode anteceder o QR code. Versões publicadas continuam tendo canal.
alter table public.ai_agent_versions alter column channel_session_id drop not null;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.ai_agent_versions'::regclass and conname='ai_agent_versions_channel_required_when_published') then
    alter table public.ai_agent_versions add constraint ai_agent_versions_channel_required_when_published
      check(status='draft' or channel_session_id is not null);
  end if;
end $$;
create or replace function public.fn_guard_agent_credential() returns trigger
language plpgsql security definer set search_path='' as $$
declare previous public.ai_agent_versions; connection_provider text; connection_model text; connection_credential uuid; begin
  if current_setting('role',true) not in ('anon','authenticated') then return new; end if;
  select s.provider,s.model into connection_provider,connection_model from public.platform_ai_settings s
    join public.organization_ai_accounts a on a.organization_id=new.organization_id
    where s.id and s.enabled and (s.apply_to_all or a.mode='platform');
  if connection_provider is null then
    if tg_op='UPDATE' then previous:=old;
    else select * into previous from public.ai_agent_versions where organization_id=new.organization_id and agent_id=new.agent_id order by version_number desc limit 1; end if;
    connection_provider:=previous.provider; connection_model:=previous.model; connection_credential:=previous.credential_id;
  end if;
  if new.credential_id is distinct from connection_credential then
    raise exception 'ai_credentials_platform_only' using errcode='42501';
  end if;
  if new.provider is distinct from connection_provider or new.model is distinct from connection_model
    or new.operator_model is not null then
    raise exception 'ai_connection_platform_only' using errcode='42501';
  end if;
  return new;
end $$;
revoke execute on function public.fn_guard_agent_credential() from public,anon,authenticated,service_role;
drop trigger if exists trg_guard_agent_credential on public.ai_agent_versions;
create trigger trg_guard_agent_credential before insert or update of provider,model,credential_id,operator_model on public.ai_agent_versions
 for each row execute function public.fn_guard_agent_credential();

-- O fluxo é provisionado em rascunho: nenhuma mensagem sai antes da publicação.
-- IDs de modelos de mensagem são da própria organização. Não copia a etapa da clínica.
create or replace function public.fn_seed_lead_recovery(p_org uuid) returns void
language plpgsql security definer set search_path='' as $$
declare templates uuid[]:=array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid()]; nodes jsonb; edges jsonb; i integer; waits bigint[]:=array[3600000::bigint,86400000::bigint,172800000::bigint]; begin
  perform 1 from public.organizations where id=p_org for update;
  if not found then raise exception 'organization_not_found'; end if;
  if exists(select 1 from public.followup_flow_pointers where organization_id=p_org and lower(name)='recuperação de leads') then return; end if;
  insert into public.message_templates(id,organization_id,title,body) values
    (templates[1],p_org,'Recuperação de leads · 1','Oi! Passando para saber se você conseguiu ver minha mensagem 😊 Se quiser, posso tirar suas dúvidas e ajudar com o próximo passo. O que você gostaria de saber?'),
    (templates[2],p_org,'Recuperação de leads · 2','Oi! Só retomando nosso contato. Se ainda tiver interesse, posso explicar as opções e verificar como podemos ajudar. Gostaria de continuar a conversa?'),
    (templates[3],p_org,'Recuperação de leads · 3','Olá! Esta é minha última mensagem de acompanhamento por enquanto, para não incomodar. Quando quiser retomar a conversa, é só escrever por aqui. Ficaremos à disposição.');
  nodes:=jsonb_build_array(
    jsonb_build_object('id','trigger-1','type','trigger','label','Início do fluxo','position',jsonb_build_object('x',300,'y',0),'config','{}'::jsonb),
    jsonb_build_object('id','end-reply','type','end','label','Lead respondeu','position',jsonb_build_object('x',650,'y',500),'config',jsonb_build_object('outcome','custom','note','O lead respondeu; continuar o atendimento.')),
    jsonb_build_object('id','end-done','type','end','label','Acompanhamento concluído','position',jsonb_build_object('x',300,'y',1120),'config',jsonb_build_object('outcome','exhausted')));
  edges:='[]'::jsonb;
  for i in 1..3 loop
    nodes:=nodes||jsonb_build_array(
      jsonb_build_object('id','classify-'||i,'type','ai_classify','label','Aguardar resposta · '||case i when 1 then '1 hora' when 2 then '24 horas' else '48 horas' end,'position',jsonb_build_object('x',300,'y',i*300-180),'config',jsonb_build_object('target','last_reply','classes',jsonb_build_array('Respondeu'),'grace_timeout_ms',waits[i])),
      jsonb_build_object('id','action-'||i,'type','action','label','Mensagem '||i,'position',jsonb_build_object('x',300,'y',i*300-40),'config',jsonb_build_object('mode','template','template_id',templates[i])));
    edges:=edges||jsonb_build_array(
      jsonb_build_object('id','enter-'||i,'source',case when i=1 then 'trigger-1' else 'action-'||(i-1) end,'target','classify-'||i,'priority',0,'condition',jsonb_build_object('type','always')),
      jsonb_build_object('id','silent-'||i,'source','classify-'||i,'target','action-'||i,'priority',0,'condition',jsonb_build_object('type','class_match','value','no_reply')),
      jsonb_build_object('id','reply-'||i,'source','classify-'||i,'target','end-reply','priority',0,'condition',jsonb_build_object('type','class_match','value','Respondeu')),
      jsonb_build_object('id','fallback-'||i,'source','classify-'||i,'target','end-reply','priority',-1,'condition',jsonb_build_object('type','always')));
  end loop;
  edges:=edges||jsonb_build_array(jsonb_build_object('id','finish','source','action-3','target','end-done','priority',0,'condition',jsonb_build_object('type','always')));
  insert into public.followup_flow_pointers(organization_id,name,status,draft_graph,handoff_policy,trigger_config,surface)
    values(p_org,'Recuperação de leads','draft',jsonb_build_object('nodes',nodes,'edges',edges),'pause','{"kind":"manual","cancel_on_reply":true}','followup');
end $$;
revoke execute on function public.fn_seed_lead_recovery(uuid) from public,anon,authenticated;
grant execute on function public.fn_seed_lead_recovery(uuid) to service_role;
create or replace function public.fn_seed_lead_recovery_trigger() returns trigger
language plpgsql security definer set search_path='' as $$ begin perform public.fn_seed_lead_recovery(new.id); return new; end $$;
revoke execute on function public.fn_seed_lead_recovery_trigger() from public,anon,authenticated,service_role;
drop trigger if exists trg_seed_lead_recovery on public.organizations;
create trigger trg_seed_lead_recovery after insert on public.organizations for each row execute function public.fn_seed_lead_recovery_trigger();
do $$ declare org uuid; begin for org in select id from public.organizations loop perform public.fn_seed_lead_recovery(org); end loop; end $$;

-- Concessão comercial manual: período explícito, motivo e idempotência; não simula pagamento.
create or replace function public.fn_admin_set_commercial_plan(p_org uuid,p_actor uuid,p_plan uuid,p_until timestamptz,p_reason text,p_reference uuid) returns void
language plpgsql set search_path='' as $$
declare a public.organization_ai_accounts; plan public.commercial_plans; allowance integer; used integer; remaining integer; begin
  if p_reason is null or length(trim(p_reason))<10 or p_until<=now() or p_until is null or p_reference is null then raise exception 'invalid_manual_access'; end if;
  if not exists(select 1 from public.platform_admins where user_id=p_actor and scope='full' and revoked_at is null) then raise exception 'platform_admin_required'; end if;
  perform public.fn_ai_renew(p_org);
  select * into a from public.organization_ai_accounts where organization_id=p_org for update;
  if not found then raise exception 'organization_not_found'; end if;
  if exists(select 1 from public.api_audit_log where organization_id=p_org and action='platform_admin.plan_changed' and metadata->>'reference'=p_reference::text) then return; end if;
  select * into plan from public.commercial_plans where id=p_plan and publication_state='published';
  if not found or plan.limits->>'users' is null or plan.limits->>'whatsapp_numbers' is null or plan.limits->>'ai_credits' is null then raise exception 'plan_limits_required'; end if;
  if exists(select 1 from public.ai_response_reservations where organization_id=p_org and state in('reserved','uncertain')) then raise exception 'ai_reservations_pending'; end if;
  allowance:=(plan.limits->>'ai_credits')::integer;
  used:=case when a.mode='platform' and a.state='active' then greatest(0,a.monthly_allowance-a.monthly_remaining)*case when a.credit_meter='response_v2' then 10 else 1 end else 0 end;
  remaining:=greatest(0,allowance-used);
  insert into public.ai_paid_access(organization_id,transaction_code,paid_at,access_until)
    values(p_org,'manual:'||p_reference,now(),p_until);
  update public.organization_ai_accounts set mode='platform',state='active',credit_meter='credit_v3',plan_id=p_plan,
    user_limit=(plan.limits->>'users')::integer,channel_limit=(plan.limits->>'whatsapp_numbers')::integer,
    monthly_allowance=allowance,monthly_remaining=remaining,access_until=p_until,
    extra_remaining=a.extra_remaining*case when a.credit_meter='response_v2' then 10 else 1 end,
    extra_debt=a.extra_debt*case when a.credit_meter='response_v2' then 10 else 1 end,
    anchor_at=case when a.state='active' then coalesce(a.anchor_at,now()) else now() end,
    period_start=case when a.state='active' then coalesce(a.period_start,now()) else now() end,
    period_end=case when a.state='active' then coalesce(a.period_end,public.fn_ai_anniversary(now(),1)) else public.fn_ai_anniversary(now(),1) end,updated_at=now() where organization_id=p_org;
  insert into public.ai_credit_ledger(organization_id,reference,kind,units,reason,actor_user_id,credit_meter)
    values(p_org,'manual-plan:'||p_reference,'adjustment',remaining-a.monthly_remaining*case when a.credit_meter='response_v2' then 10 else 1 end,p_reason,p_actor,'credit_v3');
  insert into public.api_audit_log(organization_id,actor_user_id,action,resource_type,resource_id,metadata)
    values(p_org,p_actor,'platform_admin.plan_changed','organization',p_org,jsonb_build_object('old_plan_id',a.plan_id,'plan_id',p_plan,'access_until',p_until,'reason',p_reason,'reference',p_reference));
end $$;
revoke execute on function public.fn_admin_set_commercial_plan(uuid,uuid,uuid,timestamptz,text,uuid) from public,anon,authenticated;
grant execute on function public.fn_admin_set_commercial_plan(uuid,uuid,uuid,timestamptz,text,uuid) to service_role;
notify pgrst,'reload schema';

-- Gestão de acessos atômica: bloqueia mudanças concorrentes na mesma empresa.
create or replace function public.fn_admin_manage_user_access(p_actor uuid,p_user uuid,p_org uuid,p_role text,p_revoke boolean) returns void
language plpgsql set search_path='' as $$ declare org uuid; begin
  if not exists(select 1 from public.platform_admins where user_id=p_actor and scope='full' and revoked_at is null) then raise exception 'platform_admin_required'; end if;
  if p_actor=p_user or exists(select 1 from public.platform_admins where user_id=p_user and revoked_at is null) then raise exception 'protected_user'; end if;
  if p_revoke is null or (not p_revoke and (p_org is null or p_role is null or p_role not in('admin','manager','agent','viewer'))) then raise exception 'invalid_role'; end if;
  if not exists(select 1 from auth.users where id=p_user) then raise exception 'user_not_found'; end if;
  for org in select organization_id from public.user_organizations where user_id=p_user and revoked_at is null and (p_org is null or organization_id=p_org) order by organization_id loop
    perform 1 from public.organizations where id=org for update;
    if (p_revoke or p_role<>'admin') and exists(select 1 from public.user_organizations where user_id=p_user and organization_id=org and role='admin' and revoked_at is null and accepted_at is not null)
      and not exists(select 1 from public.user_organizations where organization_id=org and user_id<>p_user and role='admin' and revoked_at is null and accepted_at is not null) then raise exception 'last_admin'; end if;
    update public.user_organizations set role=case when p_revoke then role else p_role end,revoked_at=case when p_revoke then now() else revoked_at end
      where user_id=p_user and organization_id=org and revoked_at is null;
    insert into public.api_audit_log(organization_id,actor_user_id,action,resource_type,resource_id,metadata)
      values(org,p_actor,case when p_revoke then 'platform_admin.user_deleted' else 'platform_admin.user_updated' end,'user',p_user,jsonb_build_object('access_revoked',p_revoke,'role',p_role));
  end loop;
  if p_org is not null and not found then raise exception 'membership_not_found'; end if;
end $$;
revoke execute on function public.fn_admin_manage_user_access(uuid,uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.fn_admin_manage_user_access(uuid,uuid,uuid,text,boolean) to service_role;
notify pgrst,'reload schema';
