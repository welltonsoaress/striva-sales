-- A revisão adversarial do consumo encontrou outra superfície: uma pessoa
-- membro de duas empresas não pode mover um envio de IA entre elas pela REST.
create or replace function public.fn_proteger_origem_credito_ia() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('role', true) in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.ai_credit_eligible := false;
    else
      if old.ai_credit_eligible and
        row(new.organization_id, new.conversation_id, new.contact_id, new.channel_session_id, new.direction)
        is distinct from row(old.organization_id, old.conversation_id, old.contact_id, old.channel_session_id, old.direction) then
        raise exception 'A origem de um envio de IA não pode ser alterada.' using errcode = '42501';
      end if;
      new.ai_credit_eligible := old.ai_credit_eligible;
    end if;
  end if;
  return new;
end $$;
revoke all on function public.fn_proteger_origem_credito_ia() from public, anon, authenticated, service_role;
notify pgrst, 'reload schema';
