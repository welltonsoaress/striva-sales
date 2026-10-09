-- 0252: revisão dos dois planos; fecha cobrança de automação e preserva instruções.
-- Timeout não comprova rejeição pelo canal: reserva permanece para reconciliação.
create or replace function public.fn_ai_settle(p_org uuid,p_id uuid,p_release boolean default false) returns text
language plpgsql set search_path='' as $$
declare r public.ai_response_reservations; a public.organization_ai_accounts; accepted integer; uncertain integer; begin
  select * into a from public.organization_ai_accounts where organization_id=p_org for update;
  select * into r from public.ai_response_reservations where organization_id=p_org and id=p_id for update;
  if not found then raise exception 'ai_reservation_not_found'; end if;
  if r.state in('committed','released') then return r.state; end if;
  select count(*) into accepted from public.ai_response_parts where organization_id=p_org and response_id=p_id and part<=r.expected_parts;
  select count(*) into uncertain from public.messages m where m.organization_id=p_org and m.ai_response_id=p_id and (m.status in('sending','queued') or (m.status='failed' and m.error_code in('send_timeout','delivery_unknown')))
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

-- A reserva da automação é interna e só autoriza a sua chamada, na mesma empresa.
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
        ((p_purpose='automation_ai_message' and r.id=p_job and r.reference like 'automation:%' and r.sealed_at is null) or r.reference='job:'||p_job or r.reference='job:'||(select j.payload->>'origin_job_id' from public.job_queue j where j.id=p_job and j.organization_id=p_org))
    ) then raise exception 'ai_credits_exhausted'; end if;
  end if;
  select requests_per_minute,monthly_cost_limit_cents into cap,budget from public.platform_ai_settings where id=true and enabled;
  if cap is null then raise exception 'ai_platform_unavailable'; end if;
  -- Limite operacional: origem histórica legada não consome o orçamento da plataforma.
  -- Origem não identificada permanece conservadoramente no teto; custo nulo não vira zero.
  if budget>0 and (select coalesce(sum(l.cost_cents),0) from public.llm_calls l join public.organization_ai_accounts o on o.organization_id=l.organization_id and o.mode='platform' where l.created_at>=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC' and l.pricing_snapshot->>'mode' is distinct from 'legacy')>=budget then
    raise exception 'ai_platform_budget_exhausted';
  end if;
  insert into public.ai_operational_buckets(organization_id,minute,hits) values(p_org,date_trunc('minute',now()),1)
    on conflict(organization_id,minute) do update set hits=public.ai_operational_buckets.hits+1 where public.ai_operational_buckets.hits<cap returning hits into used;
  if used is null then raise exception 'ai_frequency_limit'; end if;
  delete from public.ai_operational_buckets where organization_id=p_org and minute<now()-interval '1 day';
end $$;
revoke all on function public.fn_ai_check_access(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.fn_ai_check_access(uuid,text,uuid) to service_role;

create or replace function public.fn_admin_ai_reconcile(p_org uuid,p_actor uuid,p_response uuid,p_reason text) returns text
language plpgsql set search_path='' as $$ declare result text; r public.ai_response_reservations; begin
  if length(trim(p_reason))<10 or not exists(select 1 from public.platform_admins where user_id=p_actor and scope='full' and revoked_at is null) then raise exception 'platform_admin_required'; end if;
  perform 1 from public.organization_ai_accounts where organization_id=p_org for update;
  select * into r from public.ai_response_reservations where organization_id=p_org and id=p_response;
  if not found then raise exception 'ai_reservation_not_found'; end if;
  if r.reference like 'automation:%' then
    if not pg_try_advisory_xact_lock(hashtextextended(p_org::text||':'||r.reference,0)) then raise exception 'automation_still_running'; end if;
    if r.sealed_at is null and not exists(select 1 from public.event_log e where e.organization_id=p_org and e.id::text=split_part(r.reference,':',2) and e.status in('done','dead')) then raise exception 'terminal_event_required'; end if;
  elsif not exists(select 1 from public.job_queue j where j.organization_id=p_org and r.reference='job:'||j.id and j.status in('done','dead','failed')) then raise exception 'terminal_job_required';
  end if;
  update public.ai_response_reservations set sealed_at=coalesce(sealed_at,now()) where organization_id=p_org and id=p_response;
  result:=public.fn_ai_settle(p_org,p_response,true);
  insert into public.api_audit_log(organization_id,actor_user_id,action,resource_type,resource_id,metadata) values(p_org,p_actor,'platform_admin.ai_account_changed','ai_response_reservation',p_response,jsonb_build_object('operation','reconcile_response','reason',p_reason,'result',result));
  return result;
end $$;
revoke execute on function public.fn_admin_ai_reconcile(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.fn_admin_ai_reconcile(uuid,uuid,uuid,text) to service_role;

create or replace function public.fn_ai_agent_version_content_immutable() returns trigger
language plpgsql set search_path='' as $fn$
begin
  if old.status <> 'draft' and (
       new.system_prompt          is distinct from old.system_prompt
    or new.provider               is distinct from old.provider
    or new.model                  is distinct from old.model
    or new.credential_id          is distinct from old.credential_id
    or new.tool_ids               is distinct from old.tool_ids
    or new.trigger_config         is distinct from old.trigger_config
    or new.channel_session_id     is distinct from old.channel_session_id
    or new.max_steps              is distinct from old.max_steps
    or new.token_budget           is distinct from old.token_budget
    or new.cost_budget_cents      is distinct from old.cost_budget_cents
    or new.history_message_window is distinct from old.history_message_window
    or new.history_token_window   is distinct from old.history_token_window
    or new.handoff_keywords       is distinct from old.handoff_keywords
    or new.handoff_tool_enabled   is distinct from old.handoff_tool_enabled
    or new.followup               is distinct from old.followup
    or new.multimodal_input       is distinct from old.multimodal_input
    or new.video_frames_enabled   is distinct from old.video_frames_enabled
    or new.split_messages         is distinct from old.split_messages
    or new.split_max_chars        is distinct from old.split_max_chars
    or new.cases_enabled          is distinct from old.cases_enabled
    or new.operator_enabled       is distinct from old.operator_enabled
    or new.operator_prompt        is distinct from old.operator_prompt
    or new.operator_model         is distinct from old.operator_model
    or new.operator_tool_ids      is distinct from old.operator_tool_ids
    or new.pipeline_ids           is distinct from old.pipeline_ids
    or new.knowledge_source_ids   is distinct from old.knowledge_source_ids
    or new.version_number         is distinct from old.version_number
    or new.agent_id               is distinct from old.agent_id
    or new.organization_id        is distinct from old.organization_id
  ) then
    raise exception 'ai_agent_versions % é imutável (status=%): mudança de conteúdo = versão draft nova; rollback = revert (clona + publica)',
      old.id, old.status;
  end if;
  return new;
end;
$fn$;
revoke execute on function public.fn_ai_agent_version_content_immutable() from public,anon,authenticated,service_role;
-- Extrato registra apenas a concessão efetiva; auditoria nova identifica sua régua.
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
      insert into public.ai_credit_ledger(organization_id,reference,kind,units) values(payment.organization_id,'payment:'||payment.transaction_code,'subscription',case when a.state in('active','suspended') and a.anchor_at is not null then 0 else ((limits->>'ai_credits')::integer*multiplier) end);
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
    values(p_org,p_actor,'platform_admin.ai_account_changed','organization',p_org,jsonb_build_object('operation',p_action,'reason',p_reason,'units',p_units,'credit_meter',(select credit_meter from public.organization_ai_accounts where organization_id=p_org),'reference',p_reference));
end $$;
revoke all on function public.fn_admin_ai_account(uuid,uuid,text,text,integer,uuid) from public,anon,authenticated;
grant execute on function public.fn_admin_ai_account(uuid,uuid,text,text,integer,uuid) to service_role;
notify pgrst,'reload schema';
